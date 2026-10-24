/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests reference unbound methods */
import type { OperationContext } from '@n8n/db';
import { UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { SkillFile } from '@/modules/skills/database/entities/skill-file.entity';
import type { SkillVersion } from '@/modules/skills/database/entities/skill-version.entity';
import type { Skill } from '@/modules/skills/database/entities/skill.entity';
import type { SkillRepository } from '@/modules/skills/database/repositories/skill.repository';
import type { ResolvedSkillRow } from '@/modules/skills/utils/skill-content';
import { SkillRuntimeService } from '@/modules/skills/services/skill-runtime.service';

import { AgentSkillUsage } from '../agent-skill-usage';
import type { AgentUpdateBroadcaster } from '../agent-update-broadcaster';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSkillRepository } from '../repositories/agent-skill.repository';

const clearRuntimes = vi.fn();
vi.mock('../agent-runtime-cache.service', () => ({ AgentRuntimeCacheService: class {} }));
vi.mock('@n8n/di', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/di')>();
	return {
		...actual,
		Container: { ...actual.Container, get: vi.fn(() => ({ clearRuntimes })) },
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

describe('AgentSkillUsage', () => {
	const skills = mock<SkillRepository>();
	const agentSkills = mock<AgentSkillRepository>();
	const agents = mock<AgentRepository>();
	const broadcaster = mock<AgentUpdateBroadcaster>();
	// A real SkillRuntimeService, so the names that agents see come from the mocked rows.
	const skillRuntime = new SkillRuntimeService(skills, mock(), mock());
	const service = new AgentSkillUsage(agentSkills, agents, skillRuntime, broadcaster);

	beforeEach(() => {
		vi.resetAllMocks();
		skills.findLatestSaved.mockResolvedValue(new Map());
		skills.findVersionsByIds.mockResolvedValue(new Map());
		skills.findByIds.mockResolvedValue([]);
		agentSkills.findDependencies.mockResolvedValue(new Map());
		agentSkills.findFollowingAgents.mockResolvedValue([]);
		agentSkills.findFollowingAgentIds.mockResolvedValue([]);
		agents.markDraftChangedIfInSync.mockResolvedValue([]);
		agents.findProjectIdsByIds.mockResolvedValue([]);
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

	describe('markFollowersChanged', () => {
		it('marks the following agents in the caller transaction and returns them', async () => {
			agentSkills.findFollowingAgentIds.mockResolvedValue(['agent-1', 'agent-2']);

			const ids = await service.markFollowersChanged('skill_a', TX_CTX);

			expect(ids).toEqual(['agent-1', 'agent-2']);
			expect(agentSkills.findFollowingAgentIds).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(agents.markDraftChangedIfInSync).toHaveBeenCalledWith(['agent-1', 'agent-2'], TX_CTX);
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
