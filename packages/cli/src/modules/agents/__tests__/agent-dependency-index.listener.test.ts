/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { EventService } from '@/events/event.service';

import { AgentDependencyIndexListener } from '../agent-dependency-index.listener';
import { AgentDependencyIndexService } from '../agent-dependency-index.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import type { AgentCredentialDependencyRepository } from '../repositories/agent-credential-dependency.repository';
import type { AgentWorkflowDependencyRepository } from '../repositories/agent-workflow-dependency.repository';
import type { AgentRepository } from '../repositories/agent.repository';

describe('AgentDependencyIndexListener', () => {
	const eventService = new EventService();
	const workflowDependencyRepository = mock<AgentWorkflowDependencyRepository>();
	const runtimeCache = mock<AgentRuntimeCacheService>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const indexService = new AgentDependencyIndexService(
		mock<AgentCredentialDependencyRepository>(),
		workflowDependencyRepository,
		mock<AgentRepository>(),
		runtimeCache,
		logger,
		mock<WorkflowsConfig>({ indexingBatchSize: 2 }),
	);
	new AgentDependencyIndexListener(logger, eventService, indexService).init();

	const workflowEvents = [
		'workflow-saved',
		'workflow-activated',
		'workflow-deactivated',
		'workflow-archived',
		'workflow-unarchived',
		'workflow-published-version-changed',
	] as const;

	const emitWorkflowEvent = (eventName: (typeof workflowEvents)[number]) => {
		const payload =
			eventName === 'workflow-saved' ? { workflow: { id: 'wf-1' } } : { workflowId: 'wf-1' };
		// The listener reads only the workflow id; the rest of each payload is irrelevant here.
		eventService.emit(eventName, payload as never);
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each(workflowEvents)(
		'clears the runtimes of every dependent agent on %s',
		async (eventName) => {
			workflowDependencyRepository.findByWorkflowIds.mockResolvedValue([
				{ agentId: 'agent-a', workflowId: 'wf-1' },
				{ agentId: 'agent-b', workflowId: 'wf-1' },
			]);

			emitWorkflowEvent(eventName);
			await new Promise(setImmediate);

			expect(workflowDependencyRepository.findByWorkflowIds).toHaveBeenCalledWith(['wf-1']);
			expect(runtimeCache.clearRuntimes).toHaveBeenCalledWith('agent-a');
			expect(runtimeCache.clearRuntimes).toHaveBeenCalledWith('agent-b');
		},
	);

	it('logs and swallows a failing dependency lookup', async () => {
		workflowDependencyRepository.findByWorkflowIds.mockRejectedValue(new Error('db down'));

		emitWorkflowEvent('workflow-activated');
		await new Promise(setImmediate);

		expect(logger.error).toHaveBeenCalledWith('Failed to invalidate dependent agent runtimes', {
			error: expect.any(Error),
		});
		expect(runtimeCache.clearRuntimes).not.toHaveBeenCalled();
	});
});
