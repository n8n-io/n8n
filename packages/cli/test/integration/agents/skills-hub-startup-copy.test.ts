import type { AgentSkill } from '@n8n/api-types';
import { createTeamProject, mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { TransactionRunner, type Project } from '@n8n/db';
import { DataSource } from '@n8n/typeorm';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { randomUUID } from 'node:crypto';

import { setSkillsHubFlag } from '@/modules/agents/__tests__/test-utils/skills-hub-flag';
import { AgentRuntimeCacheService } from '@/modules/agents/agent-runtime-cache.service';
import { AgentSkillRefsService } from '@/modules/agents/agent-skill-refs.service';
import { AgentUpdateBroadcaster } from '@/modules/agents/agent-update-broadcaster';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentSkillDependency } from '@/modules/agents/entities/agent-skill-dependency.entity';
import { AgentVersionSkillDependency } from '@/modules/agents/entities/agent-version-skill-dependency.entity';
import { SkillFile } from '@/modules/agents/entities/skill-file.entity';
import { SkillVersion } from '@/modules/agents/entities/skill-version.entity';
import { Skill } from '@/modules/agents/entities/skill.entity';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { SkillRepository } from '@/modules/agents/repositories/skill.repository';
import { SkillsHubRollout } from '@/modules/agents/skills/skills-hub-rollout';
import { SkillsHubStartupCopy } from '@/modules/agents/skills/skills-hub-startup-copy';
import { Telemetry } from '@/telemetry';

function body(name: string, instructions = `${name} instructions.`): AgentSkill {
	return { name, description: `${name} description`, instructions };
}

type InlineRef = { type: 'skill'; id: string; enabled?: boolean };

