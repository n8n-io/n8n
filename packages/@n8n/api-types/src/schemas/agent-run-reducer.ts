/**
 * Shared event reducer for Instance AI agent runs.
 *
 * Used by both the frontend (live SSE updates) and the backend (snapshot building).
 * All state is plain objects/arrays — no Map/Set — so it's Pinia-safe and easy
 * to inspect in tests.
 *
 * The state is node-centric: `agentsById` holds the actual `InstanceAiAgentNode`
 * objects, each embedding its own `toolCalls`, `timeline`, and `children`. The
 * agent tree and the flat lookups share the same objects — the tree rooted at
 * `rootAgentId` IS the state, viewed hierarchically. Events mutate nodes in
 * place, so consumers holding a node (or the tree root) always observe current
 * data without any synchronization layer.
 *
 * Nodes never reference their parent (parent links live in `parentByAgentId`
 * as plain ids), so the tree stays acyclic and `toAgentTree(state)` is
 * JSON-serializable. Don't JSON round-trip the state itself: `agentsById`
 * aliases the tree nodes, so stringify duplicates every shared subtree and
 * parse yields a state whose index and tree no longer share objects.
 */

import { getRenderHint, isKnownInstanceAiErrorCode, isSafeObjectKey } from './instance-ai.schema';
import type {
	InstanceAiEvent,
	InstanceAiAgentNode,
	InstanceAiCancellationReason,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from './instance-ai.schema';

/** Map the backend's run-finish reason string to a semantic cancellation cause. */
function categorizeCancellation(
	reason: string | undefined,
): InstanceAiCancellationReason | undefined {
	if (reason === 'timeout') return 'timeout';
	if (reason === 'service_shutdown') return 'shutdown';
	if (reason === 'user_cancelled') return 'user';
	if (reason === 'crash_interrupted') return 'interrupted';
	return undefined;
}

// ---------------------------------------------------------------------------
// State types
// ---------------------------------------------------------------------------

export interface AgentRunState {
	rootAgentId: string;
	/**
	 * Flat agent lookup — supports any nesting depth. Values are the live tree
	 * nodes: `agentsById[id].children[n]` is the same object as
	 * `agentsById[childId]`.
	 */
	agentsById: Record<string, InstanceAiAgentNode>;
	/** Maps child agentId → parent agentId. Root agent has no entry. */
	parentByAgentId: Record<string, string>;
	/**
	 * Flat tool-call lookup — same objects as in the owning node's `toolCalls`
	 * array, so result/error updates are visible from both sides.
	 */
	toolCallsById: Record<string, InstanceAiToolCallState>;
	/** Run status — tracks the overall run lifecycle. */
	status: 'active' | 'completed' | 'cancelled' | 'error';
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function createNode(agentId: string, role: string): InstanceAiAgentNode {
	return {
		agentId,
		role,
		status: 'active',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
	};
}

export function createInitialState(rootAgentId = 'agent-001'): AgentRunState {
	const safeRootAgentId = isSafeObjectKey(rootAgentId) ? rootAgentId : 'agent-001';
	return {
		rootAgentId: safeRootAgentId,
		agentsById: {
			[safeRootAgentId]: createNode(safeRootAgentId, 'orchestrator'),
		},
		parentByAgentId: {},
		toolCallsById: {},
		status: 'active',
	};
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

export function findAgent(state: AgentRunState, agentId: string): InstanceAiAgentNode | undefined {
	if (!isSafeObjectKey(agentId)) return undefined;
	return state.agentsById[agentId];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function ensureAgent(state: AgentRunState, agentId: string): InstanceAiAgentNode | undefined {
	if (!isSafeObjectKey(agentId)) return undefined;
	return state.agentsById[agentId];
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

/**
 * Append reasoning to timeline — merges consecutive reasoning entries within
 * the same responseId, so each LLM step (and anything interleaved with tool
 * calls or text) gets its own reasoning segment.
 */
function appendTimelineReasoning(
	timeline: InstanceAiTimelineEntry[],
	text: string,
	responseId?: string,
): void {
	const last = timeline.at(-1);
	if (last?.type === 'reasoning' && last.responseId === responseId) {
		last.content += text;
	} else {
		timeline.push({ type: 'reasoning', content: text, ...(responseId ? { responseId } : {}) });
	}
}

/**
 * Trees persisted before reasoning became a timeline entry carry only the
 * aggregate `reasoning` string. Copy it into the timeline once so resumed
 * runs can append new reasoning segments without dropping the old block.
 */
export function normalizeLegacyReasoningTimeline(node: InstanceAiAgentNode): void {
	if (!node.reasoning || node.timeline.some((entry) => entry.type === 'reasoning')) return;
	node.timeline.unshift({ type: 'reasoning', content: node.reasoning });
}

/** Walk an agent tree and normalize legacy reasoning on every node. */
export function normalizeAgentTree(tree: InstanceAiAgentNode): void {
	normalizeLegacyReasoningTimeline(tree);
	for (const child of tree.children) {
		normalizeAgentTree(child);
	}
}

/**
 * Whether a node carries any content worth preserving across a follow-up
 * `run-start`. Covers every renderable field a turn can populate — not just
 * text/tools/children — so a reasoning-, status-, result-, or error-only tree
 * is not wiped when the next run in the group starts. Optional-chained because
 * adopted run-sync trees are not schema-validated, so a malformed node must not
 * throw here.
 */
function nodeHasContent(node: InstanceAiAgentNode | undefined): boolean {
	if (!node) return false;
	return (
		(node.textContent?.length ?? 0) > 0 ||
		(node.reasoning?.length ?? 0) > 0 ||
		(node.timeline?.length ?? 0) > 0 ||
		(node.toolCalls?.length ?? 0) > 0 ||
		(node.children?.length ?? 0) > 0 ||
		(node.planItems?.length ?? 0) > 0 ||
		!!node.statusMessage ||
		!!node.result ||
		!!node.error ||
		!!node.tasks
	);
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
			const root = state.agentsById[state.rootAgentId];
			const hasExistingAgents = Object.keys(state.agentsById).length > 1 || nodeHasContent(root);

			if (hasExistingAgents) {
				// Follow-up run in a merged group: preserve existing agent tree,
				// just re-activate the root orchestrator for the new run's events.
				state.status = 'active';
				if (root) {
					root.status = 'active';
					// A merged follow-up/resume run streams under its own per-run agentId
					// (e.g. `orchestrator-<runId>`). Alias it to the existing root so its
					// tool calls and confirmations resolve an agent instead of being
					// dropped as orphans; rootAgentId and toAgentTree stay on the original.
					if (rootId !== state.rootAgentId) state.agentsById[rootId] = root;
				}
			} else {
				// First run: initialize from scratch.
				state.rootAgentId = rootId;
				state.agentsById = { [rootId]: createNode(rootId, 'orchestrator') };
				state.parentByAgentId = {};
				state.toolCallsById = {};
				state.status = 'active';
			}
			break;
		}

		case 'text-delta': {
			const agent = ensureAgent(state, event.agentId);
			if (agent) {
				agent.textContent += event.payload.text;
				appendTimelineText(agent.timeline, event.payload.text, event.responseId);
			}
			break;
		}

		case 'reasoning-delta': {
			const agent = ensureAgent(state, event.agentId);
			if (agent) {
				agent.reasoning += event.payload.text;
				appendTimelineReasoning(agent.timeline, event.payload.text, event.responseId);
			}
			break;
		}

		case 'text-block': {
			// Coalesced segment from the durable log (replay path). When the last
			// timeline entry is this segment's streamed deltas (mid-block reconnect:
			// the client saw part of the text live), REPLACE it instead of appending
			// so no text renders twice. The log flushes a block immediately before
			// the segment's next structural fact, so on replay the partial deltas
			// are always the last text entry when this event arrives.
			// Replace requires a PRESENT, matching responseId: id-less blocks
			// (synthetic markers, backfill) have no identity to match on, so they
			// always append — two of them can never overwrite each other. The
			// block must also textually extend the entry (deltas stream in order,
			// so a genuine partial is always a prefix); the same id reused with
			// unrelated text is a new message, not the open segment.
			const agent = ensureAgent(state, event.agentId);
			if (agent) {
				const last = agent.timeline.at(-1);
				const isOpenSegment =
					last?.type === 'text' &&
					event.responseId !== undefined &&
					last.responseId === event.responseId &&
					event.payload.text.startsWith(last.content);
				if (isOpenSegment && agent.textContent.endsWith(last.content)) {
					agent.textContent =
						agent.textContent.slice(0, agent.textContent.length - last.content.length) +
						event.payload.text;
					last.content = event.payload.text;
				} else {
					agent.textContent += event.payload.text;
					appendTimelineText(agent.timeline, event.payload.text, event.responseId);
				}
			}
			break;
		}

		case 'reasoning-block': {
			// Coalesced reasoning segment from the durable log (replay path). Same
			// replace semantics as text-block (present matching responseId plus
			// textual extension): the segment's open streamed deltas are its
			// timeline entry, so REPLACE that entry and strip the partial text
			// from the aggregate — no text renders twice.
			const agent = ensureAgent(state, event.agentId);
			if (agent) {
				const last = agent.timeline.at(-1);
				const isOpenSegment =
					last?.type === 'reasoning' &&
					event.responseId !== undefined &&
					last.responseId === event.responseId &&
					event.payload.text.startsWith(last.content);
				if (isOpenSegment && agent.reasoning.endsWith(last.content)) {
					agent.reasoning =
						agent.reasoning.slice(0, agent.reasoning.length - last.content.length) +
						event.payload.text;
					last.content = event.payload.text;
				} else {
					agent.reasoning += event.payload.text;
					appendTimelineReasoning(agent.timeline, event.payload.text, event.responseId);
				}
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
				agent.toolCalls.push(tc);
				agent.timeline.push({
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

		case 'tool-interrupted': {
			// Durable fact for a tool call in flight when the process died:
			// terminal like tool-error, effect unverified, never blind-retried.
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
			// Idempotency guard: a replayed agent-spawned for an existing agent
			// must not create a second node for the same id.
			if (state.agentsById[event.agentId]) break;
			const parentAgent = ensureAgent(state, event.payload.parentId);
			if (parentAgent) {
				const child: InstanceAiAgentNode = {
					...createNode(event.agentId, event.payload.role),
					tools: event.payload.tools,
					taskId: event.payload.taskId,
					kind: event.payload.kind,
					title: event.payload.title,
					subtitle: event.payload.subtitle,
					goal: event.payload.goal,
					targetResource: event.payload.targetResource,
				};
				state.agentsById[event.agentId] = child;
				state.parentByAgentId[event.agentId] = event.payload.parentId;
				parentAgent.children.push(child);
				// Inherit responseId from the parent's last entry when not set on the event
				// (agent-spawned events are emitted from tool code, not the stream executor).
				const inheritedResponseId = event.responseId ?? parentAgent.timeline.at(-1)?.responseId;
				parentAgent.timeline.push({
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
				// A completed/errored agent can't have tool calls still in-flight.
				// Clear isLoading so persisted snapshots don't show stale confirmations.
				for (const tc of agent.toolCalls) {
					if (tc.isLoading) {
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
					webSearch: event.payload.webSearch,
					credentialFlow: event.payload.credentialFlow,
					setupRequests: event.payload.setupRequests,
					workflowId: event.payload.workflowId,
					planItems: event.payload.planItems,
					questions: event.payload.questions,
					introMessage: event.payload.introMessage,
					tasks: event.payload.tasks,
					resourceDecision: event.payload.resourceDecision,
					channelConfig: event.payload.channelConfig,
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
			// A recognized error code is rendered by a dedicated UI state from the error
			// payload, so don't also inline the raw text. An unknown code (older/newer
			// service) has no such state — fall through and show the raw error.
			if (isKnownInstanceAiErrorCode(event.payload.code)) break;
			const errorText = '\n\n*Error: ' + event.payload.content + '*';
			const agent = ensureAgent(state, event.agentId) ?? state.agentsById[state.rootAgentId];
			if (agent) {
				agent.textContent += errorText;
				appendTimelineText(agent.timeline, errorText, event.responseId);
			}
			break;
		}

		case 'run-finish': {
			const { status } = event.payload;
			// 'interrupted' renders as a cancellation whose reason attributes the
			// crash — no dedicated FE state needed.
			state.status =
				status === 'completed'
					? 'completed'
					: status === 'cancelled' || status === 'interrupted'
						? 'cancelled'
						: 'error';
			const root = state.agentsById[state.rootAgentId];
			if (root) {
				root.status = state.status;
				if (state.status === 'cancelled') {
					root.cancellationReason = categorizeCancellation(event.payload.reason);
				}
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
// Tree view (for rendering and snapshot serialization)
// ---------------------------------------------------------------------------

/**
 * Returns the agent tree rooted at `rootAgentId`. This is a live view — the
 * root node and everything below it are the state's own objects, kept current
 * by `reduceEvent` mutations. JSON-serializable (no cycles); callers that need
 * an immutable snapshot must clone it themselves.
 */
export function toAgentTree(state: AgentRunState): InstanceAiAgentNode {
	return state.agentsById[state.rootAgentId] ?? createNode(state.rootAgentId, 'unknown');
}

/**
 * Adopted snapshots are not schema-validated (run-sync frames are plain
 * `JSON.parse`, hydrated messages a cast REST response), so an id must be
 * checked for presence and type before it is trusted as an object key.
 * Note `isSafeObjectKey(undefined)` would return true — `Set.has` on a
 * missing key is just false — so the string check is load-bearing.
 */
function isAdoptableId(id: unknown): id is string {
	return typeof id === 'string' && isSafeObjectKey(id);
}

/**
 * Inverse of `toAgentTree`: index an existing snapshot tree (e.g. from session
 * restore or a `run-sync` frame) into an `AgentRunState`.
 *
 * The nodes are adopted, not copied — the returned state's `agentsById` points
 * at the given tree's own objects, so subsequent `reduceEvent` calls mutate the
 * tree the caller already holds. Snapshots are not schema-validated: entries
 * with unsafe or missing ids are dropped and missing/junk collections are
 * normalized to empty arrays, in place — adoption never throws, and adopted
 * nodes are always safe to reduce into and render.
 */
export function stateFromAgentTree(tree: InstanceAiAgentNode): AgentRunState | undefined {
	if (!isAdoptableId(tree.agentId)) return undefined;

	const state: AgentRunState = {
		rootAgentId: tree.agentId,
		agentsById: {},
		parentByAgentId: {},
		toolCallsById: {},
		status: tree.status === 'active' ? 'active' : tree.status,
	};
	adoptNode(state, tree, undefined);
	return state;
}

function adoptNode(
	state: AgentRunState,
	node: InstanceAiAgentNode,
	parentId: string | undefined,
): void {
	if (!isAdoptableId(node.agentId)) return;

	state.agentsById[node.agentId] = node;
	if (parentId && isSafeObjectKey(parentId)) state.parentByAgentId[node.agentId] = parentId;

	node.children = Array.isArray(node.children)
		? node.children.filter((child) => isAdoptableId(child?.agentId))
		: [];
	node.toolCalls = Array.isArray(node.toolCalls)
		? node.toolCalls.filter((toolCall) => isAdoptableId(toolCall?.toolCallId))
		: [];
	node.timeline = Array.isArray(node.timeline)
		? node.timeline.filter((entry) => {
				if (entry?.type === 'child') return isAdoptableId(entry.agentId);
				if (entry?.type === 'tool-call') return isAdoptableId(entry.toolCallId);
				return Boolean(entry);
			})
		: [];
	for (const tc of node.toolCalls) {
		state.toolCallsById[tc.toolCallId] = tc;
	}
	normalizeLegacyReasoningTimeline(node);
	for (const child of node.children) {
		adoptNode(state, child, node.agentId);
	}
}
