import type { ExecutionStarted } from '@n8n/api-types/push/execution';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
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
	const workflowDocumentStore = options.workflowState.getCurrentWorkflowDocumentStore();
	const isIframe = window !== window.parent;

	// In non-iframe context, undefined means "not tracking executions" → skip.
	// In iframe context, executionFinished resets activeExecutionId to undefined,
	// but we still want to accept new executions (re-execution scenario).
	if (typeof workflowDocumentStore?.activeExecutionId === 'undefined' && !isIframe) {
		return;
	}

	// Determine if we need to (re)initialize execution tracking state
	const needsInit =
		workflowDocumentStore?.activeExecutionId === null ||
		typeof workflowDocumentStore?.activeExecutionId === 'undefined' ||
		(isIframe && workflowDocumentStore.activeExecutionId !== data.executionId);

	if (needsInit) {
		options.workflowState.setActiveExecutionId(data.executionId);
	}

	// Initialize or reinitialize execution to clear previous execution's
	// node status (e.g. DemoLayout iframe receiving push events for a new execution).
	if (!workflowDocumentStore?.execution?.data || needsInit) {
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

	if (workflowDocumentStore?.execution?.data && data.flattedRunData) {
		workflowDocumentStore.setExecutionRunData({
			...workflowDocumentStore.execution.data,
			resultData: {
				...workflowDocumentStore.execution.data.resultData,
				runData: parse(data.flattedRunData),
			},
		});
	}
}
