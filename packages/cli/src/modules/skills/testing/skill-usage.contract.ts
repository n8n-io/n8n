// The cases that every `SkillUsage` passes: the fake in this folder and the real one of the
// agents module. A test that uses the fake can trust it as far as these cases go.
import { UserError } from '@n8n/errors';

import type { SkillUsage } from '../services/skill-usage.contracts';

/**
 * The agents, skills and agent refs a case starts from, by key. Each entry of `versions`
 * is the name of one saved version: `versions[0]` is v1.
 */
export type SkillUsageWorld = {
	agents: Array<{ key: string; name: string; project: string }>;
	skills: Array<{ key: string; versions: string[] }>;
	/** Skill refs of agent drafts. A ref with `version` is pinned to that version. */
	drafts?: Array<{ agent: string; skill: string; version?: number }>;
	/** Publishes, oldest first. The last publish of an agent is its active version. */
	publishes?: Array<{ agent: string; pins: Array<{ skill: string; version: number }> }>;
};

/** The ids that a seed gave to the keys of a world. */
export type SeededSkillUsageWorld = {
	projectId(key: string): string;
	agentId(key: string): string;
	skillId(key: string): string;
};

export type SkillUsageSubject = {
	usage: SkillUsage;
	seed(world: SkillUsageWorld): Promise<SeededSkillUsageWorld>;
};

const byAgentName = <T extends { agentName: string }>(rows: T[]) =>
	[...rows].sort((a, b) => a.agentName.localeCompare(b.agentName));

/**
 * Runs the contract cases. `subject` is called in each case, after the caller's
 * `beforeEach`, so the caller sets up and clears the store around each case.
 * `refreshAgents` is left out: it only has side effects outside the store.
 */
