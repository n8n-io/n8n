// ---------------------------------------------------------------------------
// Workflow discovery: snapshot IDs, build agent outcome, extract IDs from messages
// ---------------------------------------------------------------------------

import type { InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import { N8nApiError, type N8nClient, type WorkflowResponse } from '../clients/n8n-client';
import type { AgentOutcome, EventOutcome, ExecutionSummary, WorkflowSummary } from '../types';

// ---------------------------------------------------------------------------
// Tool names whose results contain workflow IDs
// ---------------------------------------------------------------------------

const WORKFLOW_TOOLS = new Set(['build-workflow', 'submit-workflow', 'patch-workflow']);

// ---------------------------------------------------------------------------
// snapshotWorkflowIds -- call before the run to know what existed prior
// ---------------------------------------------------------------------------

export async function snapshotWorkflowIds(client: N8nClient): Promise<Set<string>> {
	try {
		const workflows = await client.listWorkflows();
		return new Set(workflows.map((wf) => wf.id));
	} catch {
		return new Set();
	}
}

// ---------------------------------------------------------------------------
// buildAgentOutcome
// ---------------------------------------------------------------------------

export interface BuildAgentOutcomeOptions {
	/**
	 * Last-resort workflow discovery by diffing all workflows visible to the
	 * lane. This is unsafe under concurrent eval builds because an unrelated
	 * run can create a workflow while the current thread produces no IDs.
	 */
	allowListDiffFallback?: boolean;
	/** Logs discovery decisions (dropped phantom ids, deferred fetch-failure stubs). */
	logger?: { warn(message: string): void };
}

export async function buildAgentOutcome(
	client: N8nClient,
	eventOutcome: EventOutcome,
	preRunWorkflowIds?: Set<string>,
	claimedWorkflowIds?: Set<string>,
	options: BuildAgentOutcomeOptions = {},
): Promise<AgentOutcome> {
	const workflowsCreated: WorkflowSummary[] = [];
	const workflowJsons: WorkflowResponse[] = [];
	const executionsRun: ExecutionSummary[] = [];

	// Collect workflow IDs from events
	const knownWfIds = new Set(eventOutcome.workflowIds);

	// Mark event-based workflow IDs as claimed so concurrent runs skip them
	if (claimedWorkflowIds) {
		for (const id of knownWfIds) {
			claimedWorkflowIds.add(id);
		}
	}

	// Diff against pre-run snapshot to find workflows created by background tasks
	// that didn't surface in the SSE events/messages we parsed. This is a
	// single-thread fallback only: in concurrent evals a blocked/no-build thread
	// can otherwise claim a workflow created by another test case.
	if (preRunWorkflowIds && knownWfIds.size === 0 && options.allowListDiffFallback === true) {
		try {
			const currentWorkflows = await client.listWorkflows();
			for (const wf of currentWorkflows) {
				if (
					!preRunWorkflowIds.has(wf.id) &&
					!knownWfIds.has(wf.id) &&
					!claimedWorkflowIds?.has(wf.id)
				) {
					knownWfIds.add(wf.id);
					claimedWorkflowIds?.add(wf.id);
				}
			}
		} catch {
			// Non-fatal -- fall back to event-based IDs only
		}
	}

	// Fetch workflow details. Candidate ids come from tool results and agent
	// trees, which echo agent-INVENTED ids too (e.g. a failed build-workflow
	// bind to a made-up id) — a 404/403 means no workflow ever carried the id,
	// so drop it instead of recording a stub: a stub at index 0 becomes
	// build.workflowId and every scenario then executes a nonexistent workflow.
	// Transport-level fetch failures keep a stub, ordered after real workflows.
	const fetchFailedStubs: WorkflowSummary[] = [];
	for (const wfId of knownWfIds) {
		try {
			const wf = await client.getWorkflow(wfId);
			workflowsCreated.push({
				id: wfId,
				name: wf.name,
				nodeCount: wf.nodes.length,
				active: wf.active,
			});
			workflowJsons.push(wf);
		} catch (error) {
			if (error instanceof N8nApiError && (error.status === 404 || error.status === 403)) {
				options.logger?.warn(
					`  Discovery: dropping phantom workflow id "${wfId}" (fetch returned ${String(error.status)})`,
				);
				continue;
			}
			fetchFailedStubs.push({
				id: wfId,
				name: '(fetch failed)',
				nodeCount: 0,
				active: false,
			});
		}
	}
	workflowsCreated.push(...fetchFailedStubs);

	// Fetch execution details (one listing for all ids)
	if (eventOutcome.executionIds.length > 0) {
		let executions: Awaited<ReturnType<typeof client.listExecutions>> | undefined;
		try {
			executions = await client.listExecutions();
		} catch {
			executions = undefined;
		}
		for (const execId of eventOutcome.executionIds) {
			const match = executions?.find((e) => e.id === execId);
			if (match) {
				executionsRun.push({
					id: match.id,
					workflowId: match.workflowId,
					status: match.status,
				});
			} else {
				executionsRun.push({
					id: execId,
					workflowId: 'unknown',
					status: executions ? 'not-found' : 'fetch-failed',
				});
			}
		}
	}

	return {
		workflowsCreated,
		executionsRun,
		dataTablesCreated: eventOutcome.dataTableIds,
		finalText: eventOutcome.finalText,
		workflowJsons,
	};
}

// ---------------------------------------------------------------------------
// extractWorkflowIdsFromMessages
//
// Extracts workflow IDs from agent tree targetResource fields AND from
// tool call results (build-workflow, submit-workflow, etc.).
// Thread-scoped -- avoids cross-run workflow attribution.
// ---------------------------------------------------------------------------

export function extractWorkflowIdsFromMessages(messages: InstanceAiMessage[]): string[] {
	const ids = new Set<string>();

	for (const message of messages) {
		if (message.role === 'assistant' && message.agentTree) {
			collectWorkflowIds(message.agentTree, ids);
		}
	}

	return [...ids];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function collectWorkflowIds(node: InstanceAiAgentNode, ids: Set<string>): void {
	if (node.targetResource?.type === 'workflow' && node.targetResource.id) {
		ids.add(node.targetResource.id);
	}

	// Extract workflow IDs from tool call results
	for (const tc of node.toolCalls) {
		if (WORKFLOW_TOOLS.has(tc.toolName)) {
			const id = extractIdFromResult(tc.result);
			if (id) ids.add(id);
		}
	}

	for (const child of node.children) {
		collectWorkflowIds(child, ids);
	}
}

function extractIdFromResult(result: unknown): string | undefined {
	const keys = ['workflowId', 'id'];

	if (!isRecord(result)) {
		if (typeof result === 'string') {
			try {
				const parsed: unknown = JSON.parse(result);
				if (isRecord(parsed)) {
					return extractIdFromRecord(parsed, keys);
				}
			} catch {
				return undefined;
			}
		}
		return undefined;
	}
	return extractIdFromRecord(result, keys);
}

function extractIdFromRecord(record: Record<string, unknown>, keys: string[]): string | undefined {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === 'string' && value.length > 0) {
			return value;
		}
		if (typeof value === 'number') {
			return String(value);
		}
	}
	return undefined;
}
