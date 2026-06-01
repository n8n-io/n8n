// ---------------------------------------------------------------------------
// Event parsing: extract outcome and metrics from captured SSE events
// ---------------------------------------------------------------------------

import type {
	AgentActivity,
	CapturedEvent,
	CapturedToolCall,
	ConversationMetrics,
	EventOutcome,
	InstanceAiMetrics,
	TurnCounter,
} from '../types';
import { getNestedRecord as getRecord, getString, isRecord } from '../utils/safe-extract';

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
// extractOutcomeFromEvents
// ---------------------------------------------------------------------------

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
				const toolCallId = getString(payload, 'toolCallId') ?? getString(data, 'toolCallId') ?? '';

				const startEntry = toolCallStarts.get(toolCallId);
				// tool-result events may not include toolName; fall back to the
				// name captured from the corresponding tool-call event.
				const toolName = getString(payload, 'toolName') ?? startEntry?.toolName ?? '';
				const result = payload.result ?? data.result;

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
				const toolCallId = getString(payload, 'toolCallId') ?? getString(data, 'toolCallId') ?? '';
				const errorMsg = getString(payload, 'error') ?? getString(data, 'error') ?? 'Unknown error';

				const startEntry = toolCallStarts.get(toolCallId);
				const toolName = getString(payload, 'toolName') ?? startEntry?.toolName ?? '';
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
					tools,
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
				const toolsRaw = payload.tools;
				const tools = Array.isArray(toolsRaw)
					? (toolsRaw as unknown[]).filter((t): t is string => typeof t === 'string')
					: [];

				agentMap.set(agentId, {
					agentId,
					role,
					parentId,
					tools,
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
// Per-turn conversation metrics
// ---------------------------------------------------------------------------

const PLAN_RECOVERY_TOOL_NAMES = new Set(['plan', 'planWithAgent', 'plan-with-agent']);

export function buildConversationMetrics(events: CapturedEvent[]): ConversationMetrics {
	const turns = splitEventsIntoTurns(events);
	const perTurn: TurnCounter[] = [];
	const seenRequestIds = new Set<string>();
	const aggregateByKind: Record<string, number> = {};
	let aggregateTotal = 0;

	for (let i = 0; i < turns.length; i++) {
		const turnEvents = turns[i];
		const counter: TurnCounter = {
			turn: i + 1,
			toolCallCount: 0,
			toolErrorCount: 0,
			confirmationAskedTotal: 0,
			confirmationAskedByKind: {},
			replanAfterErrorCount: 0,
			repeatQuestionCount: 0,
		};

		const errorPositions: number[] = [];
		const planRecoveryPositions: number[] = [];

		for (let j = 0; j < turnEvents.length; j++) {
			const event = turnEvents[j];
			const payload = getRecord(event.data, 'payload') ?? event.data;

			switch (event.type) {
				case 'tool-call': {
					counter.toolCallCount++;
					const toolName = getString(payload, 'toolName');
					if (toolName && PLAN_RECOVERY_TOOL_NAMES.has(toolName)) {
						planRecoveryPositions.push(j);
					}
					break;
				}
				case 'tool-error': {
					counter.toolErrorCount++;
					errorPositions.push(j);
					break;
				}
				case 'tasks-update': {
					planRecoveryPositions.push(j);
					break;
				}
				case 'confirmation-request': {
					counter.confirmationAskedTotal++;
					aggregateTotal++;
					const inputType = getString(payload, 'inputType') ?? 'approval';
					counter.confirmationAskedByKind[inputType] =
						(counter.confirmationAskedByKind[inputType] ?? 0) + 1;
					aggregateByKind[inputType] = (aggregateByKind[inputType] ?? 0) + 1;
					const requestId = getString(payload, 'requestId');
					if (requestId) {
						if (seenRequestIds.has(requestId)) {
							counter.repeatQuestionCount++;
						} else {
							seenRequestIds.add(requestId);
						}
					}
					break;
				}
				case 'run-finish': {
					counter.runFinishStatus = getString(payload, 'status') ?? counter.runFinishStatus;
					break;
				}
				default:
					break;
			}
		}

		for (const errPos of errorPositions) {
			if (planRecoveryPositions.some((recPos) => recPos > errPos)) {
				counter.replanAfterErrorCount++;
			}
		}

		perTurn.push(counter);
	}

	const turnCount = countEvents(events, 'run-finish');
	const lastTurn = perTurn[perTurn.length - 1];
	const reachedRunFinishCleanly = lastTurn?.runFinishStatus === 'completed';

	return {
		turnCount,
		perTurn,
		confirmationAskedTotal: aggregateTotal,
		confirmationAskedByKind: aggregateByKind,
		reachedRunFinishCleanly,
	};
}

/** Split events into turns. Each turn begins at a `run-start` event; events
 *  before the first `run-start` form a leading pseudo-turn (unusual but handled). */
export function splitEventsIntoTurns(events: CapturedEvent[]): CapturedEvent[][] {
	const turns: CapturedEvent[][] = [];
	let current: CapturedEvent[] = [];
	for (const event of events) {
		if (event.type === 'run-start' && current.length > 0) {
			turns.push(current);
			current = [event];
		} else if (event.type === 'run-start') {
			current = [event];
		} else {
			current.push(event);
		}
	}
	if (current.length > 0) turns.push(current);
	return turns;
}

function countEvents(events: CapturedEvent[], type: string): number {
	let n = 0;
	for (const event of events) if (event.type === type) n++;
	return n;
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