export function describeSkillUsageContract(subject: () => SkillUsageSubject) {
	const ctx = {};

	describe('SkillUsage contract', () => {
		describe('findAgents', () => {
			it('answers the name and project of each agent and leaves out unknown ids', async () => {
				const { usage, seed } = subject();
				const ids = await seed({
					agents: [
						{ key: 'support', name: 'Support', project: 'p' },
						{ key: 'sales', name: 'Sales', project: 'q' },
					],
					skills: [],
				});

				const agents = await usage.findAgents([ids.agentId('support'), 'agent-unknown'], ctx);

				expect([...agents]).toEqual([
					[ids.agentId('support'), { name: 'Support', projectId: ids.projectId('p') }],
				]);
			});
		});

		describe('findAgentIdsInProjects', () => {
			it('answers the agents of these projects only', async () => {
				const { usage, seed } = subject();
				const ids = await seed({
					agents: [
						{ key: 'a', name: 'A', project: 'p' },
						{ key: 'b', name: 'B', project: 'p' },
						{ key: 'c', name: 'C', project: 'q' },
					],
					skills: [],
				});

				const agentIds = await usage.findAgentIdsInProjects([ids.projectId('p')], ctx);

				expect(agentIds.sort()).toEqual([ids.agentId('a'), ids.agentId('b')].sort());
			});
		});

		describe('findUsingAgentIds and countUsingAgents', () => {
			const world: SkillUsageWorld = {
				agents: [
					{ key: 'drafted', name: 'Drafted', project: 'p' },
					{ key: 'pinned', name: 'Pinned', project: 'p' },
					{ key: 'both', name: 'Both', project: 'p' },
					{ key: 'other', name: 'Other', project: 'p' },
				],
				skills: [
					{ key: 'voice', versions: ['Voice', 'Voice'] },
					{ key: 'tone', versions: ['Tone'] },
					{ key: 'unused', versions: ['Unused'] },
				],
				drafts: [
					{ agent: 'drafted', skill: 'voice' },
					{ agent: 'both', skill: 'voice', version: 1 },
					{ agent: 'other', skill: 'tone' },
				],
				publishes: [
					// Only an older publish pins the skill: the agent still uses it.
					{ agent: 'pinned', pins: [{ skill: 'voice', version: 1 }] },
					{ agent: 'pinned', pins: [] },
					{ agent: 'both', pins: [{ skill: 'voice', version: 2 }] },
				],
			};

			it('answers each agent with a draft ref or a pin in any publish once', async () => {
				const { usage, seed } = subject();
				const ids = await seed(world);

				const agentIds = await usage.findUsingAgentIds(ids.skillId('voice'), ctx);

				expect(agentIds.sort()).toEqual(
					[ids.agentId('drafted'), ids.agentId('pinned'), ids.agentId('both')].sort(),
				);
			});

			it('counts the distinct agents of each skill and leaves out unused skills', async () => {
				const { usage, seed } = subject();
				const ids = await seed(world);

				const counts = await usage.countUsingAgents(
					[ids.skillId('voice'), ids.skillId('tone'), ids.skillId('unused')],
					ctx,
				);

				expect(Object.fromEntries(counts)).toEqual({
					[ids.skillId('voice')]: 3,
					[ids.skillId('tone')]: 1,
				});
			});
		});

		describe('findSkillIdsUsedByAgent', () => {
			it('answers each skill of a draft ref or a pin in any publish of the agent once', async () => {
				const { usage, seed } = subject();
				const ids = await seed({
					agents: [
						{ key: 'support', name: 'Support', project: 'p' },
						{ key: 'sales', name: 'Sales', project: 'p' },
					],
					skills: [
						{ key: 'voice', versions: ['Voice'] },
						{ key: 'tone', versions: ['Tone'] },
						{ key: 'pricing', versions: ['Pricing'] },
						{ key: 'other', versions: ['Other'] },
					],
					drafts: [
						{ agent: 'support', skill: 'voice' },
						{ agent: 'support', skill: 'tone', version: 1 },
						{ agent: 'sales', skill: 'other' },
					],
					publishes: [
						// Only an older publish pins the skill: the agent still uses it.
						{ agent: 'support', pins: [{ skill: 'pricing', version: 1 }] },
						{ agent: 'support', pins: [{ skill: 'voice', version: 1 }] },
					],
				});

				const skillIds = await usage.findSkillIdsUsedByAgent(ids.agentId('support'), ctx);

				expect(skillIds.sort()).toEqual(
					[ids.skillId('voice'), ids.skillId('tone'), ids.skillId('pricing')].sort(),
				);
			});
		});

		describe('findAgentSummaries', () => {
			const world: SkillUsageWorld = {
				agents: [
					{ key: 'support', name: 'Support bot', project: 'p' },
					{ key: 'sales', name: 'Sales BOT', project: 'p' },
					{ key: 'writer', name: 'Writer', project: 'p' },
					{ key: 'other', name: 'Other bot', project: 'q' },
				],
				skills: [],
			};
			const names = (agents: Array<{ name: string }>) => agents.map(({ name }) => name).sort();

			it('answers id and name of the agents in these projects whose name matches without case', async () => {
				const { usage, seed } = subject();
				const ids = await seed(world);

				const agents = await usage.findAgentSummaries([ids.projectId('p')], {
					search: 'bot',
					limit: 50,
				});

				expect([...agents].sort((a, b) => a.name.localeCompare(b.name))).toEqual([
					{ id: ids.agentId('sales'), name: 'Sales BOT' },
					{ id: ids.agentId('support'), name: 'Support bot' },
				]);
			});

			it('searches every project for null and cuts the answer to the limit', async () => {
				const { usage, seed } = subject();
				await seed(world);

				expect(names(await usage.findAgentSummaries(null, { limit: 50 }))).toEqual(
					names(world.agents),
				);
				expect(await usage.findAgentSummaries(null, { limit: 2 })).toHaveLength(2);
			});
		});

		describe('findUsage', () => {
			const world: SkillUsageWorld = {
				agents: [
					{ key: 'drafted', name: 'Drafted', project: 'p' },
					{ key: 'current', name: 'Current', project: 'p' },
					{ key: 'older', name: 'Older', project: 'p' },
					{ key: 'hidden', name: 'Hidden', project: 'q' },
				],
				skills: [{ key: 'voice', versions: ['Voice', 'Voice', 'Voice'] }],
				drafts: [
					{ agent: 'drafted', skill: 'voice' },
					{ agent: 'current', skill: 'voice' },
					{ agent: 'hidden', skill: 'voice' },
				],
				publishes: [
					{ agent: 'current', pins: [{ skill: 'voice', version: 1 }] },
					{ agent: 'current', pins: [{ skill: 'voice', version: 2 }] },
					{ agent: 'older', pins: [{ skill: 'voice', version: 3 }] },
					{ agent: 'older', pins: [] },
					{ agent: 'hidden', pins: [{ skill: 'voice', version: 3 }] },
				],
			};

			it('lists the draft refs and, per published agent, the version its active publish pins', async () => {
				const { usage, seed } = subject();
				const ids = await seed(world);
				const agent = (key: string, agentName: string, project = 'p') => ({
					agentId: ids.agentId(key),
					agentName,
					projectId: ids.projectId(project),
				});

				const usedBy = await usage.findUsage(ids.skillId('voice'), 'all', ctx);

				expect(byAgentName(usedBy.drafts)).toEqual([
					agent('current', 'Current'),
					agent('drafted', 'Drafted'),
					agent('hidden', 'Hidden', 'q'),
				]);
				expect(byAgentName(usedBy.pins)).toEqual([
					{ ...agent('current', 'Current'), version: 2 },
					{ ...agent('hidden', 'Hidden', 'q'), version: 3 },
					{ ...agent('older', 'Older'), version: null },
				]);
				expect(usedBy.hiddenAgents).toBe(0);
			});

			it('only counts an agent outside the projects, once for its draft ref and its pin', async () => {
				const { usage, seed } = subject();
				const ids = await seed(world);

				const usedBy = await usage.findUsage(ids.skillId('voice'), [ids.projectId('p')], ctx);

				expect(usedBy.drafts.map((row) => row.agentName).sort()).toEqual(['Current', 'Drafted']);
				expect(usedBy.pins.map((row) => row.agentName).sort()).toEqual(['Current', 'Older']);
				expect(usedBy.hiddenAgents).toBe(1);
			});
		});

		describe('assertRenameKeepsNamesApart', () => {
			const world: SkillUsageWorld = {
				agents: [
					{ key: 'support', name: 'Support', project: 'p' },
					{ key: 'pinned', name: 'Pinned', project: 'p' },
				],
				skills: [
					{ key: 'voice', versions: ['Voice'] },
					// The agents run v1 of this skill, so its name for them is "Tone".
					{ key: 'tone', versions: ['Tone', 'Style'] },
					{ key: 'facts', versions: ['Facts'] },
				],
				drafts: [
					{ agent: 'support', skill: 'voice' },
					{ agent: 'support', skill: 'tone', version: 1 },
					{ agent: 'pinned', skill: 'voice', version: 1 },
					{ agent: 'pinned', skill: 'facts' },
				],
			};

			it('refuses a name like the name of another skill that a following agent runs', async () => {
				const { usage, seed } = subject();
				const ids = await seed(world);

				const rename = usage.assertRenameKeepsNamesApart(
					ids.skillId('voice'),
					'Voice',
					'tone',
					ctx,
				);

				await expect(rename).rejects.toThrow(UserError);
				await expect(rename).rejects.toThrow(
					'Cannot rename to "tone": Support already uses a skill with a name like that.',
				);
			});

			it('names every clashing agent', async () => {
				const { usage, seed } = subject();
				const ids = await seed({
					agents: [
						{ key: 'support', name: 'Support', project: 'p' },
						{ key: 'sales', name: 'Sales', project: 'q' },
					],
					skills: [
						{ key: 'voice', versions: ['Voice'] },
						{ key: 'tone', versions: ['Tone'] },
					],
					drafts: ['support', 'sales'].flatMap((agent) => [
						{ agent, skill: 'voice' },
						{ agent, skill: 'tone' },
					]),
				});

				const rename = usage.assertRenameKeepsNamesApart(
					ids.skillId('voice'),
					'Voice',
					'Tone',
					ctx,
				);

				await expect(rename).rejects.toThrow(
					/^Cannot rename to "Tone": (Support, Sales|Sales, Support) already use a skill with a name like that\.$/,
				);
			});

			it.each([
				{ newName: 'Style', why: 'a later version of a pinned skill does not count' },
				{ newName: 'Facts', why: 'an agent pinned to the renamed skill does not follow it' },
				{ newName: 'VOICE', why: 'a rename that keeps the name key clashes with nothing new' },
				{ newName: 'Brand voice', why: 'no agent runs a skill with that name' },
			])('allows "$newName": $why', async ({ newName }) => {
				const { usage, seed } = subject();
				const ids = await seed(world);

				await expect(
					usage.assertRenameKeepsNamesApart(ids.skillId('voice'), 'Voice', newName, ctx),
				).resolves.toBeUndefined();
			});
		});

		describe('markFollowersChanged', () => {
			it('answers the agents whose draft follows the latest version of the skill', async () => {
				const { usage, seed } = subject();
				const ids = await seed({
					agents: [
						{ key: 'following', name: 'Following', project: 'p' },
						{ key: 'pinned', name: 'Pinned', project: 'p' },
						{ key: 'published', name: 'Published', project: 'p' },
					],
					skills: [{ key: 'voice', versions: ['Voice'] }],
					drafts: [
						{ agent: 'following', skill: 'voice' },
						{ agent: 'pinned', skill: 'voice', version: 1 },
					],
					publishes: [{ agent: 'published', pins: [{ skill: 'voice', version: 1 }] }],
				});

				expect(await usage.markFollowersChanged(ids.skillId('voice'), ctx)).toEqual([
					ids.agentId('following'),
				]);
			});
		});
	});
}
