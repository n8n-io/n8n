import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentJsonConfig } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { AgentRuntimeCacheService } from '../../agent-runtime-cache.service';
import type { Agent } from '../../entities/agent.entity';
import type { AgentRepository } from '../../repositories/agent.repository';
import { SubAgentCleanupService } from '../sub-agent-cleanup.service';

const projectId = 'project-1';
const childAgentId = 'child-1';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: 'parent-1',
		projectId,
		schema: {
			name: 'Parent',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Delegate work',
		} as AgentJsonConfig,
		...overrides,
	} as unknown as Agent;
}

function makeService() {
	const agentRepository = mock<AgentRepository>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();

	agentRepository.save.mockImplementation(async (agent) => agent as Agent);

	const service = new SubAgentCleanupService(mockLogger(), agentRepository, runtimeCacheService);

	return { service, agentRepository, runtimeCacheService };
}

describe('SubAgentCleanupService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('removes the sub-agent reference from a parent that configures it, preserving other refs', async () => {
		const { service, agentRepository, runtimeCacheService } = makeService();
		const parent = makeAgent({
			id: 'parent-1',
			versionId: 'v1',
			activeVersionId: 'v1',
			schema: {
				name: 'Parent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Delegate work',
				subAgents: {
					maxChildren: 5,
					agents: [
						{ agentId: childAgentId, useWhen: 'Use for X' },
						{ agentId: 'other-child', useWhen: 'Use for Y' },
					],
				},
			} as AgentJsonConfig,
		});
		agentRepository.find.mockResolvedValue([parent]);

		await service.removeSubAgentFromParents(childAgentId, projectId);

		expect(agentRepository.find).toHaveBeenCalledWith({ where: { projectId } });
		expect(parent.schema?.subAgents?.agents).toEqual([
			{ agentId: 'other-child', useWhen: 'Use for Y' },
		]);
		expect(parent.schema?.subAgents?.maxChildren).toBe(5);
		// markAgentDraftDirty bumps versionId away from the published version.
		expect(parent.versionId).not.toBe('v1');
		expect(agentRepository.save).toHaveBeenCalledWith(parent);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith('parent-1');
	});

	it('leaves a parent that does not reference the sub-agent untouched', async () => {
		const { service, agentRepository, runtimeCacheService } = makeService();
		const parent = makeAgent({
			id: 'parent-2',
			schema: {
				name: 'Parent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Delegate work',
				subAgents: { agents: [{ agentId: 'other-child' }] },
			} as AgentJsonConfig,
		});
		agentRepository.find.mockResolvedValue([parent]);

		await service.removeSubAgentFromParents(childAgentId, projectId);

		expect(agentRepository.save).not.toHaveBeenCalled();
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
	});

	it('skips the child agent itself and agents with no subAgents config', async () => {
		const { service, agentRepository, runtimeCacheService } = makeService();
		const child = makeAgent({
			id: childAgentId,
			schema: {
				name: 'Child',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'x',
				subAgents: { agents: [{ agentId: childAgentId }] },
			} as AgentJsonConfig,
		});
		const noSubAgents = makeAgent({ id: 'parent-3', schema: null });
		agentRepository.find.mockResolvedValue([child, noSubAgents]);

		await service.removeSubAgentFromParents(childAgentId, projectId);

		expect(agentRepository.save).not.toHaveBeenCalled();
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
	});

	it('updates every matching parent when multiple agents reference the sub-agent', async () => {
		const { service, agentRepository, runtimeCacheService } = makeService();
		const parentA = makeAgent({
			id: 'parent-a',
			schema: {
				name: 'Parent A',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'x',
				subAgents: { agents: [{ agentId: childAgentId }] },
			} as AgentJsonConfig,
		});
		const parentB = makeAgent({
			id: 'parent-b',
			schema: {
				name: 'Parent B',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'x',
				subAgents: { agents: [{ agentId: childAgentId }] },
			} as AgentJsonConfig,
		});
		agentRepository.find.mockResolvedValue([parentA, parentB]);

		await service.removeSubAgentFromParents(childAgentId, projectId);

		expect(agentRepository.save).toHaveBeenCalledTimes(2);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith('parent-a');
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith('parent-b');
	});
});
