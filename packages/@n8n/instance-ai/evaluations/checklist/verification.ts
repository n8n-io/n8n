// ---------------------------------------------------------------------------
// Post-run verification and artifact building
//
// After the instance-ai agent finishes a run, this module extracts the
// outcome from captured SSE events, queries the n8n REST API for full
// details, and builds a human-readable verification artifact that is
// sent to Claude for checklist evaluation.
// ---------------------------------------------------------------------------

import type { N8nClient } from './n8n-client';
import type {
	AgentActivity,
	AgentOutcome,
	CapturedEvent,
	CapturedToolCall,
	ExecutionSummary,
	InstanceAiMetrics,
	WorkflowSummary,
} from './types';

// ---------------------------------------------------------------------------
// Tool names whose results contain resource IDs we need to track
// ---------------------------------------------------------------------------

const WORKFLOW_TOOLS = new Set([
	'build-workflow',
	'submit-workflow',
	'patch-workflow',
	'build-workflow-with-agent',
]);

const EXECUTION_TOOL = 'run-workflow';
const DATA_TABLE_TOOL = 'create-data-table';

// ---------------------------------------------------------------------------
// Type guards for event payloads
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
	const value = obj[key];
	return typeof value === 'string' ? value : undefined;
}

function getRecord(obj: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
	const value = obj[key];
	return isRecord(value) ? value : undefined;
}

// ---------------------------------------------------------------------------
// extractOutcomeFromEvents
// ---------------------------------------------------------------------------

interface EventOutcome {
	workflowIds: string[];
	executionIds: string[];
	dataTableIds: string[];
	finalText: string;
	toolCalls: CapturedToolCall[];
	agentActivities: AgentActivity[];
}

