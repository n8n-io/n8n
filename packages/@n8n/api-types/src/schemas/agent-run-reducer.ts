/**
 * Shared event reducer for Instance AI agent runs.
 *
 * Used by both the frontend (live SSE updates) and the backend (snapshot building).
 * All state is plain objects/arrays — no Map/Set — so it's serializable, Pinia-safe,
 * and easy to inspect in tests.
 */

import { getRenderHint, isSafeObjectKey } from './instance-ai.schema';
import type {
	InstanceAiEvent,
	InstanceAiAgentNode,
	InstanceAiAgentKind,
	InstanceAiAgentStatus,
	InstanceAiToolCallState,
	InstanceAiTimelineEntry,
	InstanceAiTargetResource,
	PlannedTaskArg,
	TaskList,
} from './instance-ai.schema';

// ---------------------------------------------------------------------------
// State types
// ---------------------------------------------------------------------------

export interface AgentNode {
	agentId: string;
	role: string;
	tools?: string[];
	taskId?: string;
	// Display metadata (from enriched agent-spawned events)
	kind?: InstanceAiAgentKind;
	title?: string;
	subtitle?: string;
	goal?: string;
	targetResource?: InstanceAiTargetResource;
	/** Transient status message (e.g. "Recalling conversation..."). Cleared when empty. */
	statusMessage?: string;
	status: InstanceAiAgentStatus;
	textContent: string;
	reasoning: string;
	tasks?: TaskList;
	planItems?: PlannedTaskArg[];
	result?: string;
	error?: string;
}

