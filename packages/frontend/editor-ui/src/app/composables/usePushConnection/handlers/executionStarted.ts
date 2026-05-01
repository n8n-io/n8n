import type { ExecutionStarted } from '@n8n/api-types/push/execution';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowExecutionSessionId,
	useWorkflowExecutionSessionStore,
} from '@/app/stores/workflowExecutionSession.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { parse } from 'flatted';
import { createRunExecutionData } from 'n8n-workflow';
import type { WorkflowState } from '@/app/composables/useWorkflowState';

/**
 * Handles the 'executionStarted' event, which happens when a workflow is executed.
 */
export async function executionStarted(
	{ data }: ExecutionStarted,
	options: { workflowState: WorkflowState },
) {
	const workflowsStore = useWorkflowsStore();
	const workflowExecutionSession = useWorkflowExecutionSessionStore(
		createWorkflowExecutionSessionId(workflowsStore.workflowId || data.workflowId || ''),
	);
	const isIframe = window !== window.parent;

	const activeExecutionId = workflowExecutionSession.activeExecutionId;

	// In non-iframe context, undefined means "not tracking executions" → skip.
	// In iframe context, executionFinished resets activeExecutionId to undefined,
	// but we still want to accept new executions (re-execution scenario).
	if (typeof activeExecutionId === 'undefined' && !isIframe) {
		return;
	}

	// Determine if we need to (re)initialize execution tracking state
	const needsInit =
		activeExecutionId === null ||
		typeof activeExecutionId === 'undefined' ||
		(isIframe && activeExecutionId !== data.executionId);

	if (needsInit) {
		options.workflowState.setActiveExecutionId(data.executionId);
	}

	const executionDataStore = useExecutionDataStore(createExecutionDataId(data.executionId));
	const pendingExecution = workflowExecutionSession.pendingExecution;
	if (pendingExecution) {
		workflowExecutionSession.promotePendingExecution(data.executionId);
	}

	// Initialize or reinitialize workflowExecutionData to clear previous execution's
	// node status (e.g. DemoLayout iframe receiving push events for a new execution).
	if (needsInit && !executionDataStore.execution?.data && !pendingExecution) {
		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowsStore.workflowId || data.workflowId || ''),
		);

		options.workflowState.setWorkflowExecutionData({
			id: data.executionId,
			finished: false,
			mode: 'manual',
			status: 'running',
			createdAt: new Date(),
			startedAt: new Date(),
			workflowData: workflowDocumentStore.getSnapshot(),
			data: createRunExecutionData(),
		});
	}

	if (executionDataStore.execution?.data && data.flattedRunData) {
		executionDataStore.setExecutionRunData({
			...executionDataStore.execution.data,
			resultData: {
				...executionDataStore.execution.data.resultData,
				runData: parse(data.flattedRunData),
			},
		});
	}
}
