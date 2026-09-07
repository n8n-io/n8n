/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { AgentCredentialIndexService } from '../agent-credential-index.service';
import type { AgentCredentialDependencyRepository } from '../repositories/agent-credential-dependency.repository';
import type { AgentRepository } from '../repositories/agent.repository';

function makeService(batchSize = 2) {
	const dependencyRepository = mock<AgentCredentialDependencyRepository>();
	const agentRepository = mock<AgentRepository>();
	const workflowsConfig = mock<WorkflowsConfig>({ indexingBatchSize: batchSize });
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const service = new AgentCredentialIndexService(
		dependencyRepository,
		agentRepository,
		logger,
		workflowsConfig,
	);

	return { service, dependencyRepository, agentRepository, logger };
}

describe('AgentCredentialIndexService', () => {
	it('refreshes both sources from current persisted Agent state', async () => {
		const { service, dependencyRepository } = makeService();

		await service.refresh('agent-1');

		expect(dependencyRepository.refreshForAgent).toHaveBeenCalledWith('agent-1');
	});

	it('removes all rows as an idempotent fallback when an agent is deleted', async () => {
		const { service, dependencyRepository } = makeService();

		await service.remove('agent-1');

		expect(dependencyRepository.removeForAgent).toHaveBeenCalledWith('agent-1');
	});

	it('rebuilds every agent in batches and continues after an individual failure', async () => {
		const { service, dependencyRepository, agentRepository, logger } = makeService(2);
		agentRepository.findCredentialIndexAgentIdsBatch
			.mockResolvedValueOnce([{ id: 'agent-a' }, { id: 'agent-b' }])
			.mockResolvedValueOnce([{ id: 'agent-c' }]);
		dependencyRepository.refreshForAgent.mockImplementation(async (agentId) => {
			if (agentId === 'agent-b') throw new Error('transient failure');
		});

		await service.buildIndex();

		expect(agentRepository.findCredentialIndexAgentIdsBatch).toHaveBeenNthCalledWith(1, null, 2);
		expect(agentRepository.findCredentialIndexAgentIdsBatch).toHaveBeenNthCalledWith(
			2,
			'agent-b',
			2,
		);
		expect(dependencyRepository.refreshForAgent).toHaveBeenCalledTimes(3);
		expect(dependencyRepository.refreshForAgent).toHaveBeenCalledWith('agent-c');
		expect(logger.error).toHaveBeenCalledWith('Failed to index agent credential dependencies', {
			agentId: 'agent-b',
			error: expect.any(Error),
		});
	});
});