export interface AgentRunState {
	rootAgentId: string;
	/** Flat agent lookup — supports any nesting depth. */
	agentsById: Record<string, AgentNode>;
	/** Maps child agentId → parent agentId. Root agent has no entry. */
	parentByAgentId: Record<string, string>;
	/** Ordered list of children per agent. */
	childrenByAgentId: Record<string, string[]>;
	/** Chronological timeline per agent. */
	timelineByAgentId: Record<string, InstanceAiTimelineEntry[]>;
	/** Flat tool-call lookup. */
	toolCallsById: Record<string, InstanceAiToolCallState>;
	/** Ordered tool-call IDs per agent (preserves insertion order). */
	toolCallIdsByAgentId: Record<string, string[]>;
	/** Run status — tracks the overall run lifecycle. */
	status: 'active' | 'completed' | 'cancelled' | 'error';
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createInitialState(rootAgentId = 'agent-001'): AgentRunState {
	const safeRootAgentId = isSafeObjectKey(rootAgentId) ? rootAgentId : 'agent-001';
	return {
		rootAgentId: safeRootAgentId,
		agentsById: {
			[safeRootAgentId]: {
				agentId: safeRootAgentId,
				role: 'orchestrator',
				status: 'active',
				textContent: '',
				reasoning: '',
			},
		},
		parentByAgentId: {},
		childrenByAgentId: { [safeRootAgentId]: [] },
		timelineByAgentId: { [safeRootAgentId]: [] },
		toolCallsById: {},
		toolCallIdsByAgentId: { [safeRootAgentId]: [] },
		status: 'active',
	};
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

export function findAgent(state: AgentRunState, agentId: string): AgentNode | undefined {
	if (!isSafeObjectKey(agentId)) return undefined;
	return state.agentsById[agentId];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function ensureAgent(state: AgentRunState, agentId: string): AgentNode | undefined {
	if (!isSafeObjectKey(agentId)) return undefined;
	return state.agentsById[agentId];
}

function ensureTimeline(state: AgentRunState, agentId: string): InstanceAiTimelineEntry[] {
	if (!isSafeObjectKey(agentId)) return [];
	let tl = state.timelineByAgentId[agentId];
	if (!tl) {
		tl = [];
		state.timelineByAgentId[agentId] = tl;
	}
	return tl;
}

function ensureToolCallIds(state: AgentRunState, agentId: string): string[] {
	if (!isSafeObjectKey(agentId)) return [];
	let ids = state.toolCallIdsByAgentId[agentId];
	if (!ids) {
		ids = [];
		state.toolCallIdsByAgentId[agentId] = ids;
	}
	return ids;
}

function ensureChildren(state: AgentRunState, agentId: string): string[] {
	if (!isSafeObjectKey(agentId)) return [];
	let children = state.childrenByAgentId[agentId];
	if (!children) {
		children = [];
		state.childrenByAgentId[agentId] = children;
	}
	return children;
}

/** Append text to timeline — merges consecutive text entries within the same responseId. */
function appendTimelineText(
	timeline: InstanceAiTimelineEntry[],
	text: string,
	responseId?: string,
): void {
	const last = timeline.at(-1);
	if (last?.type === 'text' && last.responseId === responseId) {
		last.content += text;
	} else {
		timeline.push({ type: 'text', content: text, ...(responseId ? { responseId } : {}) });
	}
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * Pure event reducer. Mutates `state` in-place for performance (same pattern
 * as the existing frontend reducer). Returns the same state reference.
 */
export function reduceEvent(state: AgentRunState, event: InstanceAiEvent): AgentRunState {
	switch (event.type) {
		case 'run-start': {
			const rootId = event.agentId;
			if (!isSafeObjectKey(rootId)) break;
			const hasExistingAgents =
				Object.keys(state.agentsById).length > 1 ||
				(state.agentsById[state.rootAgentId]?.textContent?.length ?? 0) > 0 ||
				(state.childrenByAgentId[state.rootAgentId]?.length ?? 0) > 0 ||
				(state.toolCallIdsByAgentId[state.rootAgentId]?.length ?? 0) > 0;

			if (hasExistingAgents) {
				// Follow-up run in a merged group: preserve existing agent tree,
				// just re-activate the root orchestrator for the new run's events.
				state.status = 'active';
				const root = state.agentsById[state.rootAgentId];
				if (root) root.status = 'active';
			} else {
				// First run: initialize from scratch.
				state.rootAgentId = rootId;
				state.agentsById = {
					[rootId]: {
						agentId: rootId,
						role: 'orchestrator',
						status: 'active',
						textContent: '',
						reasoning: '',
					},
				};
				state.parentByAgentId = {};
				state.childrenByAgentId = { [rootId]: [] };
				state.timelineByAgentId = { [rootId]: [] };
				state.toolCallsById = {};
				state.toolCallIdsByAgentId = { [rootId]: [] };
				state.status = 'active';
			}
			break;
		}

		case 'text-delta': {
			const agent = ensureAgent(state, event.agentId);
			if (agent) {
				agent.textContent += event.payload.text;
				appendTimelineText(
					ensureTimeline(state, event.agentId),
					event.payload.text,
					event.responseId,
				);
			}
			break;
		}

		case 'reasoning-delta': {
			const agent = ensureAgent(state, event.agentId);
			if (agent) {
				agent.reasoning += event.payload.text;
			}
			break;
		}

		case 'tool-call': {
			if (!isSafeObjectKey(event.payload.toolCallId)) break;
			const agent = ensureAgent(state, event.agentId);
			if (agent) {
				const tc: InstanceAiToolCallState = {
					toolCallId: event.payload.toolCallId,
					toolName: event.payload.toolName,
					args: event.payload.args,
					isLoading: true,
					renderHint: getRenderHint(event.payload.toolName),
					startedAt: new Date().toISOString(),
				};
				state.toolCallsById[event.payload.toolCallId] = tc;
				ensureToolCallIds(state, event.agentId).push(event.payload.toolCallId);
				ensureTimeline(state, event.agentId).push({
					type: 'tool-call',
					toolCallId: event.payload.toolCallId,
					...(event.responseId ? { responseId: event.responseId } : {}),
				});
			}
			break;
		}

		case 'tool-result': {
			if (!isSafeObjectKey(event.payload.toolCallId)) break;
			const tc = state.toolCallsById[event.payload.toolCallId];
			if (tc) {
				tc.result = event.payload.result;
				tc.isLoading = false;
				tc.completedAt = new Date().toISOString();
			}
			break;
		}

		case 'tool-error': {
			if (!isSafeObjectKey(event.payload.toolCallId)) break;
			const tc = state.toolCallsById[event.payload.toolCallId];
			if (tc) {
				tc.error = event.payload.error;
				tc.isLoading = false;
				tc.completedAt = new Date().toISOString();
			}
			break;
		}

		case 'agent-spawned': {
			if (!isSafeObjectKey(event.agentId) || !isSafeObjectKey(event.payload.parentId)) break;
			const parentAgent = ensureAgent(state, event.payload.parentId);
			if (parentAgent) {
				state.agentsById[event.agentId] = {
					agentId: event.agentId,
					role: event.payload.role,
					tools: event.payload.tools,
					taskId: event.payload.taskId,
					kind: event.payload.kind,
					title: event.payload.title,
					subtitle: event.payload.subtitle,
					goal: event.payload.goal,
					targetResource: event.payload.targetResource,
					status: 'active',
					textContent: '',
					reasoning: '',
				};
				state.parentByAgentId[event.agentId] = event.payload.parentId;
				ensureChildren(state, event.payload.parentId).push(event.agentId);
				ensureChildren(state, event.agentId); // init empty
				ensureTimeline(state, event.agentId); // init empty
				ensureToolCallIds(state, event.agentId); // init empty
				const parentTimeline = ensureTimeline(state, event.payload.parentId);
				// Inherit responseId from the parent's last entry when not set on the event
				// (agent-spawned events are emitted from tool code, not the stream executor).
				const inheritedResponseId = event.responseId ?? parentTimeline.at(-1)?.responseId;
				parentTimeline.push({
					type: 'child',
					agentId: event.agentId,
					...(inheritedResponseId ? { responseId: inheritedResponseId } : {}),
				});
			}
			break;
		}

		case 'agent-completed': {
			const agent = ensureAgent(state, event.agentId);
			if (agent) {
				agent.status = event.payload.error ? 'error' : 'completed';
				agent.result = event.payload.result;
				agent.error = event.payload.error;
			}
			// A completed/errored agent can't have tool calls still in-flight.
			// Clear isLoading so persisted snapshots don't show stale confirmations.
			if (!isSafeObjectKey(event.agentId)) break;
			const agentToolCallIds = state.toolCallIdsByAgentId[event.agentId];
			if (agentToolCallIds) {
				for (const tcId of agentToolCallIds) {
					const tc = state.toolCallsById[tcId];
					if (tc?.isLoading) {
						tc.isLoading = false;
					}
				}
			}
			break;
		}

		case 'confirmation-request': {
			if (!isSafeObjectKey(event.payload.toolCallId)) break;
			const tc = state.toolCallsById[event.payload.toolCallId];
			if (tc) {
				tc.confirmation = {
					requestId: event.payload.requestId,
					inputThreadId: event.payload.inputThreadId,
					severity: event.payload.severity,
					message: event.payload.message,
					credentialRequests: event.payload.credentialRequests,
					projectId: event.payload.projectId,
					inputType: event.payload.inputType,
					domainAccess: event.payload.domainAccess,
					credentialFlow: event.payload.credentialFlow,
					setupRequests: event.payload.setupRequests,
					workflowId: event.payload.workflowId,
					planItems: event.payload.planItems,
					questions: event.payload.questions,
					introMessage: event.payload.introMessage,
					tasks: event.payload.tasks,
					resourceDecision: event.payload.resourceDecision,
				};
			}
			break;
		}

		case 'tasks-update': {
			const agent = ensureAgent(state, event.agentId);
			if (agent) {
				agent.tasks = event.payload.tasks;
				if (event.payload.planItems) {
					agent.planItems = event.payload.planItems;
				}
			}
			break;
		}

		case 'status': {
			const agent = ensureAgent(state, event.agentId);
			if (agent) {
				agent.statusMessage = event.payload.message || undefined;
			}
			break;
		}

		case 'error': {
			const errorText = '\n\n*Error: ' + event.payload.content + '*';
			const agent = ensureAgent(state, event.agentId);
			if (agent) {
				agent.textContent += errorText;
				appendTimelineText(ensureTimeline(state, event.agentId), errorText, event.responseId);
			} else {
				// Fall back to root agent
				const root = state.agentsById[state.rootAgentId];
				if (root) {
					root.textContent += errorText;
					appendTimelineText(ensureTimeline(state, state.rootAgentId), errorText, event.responseId);
				}
			}
			break;
		}

		case 'run-finish': {
			const { status } = event.payload;
			state.status =
				status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'error';
			const root = state.agentsById[state.rootAgentId];
			if (root) {
				root.status = state.status;
			}
			// A terminated run can't have tool calls still in-flight.
			// Clear isLoading so persisted snapshots don't show stale confirmations.
			if (state.status === 'cancelled' || state.status === 'error') {
				for (const tc of Object.values(state.toolCallsById)) {
					if (tc.isLoading) {
						tc.isLoading = false;
					}
				}
			}
			break;
		}

		case 'filesystem-request':
		case 'thread-title-updated': {
			// Handled externally — no state change
			break;
		}
	}

	return state;
}

// ---------------------------------------------------------------------------
// Tree reconstruction (for rendering)
// ---------------------------------------------------------------------------

/**
 * Derives the nested `InstanceAiAgentNode` tree from the flat state.
 * This is what components receive for rendering.
 */
export function toAgentTree(state: AgentRunState): InstanceAiAgentNode {
	return buildNodeRecursive(state, state.rootAgentId);
}

function buildNodeRecursive(state: AgentRunState, agentId: string): InstanceAiAgentNode {
	if (!isSafeObjectKey(agentId)) {
		return {
			agentId,
			role: 'unknown',
			status: 'active',
			textContent: '',
			reasoning: '',
			toolCalls: [],
			children: [],
			timeline: [],
		};
	}

	const agent = state.agentsById[agentId];
	const childIds = (state.childrenByAgentId[agentId] ?? []).filter((childId) =>
		isSafeObjectKey(childId),
	);
	const toolCallIds = (state.toolCallIdsByAgentId[agentId] ?? []).filter((toolCallId) =>
		isSafeObjectKey(toolCallId),
	);
	const timeline = (state.timelineByAgentId[agentId] ?? []).filter((entry) => {
		if (entry.type === 'child') return isSafeObjectKey(entry.agentId);
		if (entry.type === 'tool-call') return isSafeObjectKey(entry.toolCallId);
		return true;
	});

	const toolCalls: InstanceAiToolCallState[] = toolCallIds
		.map((id) => state.toolCallsById[id])
		.filter((tc): tc is InstanceAiToolCallState => tc !== undefined);

	const children: InstanceAiAgentNode[] = childIds.map((childId) =>
		buildNodeRecursive(state, childId),
	);

	return {
		agentId: agent?.agentId ?? agentId,
		role: agent?.role ?? 'unknown',
		tools: agent?.tools,
		taskId: agent?.taskId,
		kind: agent?.kind,
		title: agent?.title,
		subtitle: agent?.subtitle,
		goal: agent?.goal,
		targetResource: agent?.targetResource,
		statusMessage: agent?.statusMessage,
		status: agent?.status ?? 'active',
		textContent: agent?.textContent ?? '',
		reasoning: agent?.reasoning ?? '',
		toolCalls,
		children,
		timeline: [...timeline],
		tasks: agent?.tasks,
		planItems: agent?.planItems,
		result: agent?.result,
		error: agent?.error,
	};
}
