import type { OperationContext } from '@n8n/db';
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

// What the store answers is covered by the contract cases in
// agent-skill-usage.integration.test.ts. These tests cover the side effects.
describe('AgentSkillUsage', () => {
	const agentSkills = mock<AgentSkillRepository>();
	const agents = mock<AgentRepository>();
	const broadcaster = mock<AgentUpdateBroadcaster>();
	const skillRuntime = mock<SkillRuntimeService>();
	const service = new AgentSkillUsage(agentSkills, agents, skillRuntime, broadcaster);

	beforeEach(() => {
		vi.resetAllMocks();
		agentSkills.findFollowingAgentIds.mockResolvedValue([]);
		agents.markDraftChangedIfInSync.mockResolvedValue([]);
		agents.findProjectIdsByIds.mockResolvedValue([]);
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
