/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests reference unbound methods */
import type { OperationContext } from '@n8n/db';
import { UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { SkillRuntimeService } from '@/modules/skills';

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

describe('AgentSkillUsage', () => {
	const agentSkills = mock<AgentSkillRepository>();
	const agents = mock<AgentRepository>();
	const broadcaster = mock<AgentUpdateBroadcaster>();
	const skillRuntime = mock<SkillRuntimeService>();
	const service = new AgentSkillUsage(agentSkills, agents, skillRuntime, broadcaster);

	beforeEach(() => {
		vi.resetAllMocks();
		agentSkills.findDependencies.mockResolvedValue(new Map());
		agentSkills.findFollowingAgents.mockResolvedValue([]);
		agentSkills.findFollowingAgentIds.mockResolvedValue([]);
		agents.markFollowerDraftsChanged.mockResolvedValue([]);
		agents.findProjectIdsByIds.mockResolvedValue([]);
	});

	describe('findUsage', () => {
		it('names the skill version number that each published agent pins', async () => {
			const agent = { agentName: 'Support bot', projectId: PROJECT };
			agentSkills.findUsage.mockResolvedValue({
				drafts: [],
				pins: [
					{ ...agent, agentId: 'agent-1', skillVersionId: 'skill_a-v2' },
					{ ...agent, agentId: 'agent-2', skillVersionId: null },
					{ ...agent, agentId: 'agent-3', skillVersionId: 'skill_a-gone' },
				],
				hiddenAgents: 1,
			});
			skillRuntime.findVersionNumbers.mockResolvedValue(new Map([['skill_a-v2', 2]]));

			expect(await service.findUsage('skill_a', [PROJECT], TX_CTX)).toEqual({
				drafts: [],
				pins: [
					{ ...agent, agentId: 'agent-1', version: 2 },
					{ ...agent, agentId: 'agent-2', version: null },
					{ ...agent, agentId: 'agent-3', version: null },
				],
				hiddenAgents: 1,
			});
			expect(skillRuntime.findVersionNumbers).toHaveBeenCalledWith(
				['skill_a-v2', 'skill_a-gone'],
				TX_CTX,
			);
		});
	});

	describe('assertRenameKeepsNamesApart', () => {
		function givenFollower(otherName: string | undefined) {
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
			skillRuntime.runtimeNames.mockResolvedValue((ref) =>
				ref.id === 'skill_b' ? otherName : 'Brand voice',
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

		it('names every clashing agent, and skips an agent without dependency rows', async () => {
			agentSkills.findFollowingAgents.mockResolvedValue([
				{ id: 'agent-1', name: 'Sales bot' },
				{ id: 'agent-2', name: 'Support bot' },
				{ id: 'agent-3', name: 'New bot' },
			]);
			const refs = [
				{ skillId: 'skill_a', versionId: null },
				{ skillId: 'skill_b', versionId: 'skill_b-v1' },
			];
			agentSkills.findDependencies.mockResolvedValue(
				new Map([
					['agent-1', refs],
					['agent-2', refs],
				]),
			);
			skillRuntime.runtimeNames.mockResolvedValue((ref) =>
				ref.id === 'skill_b' ? 'Pricing' : undefined,
			);

			await expectError(
				service.assertRenameKeepsNamesApart('skill_a', 'Brand voice', 'pricing', TX_CTX),
				UserError,
				'Cannot rename to "pricing": Sales bot, Support bot already use a skill with a name like that.',
			);
			expect(skillRuntime.runtimeNames).toHaveBeenCalledWith(
				[
					{ id: 'skill_b', versionId: 'skill_b-v1' },
					{ id: 'skill_b', versionId: 'skill_b-v1' },
				],
				TX_CTX,
			);
		});

		it('allows a rename when the other skill has no saved version', async () => {
			givenFollower(undefined);

			await expect(
				service.assertRenameKeepsNamesApart('skill_a', 'Brand voice', 'pricing', TX_CTX),
			).resolves.toBeUndefined();
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
