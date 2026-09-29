import type { ExecutionStarted, SubExecutionParent } from '@n8n/api-types/push/execution';
import { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { parse } from 'flatted';
import { createRunExecutionData } from 'n8n-workflow';
import type { IRunExecutionData } from 'n8n-workflow';
import type { IWorkflowDb } from '@/Interface';
import type { PushHandlerOptions } from './types';

/**
 * Registers a starting sub-workflow execution and seeds its data store so its
 * node events have somewhere to land. Seeded with the canvas's node snapshot for
 * a workflow calling itself, which is what lets the canvas mirror it; any other
 * sub-workflow carries run data only and the log view resolves its graph itself.
 */
function startSubExecution(
	data: ExecutionStarted['data'],
	parent: SubExecutionParent,
	documentId: PushHandlerOptions['documentId'],
) {
	const workflowDocumentStore = useWorkflowDocumentStore(documentId);
	const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);

	const registered = workflowExecutionStateStore.registerSubExecution({
		executionId: data.executionId,
		workflowId: data.workflowId,
		parentExecutionId: parent.executionId,
		parentNodeName: parent.nodeName,
		parentNodeRunIndex: parent.runIndex,
	});
	if (!registered) return;

	const isSameWorkflow = data.workflowId === workflowDocumentStore.workflowId;
	const workflowData: IWorkflowDb = isSameWorkflow
		? workflowDocumentStore.getSnapshot()
		: {
				id: data.workflowId,
				name: data.workflowName ?? '',
				nodes: [],
				connections: {},
				active: false,
				isArchived: false,
				createdAt: Date.now(),
				updatedAt: Date.now(),
				versionId: '',
				activeVersionId: null,
			};

	useExecutionDataStore(createExecutionDataId(data.executionId)).setExecution({
		id: data.executionId,
		finished: false,
		mode: data.mode,
		status: 'running',
		createdAt: new Date(),
		startedAt: new Date(data.startedAt),
		workflowData,
		data: createRunExecutionData(),
	});
}

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

	// Its own execution, so it gets its own data store rather than the
	// pending/active slots — and must skip the checks below, which exist to stop
	// another workflow's execution from hijacking those slots.
	if (data.parent) {
		startSubExecution(data, data.parent, documentId);
		return;
	}

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
