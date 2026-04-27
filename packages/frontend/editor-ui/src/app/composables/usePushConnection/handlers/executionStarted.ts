import type { ExecutionStarted } from '@n8n/api-types/push/execution';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { parse } from 'flatted';
import { createRunExecutionData } from 'n8n-workflow';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { useExecutionDataStore } from '@/app/stores/executionData.store';

/**
 * Handles the 'executionStarted' event, which happens when a workflow is executed.
 */
export async function executionStarted(
	{ data }: ExecutionStarted,
	options: { workflowState: WorkflowState },
) {
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = options.workflowState.getCurrentWorkflowDocumentStore();
	const workflowExecutionSessionStore =
		options.workflowState.getCurrentWorkflowExecutionSessionStore();
	const isIframe = window !== window.parent;

	// In non-iframe context, undefined means "not tracking executions" → skip.
	// In iframe context, executionFinished resets activeExecutionId to undefined,
	// but we still want to accept new executions (re-execution scenario).
	if (typeof workflowExecutionSessionStore?.activeExecutionId === 'undefined' && !isIframe) {
		return;
	}

	// Determine if we need to (re)initialize execution tracking state
	const needsInit =
		workflowExecutionSessionStore?.activeExecutionId === null ||
		typeof workflowExecutionSessionStore?.activeExecutionId === 'undefined' ||
		(isIframe && workflowExecutionSessionStore.activeExecutionId !== data.executionId);

	if (needsInit) {
		options.workflowState.setActiveExecutionId(data.executionId);
	}

	const executionDataStore = useExecutionDataStore(data.executionId);

	// Initialize or reinitialize execution to clear previous execution's
	// node status (e.g. DemoLayout iframe receiving push events for a new execution).
	if (!executionDataStore.execution?.data) {
		const wf = workflowsStore.workflow;
		options.workflowState.setExecution({
			id: data.executionId,
			finished: false,
			mode: 'manual',
			status: 'running',
			createdAt: new Date(),
			startedAt: new Date(),
			workflowData: {
				id: workflowDocumentStore?.workflowId ?? wf.id,
				name: workflowDocumentStore?.name ?? '',
				active: wf.active,
				isArchived: wf.isArchived,
				nodes: wf.nodes,
				connections: wf.connections,
				createdAt: wf.createdAt,
				updatedAt: wf.updatedAt,
				versionId: wf.versionId ?? '',
				activeVersionId: wf.activeVersionId ?? null,
			},
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