export function extractOutcomeFromEvents(events: CapturedEvent[]): EventOutcome {
	const workflowIds: string[] = [];
	const executionIds: string[] = [];
	const dataTableIds: string[] = [];
	const textChunks: string[] = [];
	const toolCalls: CapturedToolCall[] = [];
	const agentActivities: AgentActivity[] = [];

	// Track in-progress tool calls by toolCallId for duration calculation
	const toolCallStarts = new Map<
		string,
		{ timestamp: number; toolName: string; args: Record<string, unknown> }
	>();

	// Track agent activities by agentId
	const agentMap = new Map<string, AgentActivity>();

	for (const event of events) {
		const { type, data } = event;

		switch (type) {
			case 'text-delta': {
				const text = getString(data, 'text') ?? getString(getRecord(data, 'payload') ?? {}, 'text');
				if (text) {
					textChunks.push(text);
				}
				break;
			}

			case 'tool-call': {
				const payload = getRecord(data, 'payload') ?? data;
				const toolName = getString(payload, 'toolName') ?? '';
				const toolCallId = getString(payload, 'toolCallId') ?? getString(data, 'toolCallId') ?? '';
				const argsRaw = getRecord(payload, 'args');

				toolCallStarts.set(toolCallId || `${event.timestamp}-${toolName}`, {
					timestamp: event.timestamp,
					toolName,
					args: argsRaw ?? {},
				});
				break;
			}

			case 'tool-result': {
				const payload = getRecord(data, 'payload') ?? data;
				const toolName = getString(payload, 'toolName') ?? '';
				const toolCallId = getString(payload, 'toolCallId') ?? getString(data, 'toolCallId') ?? '';
				const result = payload.result ?? data.result;

				const startEntry = toolCallStarts.get(toolCallId || `${event.timestamp}-${toolName}`);
				const durationMs = startEntry ? event.timestamp - startEntry.timestamp : 0;
				const args = startEntry?.args ?? {};

				const toolCall: CapturedToolCall = {
					toolCallId: toolCallId || `auto-${event.timestamp}`,
					toolName,
					args,
					result,
					durationMs,
				};
				toolCalls.push(toolCall);

				// Extract resource IDs from tool results
				extractResourceIds(toolName, result, workflowIds, executionIds, dataTableIds);
				break;
			}

			case 'tool-error': {
				const payload = getRecord(data, 'payload') ?? data;
				const toolName = getString(payload, 'toolName') ?? '';
				const toolCallId = getString(payload, 'toolCallId') ?? getString(data, 'toolCallId') ?? '';
				const errorMsg = getString(payload, 'error') ?? getString(data, 'error') ?? 'Unknown error';

				const startEntry = toolCallStarts.get(toolCallId || `${event.timestamp}-${toolName}`);
				const durationMs = startEntry ? event.timestamp - startEntry.timestamp : 0;
				const args = startEntry?.args ?? {};

				toolCalls.push({
					toolCallId: toolCallId || `auto-${event.timestamp}`,
					toolName,
					args,
					error: errorMsg,
					durationMs,
				});
				break;
			}

			case 'agent-spawned': {
				const payload = getRecord(data, 'payload') ?? data;
				const agentId = getString(data, 'agentId') ?? getString(payload, 'agentId') ?? '';
				const role = getString(payload, 'role') ?? '';
				const parentId = getString(payload, 'parentId');
				const toolsRaw = payload.tools;
				const tools = Array.isArray(toolsRaw)
					? (toolsRaw as unknown[]).filter((t): t is string => typeof t === 'string')
					: [];

				const activity: AgentActivity = {
					agentId,
					role,
					parentId,
					toolCalls: [],
					textContent: '',
					reasoning: '',
					status: 'running',
				};
				agentMap.set(agentId, activity);

				// Store tools info in reasoning for visibility
				if (tools.length > 0) {
					activity.reasoning = `Tools: ${tools.join(', ')}`;
				}
				break;
			}

			case 'agent-completed': {
				const payload = getRecord(data, 'payload') ?? data;
				const agentId = getString(data, 'agentId') ?? getString(payload, 'agentId') ?? '';
				const status = getString(payload, 'status') ?? 'completed';
				const resultText = getString(payload, 'result');

				const activity = agentMap.get(agentId);
				if (activity) {
					activity.status = status;
					if (resultText) {
						activity.textContent = resultText;
					}
				}
				break;
			}

			default:
				// Other event types (run-start, run-finish, confirmation-request, etc.)
				// are not directly needed for outcome extraction
				break;
		}
	}

	// Assign tool calls to their respective agents
	for (const tc of toolCalls) {
		// Find the matching event to get agentId
		const matchingEvent = events.find(
			(e) =>
				(e.type === 'tool-result' || e.type === 'tool-error') &&
				(getString(getRecord(e.data, 'payload') ?? e.data, 'toolCallId') === tc.toolCallId ||
					getString(e.data, 'toolCallId') === tc.toolCallId),
		);
		if (matchingEvent) {
			const agentId = getString(matchingEvent.data, 'agentId') ?? '';
			const activity = agentMap.get(agentId);
			if (activity) {
				activity.toolCalls.push(tc);
			}
		}
	}

	// Convert agent map to array
	for (const activity of agentMap.values()) {
		agentActivities.push(activity);
	}

	return {
		workflowIds: dedupe(workflowIds),
		executionIds: dedupe(executionIds),
		dataTableIds: dedupe(dataTableIds),
		finalText: textChunks.join(''),
		toolCalls,
		agentActivities,
	};
}

// ---------------------------------------------------------------------------
// snapshotWorkflowIds — call before the run to know what existed prior
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

