import type { ExecutionStarted } from '@n8n/api-types/push/execution';
import { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { parse } from 'flatted';
import { createRunExecutionData } from 'n8n-workflow';
import type { IRunExecutionData } from 'n8n-workflow';
import type { PushHandlerOptions } from './types';

/**
 * Handles the 'executionStarted' event, which happens when a workflow is executed.
 */
export async function executionStarted(
	{ data }: ExecutionStarted,
	{ documentId }: PushHandlerOptions,
) {
	const workflowDocumentStore = useWorkflowDocumentStore(documentId);
	const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);
	const isIframe = window !== window.parent;

	// A single push connection serves the active document, so a concurrent
	// execution of a *different* workflow (e.g. a scheduled run firing while this
	// document has a pending run) would otherwise hijack this document's pending
	// (null) execution slot. Reject events for another workflow. The iframe/demo
	// path is exempt: it only ever receives events relayed for the workflow it
	// previews, and its document id may not carry a comparable workflow id.
	if (!isIframe && data.workflowId !== workflowExecutionStateStore.workflowId) {
		return;
	}

	// In non-iframe context, undefined means "not tracking executions" → skip.
	// In iframe context, executionFinished resets activeExecutionId to undefined,
	// but we still want to accept new executions (re-execution scenario).
	if (typeof workflowExecutionStateStore.activeExecutionId === 'undefined' && !isIframe) {
		return;
	}

	// Determine if we need to (re)initialize execution tracking state
	const needsInit =
		workflowExecutionStateStore.activeExecutionId === null ||
		typeof workflowExecutionStateStore.activeExecutionId === 'undefined' ||
		(isIframe && workflowExecutionStateStore.activeExecutionId !== data.executionId);

	if (needsInit) {
		workflowExecutionStateStore.promotePendingExecution(data.executionId);
	}

	const executionDataStore = useExecutionDataStore(createExecutionDataId(data.executionId));

	// Initialize or reinitialize execution data to clear previous execution's
	// node status (e.g. DemoLayout iframe receiving push events for a new execution).
	if (!executionDataStore.execution?.data || needsInit) {
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
