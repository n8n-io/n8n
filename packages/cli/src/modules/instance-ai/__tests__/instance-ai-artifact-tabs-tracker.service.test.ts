import type { InstanceAiEvent } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { DataTable } from '@/modules/data-table/data-table.entity';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';

import type { InProcessEventBus, PublishObserver } from '../event-bus/in-process-event-bus';
import { InstanceAiArtifactTabsTracker } from '../instance-ai-artifact-tabs-tracker.service';
import type { InstanceAiThreadTabsService } from '../instance-ai-thread-tabs.service';
import type { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';

const THREAD_ID = 'thread-1';
const USER_ID = 'user-1';

function toolCall(toolCallId: string, toolName: string, args: Record<string, unknown> = {}) {
	return {
		type: 'tool-call',
		runId: 'run-1',
		agentId: 'agent-001',
		payload: { toolCallId, toolName, args },
	} satisfies InstanceAiEvent;
}

function toolResult(toolCallId: string, result: unknown) {
	return {
		type: 'tool-result',
		runId: 'run-1',
		agentId: 'agent-001',
		payload: { toolCallId, result },
	} satisfies InstanceAiEvent;
}

describe('InstanceAiArtifactTabsTracker', () => {
	const logger = mock<Logger>();
	const eventBus = mock<InProcessEventBus>();
	const threadRepository = mock<InstanceAiThreadRepository>();
	const threadTabsService = mock<InstanceAiThreadTabsService>();
	const workflowRepository = mock<WorkflowRepository>();
	const dataTableRepository = mock<DataTableRepository>();
	let tracker: InstanceAiArtifactTabsTracker;
	let observer: PublishObserver;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		threadRepository.findResourceId.mockResolvedValue(USER_ID);
		workflowRepository.findByIds.mockResolvedValue([]);
		dataTableRepository.findSummariesByIds.mockResolvedValue([]);
		tracker = new InstanceAiArtifactTabsTracker(
			logger,
			eventBus,
			threadRepository,
			threadTabsService,
			workflowRepository,
			dataTableRepository,
		);
		observer = eventBus.observePublished.mock.calls[0][0];
	});

	it('opens the tab of a workflow that a tool call built, with its current name', async () => {
		workflowRepository.findByIds.mockResolvedValue([
			mock<WorkflowEntity>({ id: 'wf-1', name: 'Current name' }),
		]);

		observer(THREAD_ID, toolCall('call-1', 'build-workflow'));
		observer(
			THREAD_ID,
			toolResult('call-1', { success: true, workflowId: 'wf-1', workflowName: 'Old' }),
		);
		await tracker.flush(THREAD_ID);

		expect(threadTabsService.showArtifactTab).toHaveBeenCalledWith(THREAD_ID, USER_ID, {
			type: 'workflow',
			id: 'wf-1',
			name: 'Current name',
		});
	});

	it('opens the tab of a data table with the project of the table', async () => {
		dataTableRepository.findSummariesByIds.mockResolvedValue([
			mock<DataTable>({ id: 'dt-1', name: 'Leads', projectId: 'project-1' }),
		]);

		observer(
			THREAD_ID,
			toolCall('call-1', 'data-tables', { action: 'insert-rows', dataTableId: 'dt-1' }),
		);
		observer(THREAD_ID, toolResult('call-1', { insertedCount: 1 }));
		await tracker.flush(THREAD_ID);

		expect(threadTabsService.showArtifactTab).toHaveBeenCalledWith(THREAD_ID, USER_ID, {
			type: 'data-table',
			id: 'dt-1',
			name: 'Leads',
			projectId: 'project-1',
		});
	});

	it('does nothing for a tool call that does not change an artifact', async () => {
		observer(THREAD_ID, toolCall('call-1', 'workflows', { action: 'get', workflowId: 'wf-1' }));
		observer(THREAD_ID, toolResult('call-1', { success: true }));
		observer(THREAD_ID, toolCall('call-2', 'executions', { action: 'run', workflowId: 'wf-1' }));
		observer(THREAD_ID, toolResult('call-2', { success: true }));
		await tracker.flush(THREAD_ID);

		expect(threadTabsService.showArtifactTab).not.toHaveBeenCalled();
	});

	it('does nothing for a tool call that failed', async () => {
		observer(THREAD_ID, toolCall('call-1', 'build-workflow'));
		observer(THREAD_ID, {
			type: 'tool-error',
			runId: 'run-1',
			agentId: 'agent-001',
			payload: { toolCallId: 'call-1', error: 'Build failed' },
		});
		observer(THREAD_ID, toolResult('call-1', { success: true, workflowId: 'wf-1' }));
		await tracker.flush(THREAD_ID);

		expect(threadTabsService.showArtifactTab).not.toHaveBeenCalled();
	});

	it('does nothing when the thread does not exist', async () => {
		threadRepository.findResourceId.mockResolvedValue(null);

		observer(THREAD_ID, toolCall('call-1', 'build-workflow'));
		observer(THREAD_ID, toolResult('call-1', { success: true, workflowId: 'wf-1' }));
		await tracker.flush(THREAD_ID);

		expect(threadTabsService.showArtifactTab).not.toHaveBeenCalled();
	});

	it('writes the tabs of one thread in order, and continues after a failed write', async () => {
		threadTabsService.showArtifactTab.mockRejectedValueOnce(new Error('DB down'));

		observer(THREAD_ID, toolCall('call-1', 'build-workflow'));
		observer(THREAD_ID, toolCall('call-2', 'build-workflow'));
		observer(THREAD_ID, toolResult('call-1', { success: true, workflowId: 'wf-1' }));
		observer(THREAD_ID, toolResult('call-2', { success: true, workflowId: 'wf-2' }));
		await tracker.flush(THREAD_ID);

		expect(threadTabsService.showArtifactTab.mock.calls.map(([, , tab]) => tab.id)).toEqual([
			'wf-1',
			'wf-2',
		]);
		expect(logger.warn).toHaveBeenCalledTimes(1);
	});
});
