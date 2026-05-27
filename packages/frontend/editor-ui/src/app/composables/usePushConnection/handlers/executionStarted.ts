import type { ExecutionStarted } from '@n8n/api-types/push/execution';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { parse } from 'flatted';
import { createRunExecutionData } from 'n8n-workflow';
import type { IRunExecutionData } from 'n8n-workflow';

/**
 * Handles the 'executionStarted' event, which happens when a workflow is executed.
 */
export async function executionStarted({ data }: ExecutionStarted) {
	const workflowsStore = useWorkflowsStore();
	const stateStore = useWorkflowExecutionStateStore(
		createWorkflowExecutionStateId(workflowsStore.workflowId),
	);
	const isIframe = window !== window.parent;

	// In non-iframe context, undefined means "not tracking executions" → skip.
	// In iframe context, executionFinished resets activeExecutionId to undefined,
	// but we still want to accept new executions (re-execution scenario).
	if (typeof stateStore.activeExecutionId === 'undefined' && !isIframe) {
		return;
	}

	// Determine if we need to (re)initialize execution tracking state
	const needsInit =
		stateStore.activeExecutionId === null ||
		typeof stateStore.activeExecutionId === 'undefined' ||
		(isIframe && stateStore.activeExecutionId !== data.executionId);

	if (needsInit) {
		stateStore.promotePendingExecution(data.executionId);
	}

	const executionDataStore = useExecutionDataStore(createExecutionDataId(data.executionId));

	// Initialize or reinitialize execution data to clear previous execution's
	// node status (e.g. DemoLayout iframe receiving push events for a new execution).
	if (!executionDataStore.execution?.data || needsInit) {
		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowsStore.workflowId),
		);

		executionDataStore.setExecution({
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
		} as IRunExecutionData);
	}
}
