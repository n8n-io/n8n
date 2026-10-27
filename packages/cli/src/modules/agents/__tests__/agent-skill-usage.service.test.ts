import { Container } from '@n8n/di';
import { AgentDefinitionService } from '../agent-definition.service';
/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests reference unbound methods */
import type { OperationContext } from '@n8n/db';
import { UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { SkillFile } from '@/modules/skills/skill-file.entity';
import type { SkillVersion } from '@/modules/skills/skill-version.entity';
import type { Skill } from '@/modules/skills/skill.entity';
import type { ResolvedSkillRow, SkillRepository } from '@/modules/skills/skill.repository';
import { SkillService } from '@/modules/skills/skill.service';

import { AgentSkillUsageService } from '../agent-skill-usage.service';
import type { AgentUpdateBroadcaster } from '../agent-update-broadcaster';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSkillRepository } from '../repositories/agent-skill.repository';

const clearRuntimes = vi.fn();
vi.mock('../agent-runtime-cache.service', () => ({ AgentRuntimeCacheService: class {} }));
vi.mock('@n8n/di', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/di')>();
	return {
		...actual,
		Container: {
			...actual.Container,
			set: vi.fn(),
			get: vi.fn(() => ({ clearRuntimes, captureVersion: vi.fn() })),
		},
	};
});

const PROJECT = 'project-1';
const TX_CTX = { trx: {} } as OperationContext;

async function expectError(
	promise: Promise<unknown>,
	errorClass: new (...args: never[]) => Error,
	message: string,
) {
	const error: unknown = await promise.then(
		() => undefined,
		(caught: unknown) => caught,
	);
	expect(error).toBeInstanceOf(errorClass);
	expect(error).toHaveProperty('message', message);
}

function skillRow(id: string, target: Partial<Pick<Skill, 'projectId' | 'agentId'>> = {}): Skill {
	return mock<Skill>({ id, projectId: target.projectId ?? null, agentId: target.agentId ?? null });
}

function versionRow(
	skill: Skill,
	version: number,
	overrides: Partial<SkillVersion> = {},
): ResolvedSkillRow {
	return {
		skill,
		version: mock<SkillVersion>({
			id: `${skill.id}-v${version}`,
			skillId: skill.id,
			version,
			name: 'Brand voice',
			description: 'Write in our voice',
			instructions: 'Use short sentences.',
			frontmatter: null,
			...overrides,
		}),
		files: [] as SkillFile[],
	};
}

