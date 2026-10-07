/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { AgentDependencyIndexService } from '../agent-dependency-index.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import type { AgentCredentialDependencyRepository } from '../repositories/agent-credential-dependency.repository';
import type { AgentWorkflowDependencyRepository } from '../repositories/agent-workflow-dependency.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { SkillHubService } from '../skills-hub/skill-hub.service';

function makeService(batchSize = 2) {
	const dependencyRepository = mock<AgentCredentialDependencyRepository>();
	const workflowDependencyRepository = mock<AgentWorkflowDependencyRepository>();
	const agentRepository = mock<AgentRepository>();
	const skillHub = mock<SkillHubService>();
	const workflowsConfig = mock<WorkflowsConfig>({ indexingBatchSize: batchSize });
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const service = new AgentDependencyIndexService(
		dependencyRepository,
		workflowDependencyRepository,
		agentRepository,
		mock<AgentRuntimeCacheService>(),
		skillHub,
		logger,
		workflowsConfig,
	);

	return {
		service,
		dependencyRepository,
		workflowDependencyRepository,
		agentRepository,
		skillHub,
		logger,
	};
}

describe('AgentDependencyIndexService', () => {
	it('refreshes every source from current persisted Agent state', async () => {
		const {
			service,
			dependencyRepository,
			workflowDependencyRepository,
			agentRepository,
			skillHub,
		} = makeService();
		const agent = { id: 'agent-1' } as Agent;
		agentRepository.findByIdForDraftWrite.mockResolvedValue(agent);

		await service.refresh('agent-1');

		expect(dependencyRepository.refreshForAgent).toHaveBeenCalledWith('agent-1');
		expect(workflowDependencyRepository.refreshForAgent).toHaveBeenCalledWith('agent-1');
		expect(skillHub.refreshDependencies).toHaveBeenCalledWith(agent);
	});

	it('skips the skill dependency refresh when the agent no longer exists', async () => {
		const { service, agentRepository, skillHub } = makeService();
		agentRepository.findByIdForDraftWrite.mockResolvedValue(null);

		await service.refresh('agent-1');

		expect(skillHub.refreshDependencies).not.toHaveBeenCalled();
	});

	it('removes all rows as an idempotent fallback when an agent is deleted', async () => {
		const { service, dependencyRepository, workflowDependencyRepository } = makeService();

		await service.remove('agent-1');

		expect(dependencyRepository.removeForAgent).toHaveBeenCalledWith('agent-1');
		expect(workflowDependencyRepository.removeForAgent).toHaveBeenCalledWith('agent-1');
	});

	it('rebuilds every agent in batches and continues after an individual failure', async () => {
		const { service, dependencyRepository, agentRepository, logger } = makeService(2);
		agentRepository.findDependencyIndexAgentIdsBatch
			.mockResolvedValueOnce([{ id: 'agent-a' }, { id: 'agent-b' }])
			.mockResolvedValueOnce([{ id: 'agent-c' }]);
		dependencyRepository.refreshForAgent.mockImplementation(async (agentId) => {
			if (agentId === 'agent-b') throw new Error('transient failure');
		});

		await service.buildIndex();

		expect(agentRepository.findDependencyIndexAgentIdsBatch).toHaveBeenNthCalledWith(1, null, 2);
		expect(agentRepository.findDependencyIndexAgentIdsBatch).toHaveBeenNthCalledWith(
			2,
			'agent-b',
			2,
		);
		expect(dependencyRepository.refreshForAgent).toHaveBeenCalledTimes(3);
		expect(dependencyRepository.refreshForAgent).toHaveBeenCalledWith('agent-c');
		expect(logger.error).toHaveBeenCalledWith('Failed to index agent dependencies', {
			agentId: 'agent-b',
			error: expect.any(Error),
		});
	});
});