describe('SkillsHubStartupCopy', () => {
	let project: Project;
	let agents: AgentRepository;
	let histories: AgentHistoryRepository;
	let skills: SkillRepository;
	let skillRefs: AgentSkillRefsService;
	let copy: SkillsHubStartupCopy;

	beforeAll(async () => {
		mockInstance(Telemetry);
		mockInstance(AgentRuntimeCacheService);
		mockInstance(AgentUpdateBroadcaster);
		await testModules.loadModules(['agents']);
		await testDb.init();
		agents = Container.get(AgentRepository);
		histories = Container.get(AgentHistoryRepository);
		skills = Container.get(SkillRepository);
		skillRefs = Container.get(AgentSkillRefsService);
		copy = Container.get(SkillsHubStartupCopy);
		// Every main copies. Only the leader logs the flag-off warning.
		Container.get(InstanceSettings).markAsLeader();
	});

	beforeEach(async () => {
		project = await createTeamProject();
		setSkillsHubFlag(true);
	});

	afterEach(async () => {
		await agents.delete({});
		await skills.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** An agent as the legacy path stores it: refs in `schema.skills`, bodies in `skills`. */
	async function legacyAgent(refs: unknown[] | null, bodies: Record<string, unknown> | null) {
		return await agents.save(
			agents.create({
				id: randomUUID(),
				name: 'Agent',
				projectId: project.id,
				schema: (refs === null
					? null
					: { name: 'Agent', model: '', instructions: 'Help.', skills: refs }) as never,
				skills: bodies as never,
				integrations: [],
				tools: {},
				versionId: randomUUID(),
			}),
		);
	}

	let publishedAt = new Date('2026-01-01T00:00:00.000Z');

	/** A published version as the legacy path stores it. */
	async function legacyVersion(agent: Agent, refs: unknown[], bodies: Record<string, unknown>) {
		const versionId = randomUUID();
		// Each publish gets its own time, as real publishes do, so the order is stable.
		publishedAt = new Date(publishedAt.getTime() + 1000);
		await histories.save(
			histories.create({
				versionId,
				agentId: agent.id,
				author: 'Test',
				createdAt: publishedAt,
				schema: { name: 'Agent', model: '', instructions: 'Help.', skills: refs } as never,
				skills: bodies as never,
			}),
		);
		await agents.update({ id: agent.id }, { activeVersionId: versionId });
		return versionId;
	}

	const instructionsOf = (record: Record<string, AgentSkill>) =>
		Object.fromEntries(Object.entries(record).map(([id, skill]) => [id, skill.instructions]));

	/** The text of each version of one skill of the agent, oldest first. */
	async function versionTexts(agentId: string, skillId: string) {
		const rows = (await skills.findAgentSkillVersions(agentId))
			.filter((row) => row.skillId === skillId)
			.sort((a, b) => a.version - b.version);
		const full = await skills.findVersionsByIds(rows.map((row) => row.id));
		return rows.map((row) => full.get(row.id)?.version.instructions);
	}

	/** What one published version runs, keyed by skill id. */
	async function pinnedTexts(versionId: string) {
		const pinned = await skills.findPinned(versionId);
		return Object.fromEntries([...pinned].map(([id, row]) => [id, row.version.instructions]));
	}

	it('copies the draft and the published versions as agent skills, and keeps the legacy columns', async () => {
		const refs: InlineRef[] = [
			{ type: 'skill', id: 'tone' },
			{ type: 'skill', id: 'pricing' },
		];
		const agent = await legacyAgent(refs, {
			tone: body('Tone', 'Draft tone.'),
			pricing: body('Pricing'),
		});
		const versionId = await legacyVersion(agent, refs, {
			tone: body('Tone', 'Published tone.'),
			pricing: body('Pricing'),
		});

		const counts = await copy.copyAll();

		expect(counts).toMatchObject({ agents: 1, skills: 2, failed: 0 });
		// The draft follows the newest version, which holds its text.
		const draft = await skillRefs.readDraft(agent, {});
		expect(draft.skillRefs).toEqual(refs.map(({ id }) => ({ type: 'skill', id })));
		expect(instructionsOf(draft.skills)).toEqual({
			tone: 'Draft tone.',
			pricing: 'Pricing instructions.',
		});
		// The published version pins the text it ran.
		const version = await histories.findOneByOrFail({ versionId });
		expect(instructionsOf((await skillRefs.readVersion(version, {})).skills)).toEqual({
			tone: 'Published tone.',
			pricing: 'Pricing instructions.',
		});
		// Each copy is a skill of this agent only.
		expect(await skills.findByIds(['tone', 'pricing'])).toEqual([
			expect.objectContaining({ projectId: null, agentId: agent.id, source: 'agent' }),
			expect.objectContaining({ projectId: null, agentId: agent.id, source: 'agent' }),
		]);
		const row = await agents.findOneByOrFail({ id: agent.id });
		expect(row.schema?.skills).toEqual(refs);
		expect(row.skills).toEqual(agent.skills);
	});

	it('writes nothing on a second run', async () => {
		const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
		await legacyVersion(agent, [{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
		await copy.copyAll();
		const before = await skills.findAgentSkillVersions(agent.id);

		const counts = await copy.copyAll();

		expect(counts).toMatchObject({ agents: 0, skills: 0, versions: 0, pins: 0 });
		expect(await skills.findAgentSkillVersions(agent.id)).toEqual(before);
	});

	it('logs the start, each copied agent and a summary with scanned and skipped agents', async () => {
		const logger = Container.get(Logger);
		const info = vi.spyOn(logger, 'info');
		const debug = vi.spyOn(logger, 'debug');
		const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
		await legacyVersion(agent, [{ type: 'skill', id: 'tone' }], { tone: body('Tone') });

		await copy.copyAll();
		await copy.copyAll();

		expect(info).toHaveBeenCalledWith('Started copying inline agent skills into the skills hub');
		const copiedLogs = debug.mock.calls.filter(
			([message]) => message === 'Copied the inline skills of an agent into the skills hub',
		);
		expect(copiedLogs).toEqual([
			[
				expect.any(String),
				expect.objectContaining({ agentId: agent.id, publishedVersions: 1, draft: true }),
			],
		]);
		const summaries = info.mock.calls.filter(
			([message]) => message === 'Copied inline agent skills into the skills hub',
		);
		expect(summaries).toEqual([
			[
				expect.any(String),
				expect.objectContaining({
					scanned: 1,
					skipped: 0,
					agents: 1,
					durationMs: expect.any(Number),
				}),
			],
			[expect.any(String), expect.objectContaining({ scanned: 1, skipped: 1, agents: 0 })],
		]);
		vi.restoreAllMocks();
	});

	it('does not copy a ref that was switched off', async () => {
		const agent = await legacyAgent(
			[
				{ type: 'skill', id: 'tone' },
				{ type: 'skill', id: 'old', enabled: false },
			],
			{ tone: body('Tone'), old: body('Old') },
		);

		await copy.copyAll();

		expect(await skillRefs.refsForDraft(agent, {})).toEqual([{ type: 'skill', id: 'tone' }]);
		expect(await skills.findByIds(['old'])).toEqual([]);
	});

	it('gives a second agent with the same ref id its own skill', async () => {
		const first = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone', 'A.') });
		const second = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone', 'B.') });

		await copy.copyAll();

		// One agent keeps the id, the other gets a new one, and each runs its own text.
		const [firstRef] = await skillRefs.refsForDraft(first, {});
		const [secondRef] = await skillRefs.refsForDraft(second, {});
		expect([firstRef.id, secondRef.id].filter((id) => id === 'tone')).toHaveLength(1);
		expect(instructionsOf((await skillRefs.readDraft(first, {})).skills)).toEqual({
			[firstRef.id]: 'A.',
		});
		expect(instructionsOf((await skillRefs.readDraft(second, {})).skills)).toEqual({
			[secondRef.id]: 'B.',
		});
	});

	it('gives an inline ref id longer than 36 characters a new id', async () => {
		const longId = `skill_${'x'.repeat(40)}`;
		const agent = await legacyAgent([{ type: 'skill', id: longId }], {
			[longId]: body('Long', 'Long text.'),
		});

		await copy.copyAll();

		const [ref] = await skillRefs.refsForDraft(agent, {});
		expect(ref.id).not.toBe(longId);
		expect(ref.id.length).toBeLessThanOrEqual(36);
		expect(instructionsOf((await skillRefs.readDraft(agent, {})).skills)).toEqual({
			[ref.id]: 'Long text.',
		});
	});

	it('does not attach a skill again after it was detached', async () => {
		const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
		await copy.copyAll();
		await skillRefs.replaceDraftRefs(agent, [], {});

		await copy.copyAll();

		expect(await skillRefs.refsForDraft(agent, {})).toEqual([]);
	});

	it('pins a version that was published with the flag off to the matching hub version', async () => {
		const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
		await copy.copyAll();
		const versionId = await legacyVersion(agent, [{ type: 'skill', id: 'tone' }], {
			tone: body('Tone'),
		});

		const counts = await copy.copyAll();

		expect(counts).toMatchObject({ skills: 0, versions: 0, pins: 1 });
		expect(await skills.findPinnedSkillIds(versionId)).toEqual(['tone']);
	});

	it('copies on a main at startup while the flag is on', async () => {
		const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });

		await copy.runOnStartup();

		expect(await skillRefs.refsForDraft(agent, {})).toEqual([{ type: 'skill', id: 'tone' }]);
	});

	/** Saves new text for a hub skill, as an edit in the builder does. */
	async function editInHub(skillId: string, instructions: string) {
		const next = await skills.nextVersionNumber(skillId);
		await skills.insertSavedVersion(
			skillId,
			next,
			{ name: 'Edited', description: 'd', instructions, frontmatter: null, files: [] },
			null,
		);
	}

	describe('restarts', () => {
		/**
		 * Boots the agents module again on the same database, as a restart of the process
		 * does: the setting is read into a new rollout and a new startup copy runs. Only the
		 * database carries over, so nothing in memory can stop a second copy.
		 */
		async function restart(skillsHubEnabled: boolean) {
			const config = Container.get(AgentsConfig);
			config.skillsHubEnabled = skillsHubEnabled;
			const rollout = new SkillsHubRollout(config, Container.get(Logger));
			rollout.init();
			// The services that read agent skills follow the same setting after the restart.
			setSkillsHubFlag(skillsHubEnabled);
			const freshCopy = new SkillsHubStartupCopy(
				Container.get(Logger),
				rollout,
				Container.get(InstanceSettings),
				agents,
				skills,
				Container.get(TransactionRunner),
			);
			await freshCopy.runOnStartup();
			return freshCopy;
		}

		/** Row counts of every table the copy writes. */
		async function hubState() {
			const manager = Container.get(DataSource).manager;
			return {
				skills: await manager.count(Skill),
				versions: await manager.count(SkillVersion),
				files: await manager.count(SkillFile),
				draftRefs: await manager.count(AgentSkillDependency),
				pins: await manager.count(AgentVersionSkillDependency),
			};
		}

		async function agentWithPublishedSkills() {
			const refs: InlineRef[] = [
				{ type: 'skill', id: 'tone' },
				{ type: 'skill', id: 'pricing' },
			];
			const agent = await legacyAgent(refs, {
				tone: body('Tone', 'Draft tone.'),
				pricing: { ...body('Pricing'), references: [{ path: 'references/a.md', content: 'A' }] },
			});
			await legacyVersion(agent, refs, {
				tone: body('Tone', 'Published tone.'),
				pricing: body('Pricing'),
			});
			return agent;
		}

		it('copies on the first start and writes nothing on later restarts', async () => {
			const agent = await agentWithPublishedSkills();

			await restart(true);
			const afterFirst = await hubState();
			await restart(true);
			await restart(true);

			expect(afterFirst).toMatchObject({ skills: 2, draftRefs: 2, pins: 2 });
			expect(await hubState()).toEqual(afterFirst);
			expect(instructionsOf((await skillRefs.readDraft(agent, {})).skills)).toEqual({
				tone: 'Draft tone.',
				pricing: 'Pricing instructions.',
			});
		});

		it('keeps hub edits and detached skills over a restart', async () => {
			const agent = await agentWithPublishedSkills();
			await restart(true);
			await editInHub('tone', 'Edited in the hub.');
			await skillRefs.replaceDraftRefs(agent, [{ type: 'skill', id: 'tone' }], {});
			const beforeRestart = await hubState();

			await restart(true);

			expect(await hubState()).toEqual(beforeRestart);
			expect(await skillRefs.refsForDraft(agent, {})).toEqual([{ type: 'skill', id: 'tone' }]);
			expect(instructionsOf((await skillRefs.readDraft(agent, {})).skills)).toEqual({
				tone: 'Edited in the hub.',
			});
		});

		it('does not copy again when the setting goes off and back on', async () => {
			const agent = await agentWithPublishedSkills();
			await restart(true);
			const afterFirst = await hubState();

			await restart(false);
			// With the setting off, agents write their inline columns again.
			await agents.update(
				{ id: agent.id },
				{ skills: { tone: body('Tone', 'Inline edit.') } as never },
			);
			await restart(true);

			expect(await hubState()).toEqual(afterFirst);
			// The agent has hub rows, so the copy leaves it alone: inline edits are not merged.
			expect(instructionsOf((await skillRefs.readDraft(agent, {})).skills)).toEqual({
				tone: 'Draft tone.',
				pricing: 'Pricing instructions.',
			});
		});

		it('copies each agent once when two mains start at the same time', async () => {
			await agentWithPublishedSkills();
			await agentWithPublishedSkills();

			await Promise.all([restart(true), restart(true)]);

			expect(await hubState()).toMatchObject({ skills: 4, draftRefs: 4, pins: 4 });
		});
	});

	describe('with the flag off', () => {
		beforeEach(() => {
			vi.spyOn(Container.get(Logger), 'warn');
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		const hubOffWarning = () =>
			vi
				.mocked(Container.get(Logger).warn)
				.mock.calls.find(([message]) => String(message).includes('The skills hub is off'));

		it('copies nothing and reads only the draft refs and their content', async () => {
			await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
			setSkillsHubFlag(false);
			const copyReads = [
				vi.spyOn(agents, 'findPageForSkillCopy'),
				vi.spyOn(skills, 'findUnpinnedVersions'),
				vi.spyOn(skills, 'hasHubState'),
				vi.spyOn(skills, 'findAgentSkillVersions'),
				vi.spyOn(skills, 'createSkill'),
				vi.spyOn(skills, 'replaceDependencies'),
				vi.spyOn(skills, 'insertPins'),
			];

			await copy.runOnStartup();

			for (const spy of copyReads) expect(spy).not.toHaveBeenCalled();
			expect(await skills.find()).toEqual([]);
			expect(hubOffWarning()).toBeUndefined();
		});

		it('reads nothing from the hub on a main that is not the leader', async () => {
			await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
			await copy.copyAll();
			await editInHub('tone', 'Edited in the hub.');
			setSkillsHubFlag(false);
			const findRefs = vi.spyOn(skills, 'findAgentIdsWithDraftRefs');
			const settings = Container.get(InstanceSettings);
			settings.markAsFollower();
			try {
				await copy.runOnStartup();
			} finally {
				settings.markAsLeader();
			}

			expect(findRefs).not.toHaveBeenCalled();
			expect(hubOffWarning()).toBeUndefined();
		});

		it('names no agent when the hub runs the same content as the inline skills', async () => {
			await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
			await copy.copyAll();
			setSkillsHubFlag(false);

			await copy.runOnStartup();

			expect(hubOffWarning()).toBeUndefined();
		});

		it('names an agent whose skill changed in the hub, and counts it once', async () => {
			const agent = await legacyAgent(
				[
					{ type: 'skill', id: 'tone' },
					{ type: 'skill', id: 'pricing' },
				],
				{ tone: body('Tone'), pricing: body('Pricing') },
			);
			await legacyAgent([{ type: 'skill', id: 'other' }], { other: body('Other') });
			await copy.copyAll();
			await editInHub('tone', 'Edited in the hub.');
			await editInHub('pricing', 'Edited in the hub.');
			setSkillsHubFlag(false);

			await copy.runOnStartup();

			expect(hubOffWarning()?.[1]).toEqual({ agents: 1, agentIds: [agent.id] });
		});

		it('names an agent that got a skill only in the hub', async () => {
			const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
			await copy.copyAll();
			await skills.createSkill(
				{
					id: 'added',
					target: { projectId: null, agentId: agent.id },
					source: 'agent',
					createdById: null,
				},
				{ name: 'Added', description: 'd', instructions: 'New.', frontmatter: null, files: [] },
			);
			await skills.replaceDependencies(agent.id, [{ skillId: 'tone' }, { skillId: 'added' }]);
			setSkillsHubFlag(false);

			await copy.runOnStartup();

			expect(hubOffWarning()?.[1]).toEqual({ agents: 1, agentIds: [agent.id] });
		});
	});

	describe('what an agent row holds', () => {
		it('writes nothing for an agent without a config or without skills', async () => {
			await legacyAgent(null, {});
			await legacyAgent([], {});

			const counts = await copy.copyAll();

			expect(counts).toMatchObject({ agents: 0, skills: 0, versions: 0, pins: 0, failed: 0 });
			expect(await skills.find()).toEqual([]);
		});

		it('skips a ref without a body and a body without a ref', async () => {
			const agent = await legacyAgent(
				[
					{ type: 'skill', id: 'tone' },
					{ type: 'skill', id: 'dangling' },
				],
				{ tone: body('Tone'), orphan: body('Orphan') },
			);

			await copy.copyAll();

			expect(await skillRefs.refsForDraft(agent, {})).toEqual([{ type: 'skill', id: 'tone' }]);
			expect(await skills.findByIds(['dangling', 'orphan'])).toEqual([]);
		});

		it('ignores refs and bodies the runtime could not load either', async () => {
			const agent = await legacyAgent(
				[
					{ type: 'skill', id: 'tone' },
					{ type: 'tool', id: 'not-a-skill' },
					{ type: 'skill' },
					{ type: 'skill', id: 42 },
					'garbage',
					{ type: 'skill', id: 'no_instructions' },
					{ type: 'skill', id: 'not_an_object' },
				],
				{
					tone: body('Tone'),
					'not-a-skill': body('Tool'),
					no_instructions: { name: 'Broken', description: 'No text' },
					not_an_object: 'text',
				},
			);

			const counts = await copy.copyAll();

			expect(counts).toMatchObject({ skills: 1, failed: 0 });
			expect(await skillRefs.refsForDraft(agent, {})).toEqual([{ type: 'skill', id: 'tone' }]);
		});

		it('attaches a repeated ref once and keeps the ref order', async () => {
			const agent = await legacyAgent(
				[
					{ type: 'skill', id: 'zeta' },
					{ type: 'skill', id: 'alpha' },
					{ type: 'skill', id: 'zeta' },
					{ type: 'skill', id: 'mid' },
				],
				{ zeta: body('Zeta'), alpha: body('Alpha'), mid: body('Mid') },
			);

			await copy.copyAll();

			expect((await skillRefs.refsForDraft(agent, {})).map((ref) => ref.id)).toEqual([
				'zeta',
				'alpha',
				'mid',
			]);
		});

		it('keeps two refs with the same body as two skills', async () => {
			const agent = await legacyAgent(
				[
					{ type: 'skill', id: 'first' },
					{ type: 'skill', id: 'second' },
				],
				{ first: body('Greet', 'Same.'), second: body('Greet', 'Same.') },
			);

			await copy.copyAll();

			expect((await skillRefs.refsForDraft(agent, {})).map((ref) => ref.id)).toEqual([
				'first',
				'second',
			]);
		});

		it('does not move a ref onto the skill of another ref that once had its body', async () => {
			const agent = await legacyAgent(
				[
					{ type: 'skill', id: 'a' },
					{ type: 'skill', id: 'b' },
				],
				{ a: body('Greet', 'Y'), b: body('Greet', 'X') },
			);
			const versionId = await legacyVersion(agent, [{ type: 'skill', id: 'a' }], {
				a: body('Greet', 'X'),
			});

			await copy.copyAll();

			expect(instructionsOf((await skillRefs.readDraft(agent, {})).skills)).toEqual({
				a: 'Y',
				b: 'X',
			});
			expect(await pinnedTexts(versionId)).toEqual({ a: 'X' });
		});

		it('copies name, description, instructions and reference files exactly', async () => {
			const tone: AgentSkill = {
				name: '  Tone of Voice  ',
				description: 'How we write',
				instructions: 'Be brief.',
				references: [
					{ path: 'references/b.md', content: 'B' },
					{ path: 'references/a.md', content: 'A' },
				],
			};
			const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone });

			await copy.copyAll();

			const { skills: copied } = await skillRefs.readDraft(agent, {});
			expect(copied.tone).toEqual({
				...tone,
				// Files are sorted by path, as everywhere in the hub.
				references: [
					{ path: 'references/a.md', content: 'A' },
					{ path: 'references/b.md', content: 'B' },
				],
			});
			const [skill] = await skills.findByIds(['tone']);
			expect(skill).toMatchObject({ source: 'agent', createdById: null });
		});

		it('keeps the first copy of a repeated reference path', async () => {
			const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], {
				tone: {
					...body('Tone'),
					references: [
						{ path: 'references/a.md', content: 'First' },
						{ path: 'references/a.md', content: 'Second' },
					],
				},
			});

			await copy.copyAll();

			const { skills: copied } = await skillRefs.readDraft(agent, {});
			expect(copied.tone.references).toEqual([{ path: 'references/a.md', content: 'First' }]);
		});

		it('drops allowedTools, which hub skills ignore', async () => {
			const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], {
				tone: { ...body('Tone'), allowedTools: ['search'] },
			});

			await copy.copyAll();

			const { skills: copied } = await skillRefs.readDraft(agent, {});
			expect(copied.tone).toEqual(body('Tone'));
		});

		it('gives a new id when a skill elsewhere already has the inline id', async () => {
			const other = await createTeamProject();
			await skills.createSkill(
				{
					id: 'tone',
					target: { projectId: other.id, agentId: null },
					source: 'ui',
					createdById: null,
				},
				{ name: 'Other', description: 'd', instructions: 'Other.', frontmatter: null, files: [] },
			);
			const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], {
				tone: body('Tone', 'Mine.'),
			});

			await copy.copyAll();

			const [ref] = await skillRefs.refsForDraft(agent, {});
			expect(ref.id).not.toBe('tone');
			expect(instructionsOf((await skillRefs.readDraft(agent, {})).skills)).toEqual({
				[ref.id]: 'Mine.',
			});
		});
	});

	describe('published versions', () => {
		it('turns each published text into a version, newest draft text last, and pins each version', async () => {
			const refs = [{ type: 'skill', id: 'tone' }];
			const agent = await legacyAgent(refs, { tone: body('Tone', 'C') });
			const first = await legacyVersion(agent, refs, { tone: body('Tone', 'A') });
			const second = await legacyVersion(agent, refs, { tone: body('Tone', 'B') });

			await copy.copyAll();

			expect(await versionTexts(agent.id, 'tone')).toEqual(['A', 'B', 'C']);
			expect(await pinnedTexts(first)).toEqual({ tone: 'A' });
			expect(await pinnedTexts(second)).toEqual({ tone: 'B' });
			expect(instructionsOf((await skillRefs.readDraft(agent, {})).skills)).toEqual({
				tone: 'C',
			});
		});

		it('adds no version when the draft runs the published text', async () => {
			const refs = [{ type: 'skill', id: 'tone' }];
			const agent = await legacyAgent(refs, { tone: body('Tone', 'Same.') });
			const versionId = await legacyVersion(agent, refs, { tone: body('Tone', 'Same.') });

			await copy.copyAll();

			expect(await versionTexts(agent.id, 'tone')).toEqual(['Same.']);
			expect(await pinnedTexts(versionId)).toEqual({ tone: 'Same.' });
		});

		it('saves an older text again as the newest version when the draft went back to it', async () => {
			const refs = [{ type: 'skill', id: 'tone' }];
			const agent = await legacyAgent(refs, { tone: body('Tone', 'A') });
			await legacyVersion(agent, refs, { tone: body('Tone', 'A') });
			await legacyVersion(agent, refs, { tone: body('Tone', 'B') });

			await copy.copyAll();

			// The draft follows the newest version, so A must come back as v3.
			expect(await versionTexts(agent.id, 'tone')).toEqual(['A', 'B', 'A']);
			expect(instructionsOf((await skillRefs.readDraft(agent, {})).skills)).toEqual({
				tone: 'A',
			});
		});

		it('pins a skill that only a published version has, without attaching it to the draft', async () => {
			const agent = await legacyAgent([], {});
			const versionId = await legacyVersion(agent, [{ type: 'skill', id: 'gone' }], {
				gone: body('Gone', 'Published only.'),
			});

			await copy.copyAll();

			expect(await pinnedTexts(versionId)).toEqual({ gone: 'Published only.' });
			expect(await skillRefs.refsForDraft(agent, {})).toEqual([]);
		});

		it('does not pin a ref that was switched off in a published version', async () => {
			const agent = await legacyAgent([], {});
			const versionId = await legacyVersion(
				agent,
				[
					{ type: 'skill', id: 'tone' },
					{ type: 'skill', id: 'off', enabled: false },
				],
				{ tone: body('Tone'), off: body('Off') },
			);

			await copy.copyAll();

			expect(Object.keys(await pinnedTexts(versionId))).toEqual(['tone']);
		});

		it('keeps the pins of a published version in ref order', async () => {
			const refs = [
				{ type: 'skill', id: 'zeta' },
				{ type: 'skill', id: 'alpha' },
			];
			const agent = await legacyAgent(refs, { zeta: body('Zeta'), alpha: body('Alpha') });
			const versionId = await legacyVersion(agent, refs, {
				zeta: body('Zeta'),
				alpha: body('Alpha'),
			});

			await copy.copyAll();

			expect(await skills.findPinnedSkillIds(versionId)).toEqual(['zeta', 'alpha']);
		});

		it('leaves the agent_history rows as they are', async () => {
			const refs = [{ type: 'skill', id: 'tone' }];
			const agent = await legacyAgent(refs, { tone: body('Tone') });
			const versionId = await legacyVersion(agent, refs, { tone: body('Tone', 'Published.') });
			const before = await histories.findOneByOrFail({ versionId });

			await copy.copyAll();

			expect(await histories.findOneByOrFail({ versionId })).toEqual(before);
		});
	});

	describe('running again', () => {
		it('treats a published version without skills as done on every run', async () => {
			const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
			await legacyVersion(agent, [], {});
			await copy.copyAll();

			expect(await copy.copyAll()).toMatchObject({ agents: 0, versions: 0, pins: 0 });
		});

		it('keeps hub content when the inline text changed while the flag was off', async () => {
			// Known gap: the merge rule for this case is open, so the hub wins.
			const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], {
				tone: body('Tone', 'Before.'),
			});
			await copy.copyAll();
			await agents.update({ id: agent.id }, { skills: { tone: body('Tone', 'Edited inline.') } });

			await copy.copyAll();

			expect(instructionsOf((await skillRefs.readDraft(agent, {})).skills)).toEqual({
				tone: 'Before.',
			});
		});

		it('copies an agent created while the flag was off on the next run', async () => {
			await copy.copyAll();
			const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });

			await copy.copyAll();

			expect(await skillRefs.refsForDraft(agent, {})).toEqual([{ type: 'skill', id: 'tone' }]);
		});
	});

	describe('failures', () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('rolls back a failing agent, copies the others, and copies it on the next run', async () => {
			const broken = await legacyAgent([{ type: 'skill', id: 'broken' }], {
				broken: body('Broken'),
			});
			const fine = await legacyAgent([{ type: 'skill', id: 'fine' }], { fine: body('Fine') });
			const replace = skills.replaceDependencies.bind(skills);
			const failFor = vi
				.spyOn(skills, 'replaceDependencies')
				.mockImplementation(async (agentId, refs, ctx) => {
					if (agentId === broken.id) throw new Error('Write failed');
					return await replace(agentId, refs, ctx);
				});

			const counts = await copy.copyAll();

			expect(counts).toMatchObject({ agents: 1, failed: 1 });
			// The failed agent's skill was rolled back with the rest of its copy.
			expect(await skills.findByIds(['broken'])).toEqual([]);
			expect(await skillRefs.refsForDraft(fine, {})).toEqual([{ type: 'skill', id: 'fine' }]);

			failFor.mockRestore();
			await copy.copyAll();

			expect(await skillRefs.refsForDraft(broken, {})).toEqual([{ type: 'skill', id: 'broken' }]);
		});

		it('retries an agent once after a failed try', async () => {
			const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
			const replace = skills.replaceDependencies.bind(skills);
			vi.spyOn(skills, 'replaceDependencies')
				.mockRejectedValueOnce(new Error('Duplicate key'))
				.mockImplementation(replace);

			const counts = await copy.copyAll();

			// The failed try rolled back, so only the second try counts.
			expect(counts).toMatchObject({ agents: 1, skills: 1, versions: 1, failed: 0 });
			expect(await skillRefs.refsForDraft(agent, {})).toEqual([{ type: 'skill', id: 'tone' }]);
		});

		it('copies the inline text as it is when the copy reaches the agent, not when it read the page', async () => {
			const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], {
				tone: body('Tone', 'Old.'),
			});
			const findPage = agents.findPageForSkillCopy.bind(agents);
			vi.spyOn(agents, 'findPageForSkillCopy').mockImplementationOnce(async (...args) => {
				const page = await findPage(...args);
				// A main with the flag still off saves the draft after the page was read.
				await agents.update({ id: agent.id }, { skills: { tone: body('Tone', 'New.') } });
				return page;
			});

			await copy.copyAll();

			expect(instructionsOf((await skillRefs.readDraft(agent, {})).skills)).toEqual({
				tone: 'New.',
			});
		});

		it('picks a new id when another agent took the same inline id first', async () => {
			const first = await legacyAgent([{ type: 'skill', id: 'tone' }], {
				tone: body('Tone', 'A.'),
			});
			const second = await legacyAgent([{ type: 'skill', id: 'tone' }], {
				tone: body('Tone', 'B.'),
			});
			// As when two mains copy at once: both see `tone` as free, so the second insert
			// fails on the primary key.
			vi.spyOn(skills, 'existsById').mockResolvedValueOnce(false).mockResolvedValueOnce(false);

			const counts = await copy.copyAll();

			expect(counts).toMatchObject({ agents: 2, skills: 2, versions: 2, failed: 0 });
			const [firstRef] = await skillRefs.refsForDraft(first, {});
			const [secondRef] = await skillRefs.refsForDraft(second, {});
			expect([firstRef.id, secondRef.id].filter((id) => id === 'tone')).toHaveLength(1);
			expect(instructionsOf((await skillRefs.readDraft(second, {})).skills)).toEqual({
				[secondRef.id]: 'B.',
			});
		});
	});

	describe('scale and instance roles', () => {
		it('copies every agent across several pages', async () => {
			const created = [];
			for (let index = 0; index < 105; index++) {
				created.push(
					await legacyAgent([{ type: 'skill', id: `skill_${index}` }], {
						[`skill_${index}`]: body(`Skill ${index}`),
					}),
				);
			}

			const counts = await copy.copyAll();

			expect(counts).toMatchObject({ agents: 105, skills: 105, failed: 0 });
			const last = created[created.length - 1];
			expect(await skillRefs.refsForDraft(last, {})).toEqual([{ type: 'skill', id: 'skill_104' }]);
		});

		it('copies on a main that is not the leader', async () => {
			const settings = Container.get(InstanceSettings);
			settings.markAsFollower();
			try {
				const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });

				await copy.runOnStartup();

				expect(await skillRefs.refsForDraft(agent, {})).toEqual([{ type: 'skill', id: 'tone' }]);
			} finally {
				settings.markAsLeader();
			}
		});

		it('does not copy on a worker', async () => {
			const settings = Container.get(InstanceSettings);
			const { instanceType } = settings;
			Object.assign(settings, { instanceType: 'worker' });
			try {
				await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });

				await copy.runOnStartup();

				expect(await skills.findByIds(['tone'])).toEqual([]);
			} finally {
				Object.assign(settings, { instanceType });
			}
		});

		it('names at most 20 agents in the warning, and counts all of them', async () => {
			for (let index = 0; index < 22; index++) {
				await legacyAgent([{ type: 'skill', id: `s${index}` }], {
					[`s${index}`]: body(`S${index}`),
				});
			}
			await copy.copyAll();
			for (let index = 0; index < 22; index++) await editInHub(`s${index}`, 'Edited in the hub.');
			setSkillsHubFlag(false);
			const warn = vi.spyOn(Container.get(Logger), 'warn');

			await copy.runOnStartup();

			const [, meta] = warn.mock.calls.find(([message]) =>
				String(message).includes('The skills hub is off'),
			)!;
			expect(meta).toMatchObject({ agents: 22 });
			expect((meta as { agentIds: string[] }).agentIds).toHaveLength(20);
		});
	});

	// Two mains copy at once only on Postgres; SQLite runs one write transaction at a time.
	describe.skipIf(process.env.DB_TYPE !== 'postgresdb')('two mains at once on Postgres', () => {
		it('copies each agent once when two copies run side by side', async () => {
			const refs = [{ type: 'skill', id: 'tone' }];
			const agent = await legacyAgent(refs, { tone: body('Tone', 'Draft.') });
			const versionId = await legacyVersion(agent, refs, { tone: body('Tone', 'Published.') });

			const results = await Promise.all([copy.copyAll(), copy.copyAll()]);

			expect(results.reduce((sum, counts) => sum + counts.failed, 0)).toBe(0);
			expect(await skills.find()).toHaveLength(1);
			expect(await versionTexts(agent.id, 'tone')).toEqual(['Published.', 'Draft.']);
			expect(await skills.findPinnedSkillIds(versionId)).toEqual(['tone']);
			expect(await skillRefs.refsForDraft(agent, {})).toEqual([{ type: 'skill', id: 'tone' }]);
		});
	});
});