describe('AgentSkillUsageService', () => {
	const skills = mock<SkillRepository>();
	const agentSkills = mock<AgentSkillRepository>();
	const agents = mock<AgentRepository>();
	const broadcaster = mock<AgentUpdateBroadcaster>();
	// A real SkillService, so the names that agents see come from the mocked rows.
	const skillService = new SkillService(mock(), skills, mock(), mock(), mock());
	const service = new AgentSkillUsageService(
		agentSkills,
		agents,
		skills,
		skillService,
		broadcaster,
		mock(),
	);

	beforeEach(() => {
		vi.resetAllMocks();
		Container.set(AgentDefinitionService, mock<AgentDefinitionService>());
		skills.findLatestSaved.mockResolvedValue(new Map());
		skills.findVersionsByIds.mockResolvedValue(new Map());
		skills.findByIds.mockResolvedValue([]);
		agentSkills.findDependencies.mockResolvedValue(new Map());
		agentSkills.findFollowingAgents.mockResolvedValue([]);
		agentSkills.findFollowingAgentIds.mockResolvedValue([]);
		agents.markFollowerDraftsChanged.mockResolvedValue([]);
		agents.findProjectIdsByIds.mockResolvedValue([]);
	});

	describe('saved-version access', () => {
		it.each([{ rows: [] }, { rows: [skillRow('skill_a', { projectId: 'another-project' })] }])(
			'refuses missing or inaccessible saved skills',
			async ({ rows }) => {
				skills.findByIds.mockResolvedValue(rows);
				await expect(
					service.assertVersionAccess(
						{ id: 'agent-1', projectId: PROJECT },
						[{ id: 'skill_a' }],
						TX_CTX,
					),
				).rejects.toThrow('A saved skill is no longer available to this agent');
			},
		);
		it('holds the skill lock through publication and accepts an accessible skill', async () => {
			skills.findByIds.mockResolvedValue([skillRow('skill_a', { projectId: PROJECT })]);
			await service.assertVersionAccess(
				{ id: 'agent-1', projectId: PROJECT },
				[{ id: 'skill_a' }],
				TX_CTX,
			);
			expect(skills.lockForPublish).toHaveBeenCalledWith(['skill_a'], TX_CTX);
		});
	});

	describe('pinForPublish', () => {
		it('pins each ref to its version in draft order', async () => {
			await service.pinForPublish(
				'agent-version-1',
				new Map([
					['skill_a', 'skill_a-v3'],
					['skill_b', 'skill_b-v1'],
				]),
				TX_CTX,
			);

			expect(agentSkills.insertPins).toHaveBeenCalledWith(
				[
					{
						agentVersionId: 'agent-version-1',
						skillId: 'skill_a',
						skillVersionId: 'skill_a-v3',
					},
					{
						agentVersionId: 'agent-version-1',
						skillId: 'skill_b',
						skillVersionId: 'skill_b-v1',
					},
				],
				TX_CTX,
			);
		});
	});

	describe('restoreFromVersion', () => {
		it('pins each ref to the version that agent version used and writes no skill', async () => {
			const v1 = versionRow(skillRow('skill_a'), 1);
			agentSkills.findPinned.mockResolvedValue(new Map([['skill_a', v1]]));

			const refs = await service.restoreFromVersion('agent-version-1', [
				{ id: 'skill_a' },
				{ id: 'skill_unpinned', versionId: 'stale' },
			]);

			expect(refs).toEqual([{ id: 'skill_a', versionId: 'skill_a-v1' }, { id: 'skill_unpinned' }]);
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
		});
	});

	describe('isAttachable', () => {
		const agent = { id: 'agent-1', projectId: PROJECT };

		it.each([
			['an instance skill', {}, true],
			['a skill of the agent project', { projectId: PROJECT }, true],
			['a skill of another project', { projectId: 'project-2' }, false],
			['a skill of this agent', { agentId: 'agent-1' }, true],
			['a skill of another agent', { agentId: 'agent-2' }, false],
		])('is %s attachable: %s', (_label, target, expected) => {
			expect(service.isAttachable(skillRow('skill_a', target), agent)).toBe(expected);
		});
	});

	describe('checkRefs', () => {
		const agent = { id: 'agent-1', projectId: PROJECT };

		function givenAgentRefs(refs: Array<{ skillId: string; versionId?: string }>) {
			agentSkills.findDependencies.mockResolvedValue(
				new Map([['agent-1', refs.map((ref) => ({ versionId: null, ...ref }))]]),
			);
		}

		beforeEach(() => givenAgentRefs([{ skillId: 'skill_old' }]));

		function givenSkills(rows: Array<{ skill: Skill; name: string }>) {
			skills.findByIds.mockResolvedValue(rows.map((row) => row.skill));
			skills.findLatestSaved.mockImplementation(
				async (ids) =>
					new Map(
						rows
							.filter((row) => ids.includes(row.skill.id))
							.map((row) => [row.skill.id, versionRow(row.skill, 1, { name: row.name })]),
					),
			);
		}

		it("reads the agent's current refs from its dependency rows", async () => {
			await service.checkRefs(agent, []);

			expect(agentSkills.findDependencies).toHaveBeenCalledWith(['agent-1'], {});
		});

		it('keeps a new ref to an attachable skill', async () => {
			givenSkills([
				{ skill: skillRow('skill_old', { projectId: PROJECT }), name: 'Pricing' },
				{ skill: skillRow('skill_new'), name: 'Tone' },
			]);

			const refs = await service.checkRefs(agent, [{ id: 'skill_old' }, { id: 'skill_new' }]);

			expect(refs).toEqual([{ id: 'skill_old' }, { id: 'skill_new' }]);
		});

		it('holds a shared lock on newly attached skills in the caller transaction', async () => {
			givenSkills([
				{ skill: skillRow('skill_old', { projectId: PROJECT }), name: 'Pricing' },
				{ skill: skillRow('skill_new'), name: 'Tone' },
			]);

			await service.checkRefs(agent, [{ id: 'skill_old' }, { id: 'skill_new' }], TX_CTX);

			expect(skills.lockForPublish).toHaveBeenCalledWith(['skill_new'], TX_CTX);
		});

		it('compares the name of the version a pinned ref runs, not the latest name', async () => {
			const old = skillRow('skill_old', { projectId: PROJECT });
			givenAgentRefs([{ skillId: 'skill_old', versionId: 'skill_old-v1' }]);
			givenSkills([
				{ skill: old, name: 'Tone' },
				{ skill: skillRow('skill_new'), name: 'tone' },
			]);
			// The agent runs v1, which is still called "Pricing".
			skills.findVersionsByIds.mockResolvedValue(
				new Map([['skill_old-v1', versionRow(old, 1, { name: 'Pricing' })]]),
			);

			await expect(
				service.checkRefs(agent, [
					{ id: 'skill_old', versionId: 'skill_old-v1' },
					{ id: 'skill_new' },
				]),
			).resolves.toEqual([{ id: 'skill_old', versionId: 'skill_old-v1' }, { id: 'skill_new' }]);
		});

		it('drops a new ref to a missing skill', async () => {
			givenSkills([{ skill: skillRow('skill_old', { projectId: PROJECT }), name: 'Pricing' }]);

			const refs = await service.checkRefs(agent, [{ id: 'skill_old' }, { id: 'skill_gone' }]);

			expect(refs).toEqual([{ id: 'skill_old' }]);
		});

		it('keeps a ref the agent already had even when its skill is gone', async () => {
			const refs = await service.checkRefs(agent, [{ id: 'skill_old' }]);

			expect(refs).toEqual([{ id: 'skill_old' }]);
		});

		it.each([
			['a skill of another agent', { agentId: 'agent-2' }],
			['a skill of another project', { projectId: 'project-2' }],
		])('rejects a new ref to %s', async (_label, target) => {
			givenSkills([{ skill: skillRow('skill_new', target), name: 'Tone' }]);

			await expectError(
				service.checkRefs(agent, [{ id: 'skill_new' }]),
				UserError,
				'Skill "Tone" (skill_new) is not available to this agent. An agent can use the skills of its own project, its own skills and instance skills.',
			);
		});

		it('rejects a new ref whose name clashes with a skill of the agent', async () => {
			givenSkills([
				{ skill: skillRow('skill_old', { projectId: PROJECT }), name: 'Brand voice' },
				{ skill: skillRow('skill_new'), name: 'brand-voice' },
			]);

			await expectError(
				service.checkRefs(agent, [{ id: 'skill_old' }, { id: 'skill_new' }]),
				UserError,
				'This agent already has a skill with a name like "brand-voice". Rename one of them, or detach the other skill first.',
			);
		});

		it('keeps a clash the agent already had', async () => {
			givenAgentRefs([{ skillId: 'skill_a' }, { skillId: 'skill_b' }]);
			givenSkills([
				{ skill: skillRow('skill_a', { projectId: PROJECT }), name: 'Pricing' },
				{ skill: skillRow('skill_b', { projectId: PROJECT }), name: 'pricing' },
			]);

			const refs = await service.checkRefs(agent, [{ id: 'skill_a' }, { id: 'skill_b' }]);

			expect(refs).toHaveLength(2);
		});

		it('keeps a pin the agent already had and drops a pin it did not have', async () => {
			givenAgentRefs([{ skillId: 'skill_a', versionId: 'v1' }, { skillId: 'skill_b' }]);
			givenSkills([
				{ skill: skillRow('skill_a', { projectId: PROJECT }), name: 'Pricing' },
				{ skill: skillRow('skill_b', { projectId: PROJECT }), name: 'Tone' },
			]);

			const refs = await service.checkRefs(agent, [
				{ id: 'skill_a', versionId: 'v1' },
				{ id: 'skill_b', versionId: 'v9' },
			]);

			expect(refs).toEqual([{ id: 'skill_a', versionId: 'v1' }, { id: 'skill_b' }]);
		});

		it('lets a save clear a pin', async () => {
			givenAgentRefs([{ skillId: 'skill_a', versionId: 'v1' }]);
			givenSkills([{ skill: skillRow('skill_a', { projectId: PROJECT }), name: 'Pricing' }]);

			expect(await service.checkRefs(agent, [{ id: 'skill_a' }])).toEqual([{ id: 'skill_a' }]);
		});
	});

	describe('assertRenameKeepsNamesApart', () => {
		function givenFollower(otherName: string) {
			agentSkills.findFollowingAgents.mockResolvedValue([{ id: 'agent-1', name: 'Sales bot' }]);
			agentSkills.findDependencies.mockResolvedValue(
				new Map([
					[
						'agent-1',
						[
							{ skillId: 'skill_a', versionId: null },
							{ skillId: 'skill_b', versionId: null },
						],
					],
				]),
			);
			skills.findLatestSaved.mockImplementation(
				async (ids) =>
					new Map(
						ids.map((id) => [
							id,
							versionRow(skillRow(id), 2, { name: id === 'skill_b' ? otherName : 'Brand voice' }),
						]),
					),
			);
		}

		it('rejects a rename that clashes on a following agent', async () => {
			givenFollower('Pricing');

			await expectError(
				service.assertRenameKeepsNamesApart('skill_a', 'Brand voice', 'pricing', TX_CTX),
				UserError,
				'Cannot rename to "pricing": Sales bot already uses a skill with a name like that.',
			);
			expect(agentSkills.findFollowingAgents).toHaveBeenCalledWith('skill_a', TX_CTX);
		});

		it('allows a rename that clashes on no agent', async () => {
			givenFollower('Pricing');

			await expect(
				service.assertRenameKeepsNamesApart('skill_a', 'Brand voice', 'Tone', TX_CTX),
			).resolves.toBeUndefined();
		});
	});

	describe('findAgentSummaries', () => {
		it('reads the lean summaries and keeps only id and name', async () => {
			agents.findSummariesByProjectIds.mockResolvedValue([
				{
					id: 'agent-1',
					name: 'Support bot',
					projectId: 'project-1',
					activeVersionId: null,
					availableInMCP: false,
					updatedAt: new Date(),
				},
			] as Awaited<ReturnType<AgentRepository['findSummariesByProjectIds']>>);

			const result = await service.findAgentSummaries(['project-1'], { search: 'bot', limit: 50 });

			expect(agents.findSummariesByProjectIds).toHaveBeenCalledWith(['project-1'], {
				query: 'bot',
				limit: 50,
			});
			expect(result).toEqual([{ id: 'agent-1', name: 'Support bot' }]);
		});
	});

	describe('markFollowersChanged', () => {
		it('marks the following agents in the caller transaction and returns them', async () => {
			agentSkills.findFollowingAgentIds.mockResolvedValue(['agent-1', 'agent-2']);

			const ids = await service.markFollowersChanged('skill_a', TX_CTX);

			expect(ids).toEqual(['agent-1', 'agent-2']);
			expect(agentSkills.findFollowingAgentIds).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(agents.markFollowerDraftsChanged).toHaveBeenCalledWith(['agent-1', 'agent-2'], TX_CTX);
		});
	});

	describe('refreshAgents', () => {
		it('clears the runtime and pushes an update for every agent', async () => {
			agents.findProjectIdsByIds.mockResolvedValue([
				{ id: 'agent-1', projectId: PROJECT },
				{ id: 'agent-2', projectId: PROJECT },
			]);

			await service.refreshAgents(['agent-1', 'agent-2']);

			expect(clearRuntimes.mock.calls).toEqual([['agent-1'], ['agent-2']]);
			expect(broadcaster.notify).toHaveBeenCalledTimes(2);
			expect(broadcaster.notify).toHaveBeenCalledWith(
				{ projectId: PROJECT, agentId: 'agent-2', source: 'user' },
				undefined,
			);
		});

		it('sends no update push to the tab that saved', async () => {
			agents.findProjectIdsByIds.mockResolvedValue([{ id: 'agent-1', projectId: PROJECT }]);

			await service.refreshAgents(['agent-1'], 'push-ref-1');

			expect(broadcaster.notify).toHaveBeenCalledWith(
				{ projectId: PROJECT, agentId: 'agent-1', source: 'user' },
				'push-ref-1',
			);
		});

		it('does nothing without agents', async () => {
			await service.refreshAgents([]);

			expect(clearRuntimes).not.toHaveBeenCalled();
			expect(agents.findProjectIdsByIds).not.toHaveBeenCalled();
		});
	});
});