export async function buildAgentOutcome(
	client: N8nClient,
	eventOutcome: EventOutcome,
	preRunWorkflowIds?: Set<string>,
): Promise<AgentOutcome> {
	const workflowsCreated: WorkflowSummary[] = [];
	const workflowJsons: Record<string, unknown>[] = [];
	const executionsRun: ExecutionSummary[] = [];

	// Collect workflow IDs from events
	const knownWfIds = new Set(eventOutcome.workflowIds);

	// Diff against pre-run snapshot to find workflows created by background tasks
	// that didn't surface in the SSE events we parsed
	if (preRunWorkflowIds) {
		try {
			const currentWorkflows = await client.listWorkflows();
			for (const wf of currentWorkflows) {
				if (!preRunWorkflowIds.has(wf.id) && !knownWfIds.has(wf.id)) {
					knownWfIds.add(wf.id);
				}
			}
		} catch {
			// Non-fatal — fall back to event-based IDs only
		}
	}

	// Fetch workflow details
	for (const wfId of knownWfIds) {
		try {
			const wf = await client.getWorkflow(wfId);
			const nodes = Array.isArray(wf.nodes) ? (wf.nodes as unknown[]) : [];
			workflowsCreated.push({
				id: wfId,
				name: typeof wf.name === 'string' ? wf.name : 'Unknown',
				nodeCount: nodes.length,
				active: typeof wf.active === 'boolean' ? wf.active : false,
			});
			workflowJsons.push(wf);
		} catch {
			// Workflow may have been deleted or is inaccessible
			workflowsCreated.push({
				id: wfId,
				name: '(fetch failed)',
				nodeCount: 0,
				active: false,
			});
		}
	}

	// Fetch execution details
	for (const execId of eventOutcome.executionIds) {
		try {
			const executions = await client.listExecutions();
			const match = executions.find((e) => e.id === execId);
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
					status: 'not-found',
				});
			}
		} catch {
			executionsRun.push({
				id: execId,
				workflowId: 'unknown',
				status: 'fetch-failed',
			});
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
// buildMetrics
// ---------------------------------------------------------------------------

export function buildMetrics(events: CapturedEvent[], startTime: number): InstanceAiMetrics {
	let timeToFirstTextMs = 0;
	let timeToRunFinishMs = 0;
	let totalToolCalls = 0;
	let subAgentsSpawned = 0;
	let confirmationRequests = 0;
	const agentActivities: AgentActivity[] = [];

	const agentMap = new Map<string, AgentActivity>();
	let foundFirstText = false;

	for (const event of events) {
		const elapsed = event.timestamp - startTime;

		switch (event.type) {
			case 'text-delta': {
				if (!foundFirstText) {
					timeToFirstTextMs = elapsed;
					foundFirstText = true;
				}
				break;
			}

			case 'tool-call': {
				totalToolCalls++;
				break;
			}

			case 'agent-spawned': {
				subAgentsSpawned++;
				const payload = getRecord(event.data, 'payload') ?? event.data;
				const agentId = getString(event.data, 'agentId') ?? getString(payload, 'agentId') ?? '';
				const role = getString(payload, 'role') ?? '';
				const parentId = getString(payload, 'parentId');

				agentMap.set(agentId, {
					agentId,
					role,
					parentId,
					toolCalls: [],
					textContent: '',
					reasoning: '',
					status: 'running',
				});
				break;
			}

			case 'agent-completed': {
				const payload = getRecord(event.data, 'payload') ?? event.data;
				const agentId = getString(event.data, 'agentId') ?? getString(payload, 'agentId') ?? '';
				const status = getString(payload, 'status') ?? 'completed';
				const activity = agentMap.get(agentId);
				if (activity) {
					activity.status = status;
				}
				break;
			}

			case 'confirmation-request': {
				confirmationRequests++;
				break;
			}

			case 'run-finish': {
				timeToRunFinishMs = elapsed;
				break;
			}

			default:
				break;
		}
	}

	for (const activity of agentMap.values()) {
		agentActivities.push(activity);
	}

	const totalTimeMs = events.length > 0 ? events[events.length - 1].timestamp - startTime : 0;

	return {
		totalTimeMs,
		timeToFirstTextMs,
		timeToRunFinishMs,
		totalToolCalls,
		subAgentsSpawned,
		confirmationRequests,
		agentActivities,
		events,
	};
}

// ---------------------------------------------------------------------------
// buildVerificationArtifact
// ---------------------------------------------------------------------------

export function buildVerificationArtifact(
	outcome: AgentOutcome,
	toolCalls: CapturedToolCall[],
	agentActivities: AgentActivity[],
): string {
	const sections: string[] = [];

	// 1. Agent Text Response
	if (outcome.finalText.trim()) {
		sections.push(formatSection('Agent Text Response', outcome.finalText.trim()));
	}

	// 2. Created Workflows
	if (outcome.workflowsCreated.length > 0) {
		const workflowLines = outcome.workflowsCreated.map((wf) =>
			[
				`- Workflow "${wf.name}" (ID: ${wf.id})`,
				`  Nodes: ${String(wf.nodeCount)}`,
				`  Active: ${String(wf.active)}`,
			].join('\n'),
		);
		sections.push(formatSection('Created Workflows', workflowLines.join('\n\n')));
	}

	// 3. Execution Results
	if (outcome.executionsRun.length > 0) {
		const execLines = outcome.executionsRun.map(
			(exec) => `- Execution ${exec.id} (workflow: ${exec.workflowId}) — Status: ${exec.status}`,
		);
		sections.push(formatSection('Execution Results', execLines.join('\n')));
	}

	// 4. Data Tables
	if (outcome.dataTablesCreated.length > 0) {
		const tableLines = outcome.dataTablesCreated.map((id) => `- Data table ID: ${id}`);
		sections.push(formatSection('Data Tables Created', tableLines.join('\n')));
	}

	// 5. Tool Calls Summary
	if (toolCalls.length > 0) {
		const toolLines = toolCalls.map((tc) => formatToolCall(tc));
		sections.push(formatSection('Tool Calls', toolLines.join('\n\n')));
	}

	// 6. Agent Activities
	if (agentActivities.length > 0) {
		const activityLines = agentActivities.map((activity) => formatAgentActivity(activity));
		sections.push(formatSection('Agent Activities', activityLines.join('\n\n')));
	}

	return sections.join('\n\n---\n\n');
}

// ---------------------------------------------------------------------------
// cleanupEvalArtifacts
// ---------------------------------------------------------------------------

export async function cleanupEvalArtifacts(
	client: N8nClient,
	outcome: AgentOutcome,
): Promise<void> {
	for (const wf of outcome.workflowsCreated) {
		try {
			await client.deleteWorkflow(wf.id);
		} catch {
			// Best-effort cleanup — ignore failures
		}
	}
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractResourceIds(
	toolName: string,
	result: unknown,
	workflowIds: string[],
	executionIds: string[],
	dataTableIds: string[],
): void {
	if (WORKFLOW_TOOLS.has(toolName)) {
		const id = extractIdFromResult(result, 'workflowId', 'id');
		if (id) workflowIds.push(id);
	}

	if (toolName === EXECUTION_TOOL) {
		const id = extractIdFromResult(result, 'executionId', 'id');
		if (id) executionIds.push(id);
	}

	if (toolName === DATA_TABLE_TOOL) {
		const id = extractIdFromResult(result, 'dataTableId', 'id');
		if (id) dataTableIds.push(id);
	}
}

function extractIdFromResult(result: unknown, ...keys: string[]): string | undefined {
	if (!isRecord(result)) {
		// Result might be a stringified JSON
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
		// Some APIs return numeric IDs
		if (typeof value === 'number') {
			return String(value);
		}
	}
	return undefined;
}

function dedupe(arr: string[]): string[] {
	return [...new Set(arr)];
}

function formatSection(title: string, content: string): string {
	return `### ${title}\n\n${content}`;
}

function formatToolCall(tc: CapturedToolCall): string {
	const lines = [`**${tc.toolName}** (${String(tc.durationMs)}ms)`];

	const argsStr = JSON.stringify(tc.args, null, 2);
	if (argsStr !== '{}') {
		lines.push(`Args:\n\`\`\`json\n${argsStr}\n\`\`\``);
	}

	if (tc.error) {
		lines.push(`Error: ${tc.error}`);
	} else if (tc.result !== undefined) {
		const resultStr =
			typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2);
		// Truncate very large results to keep the artifact readable
		const truncated =
			resultStr.length > 2000 ? resultStr.slice(0, 2000) + '\n... (truncated)' : resultStr;
		lines.push(`Result:\n\`\`\`\n${truncated}\n\`\`\``);
	}

	return lines.join('\n');
}

function formatAgentActivity(activity: AgentActivity): string {
	const lines = [
		`**Agent ${activity.agentId}** (role: ${activity.role}, status: ${activity.status})`,
	];

	if (activity.parentId) {
		lines.push(`Parent: ${activity.parentId}`);
	}

	if (activity.reasoning) {
		lines.push(`Reasoning: ${activity.reasoning}`);
	}

	if (activity.toolCalls.length > 0) {
		const toolNames = activity.toolCalls.map((tc) => tc.toolName).join(', ');
		lines.push(`Tool calls: ${toolNames}`);
	}

	if (activity.textContent) {
		const truncated =
			activity.textContent.length > 500
				? activity.textContent.slice(0, 500) + '... (truncated)'
				: activity.textContent;
		lines.push(`Output: ${truncated}`);
	}

	return lines.join('\n');
}
