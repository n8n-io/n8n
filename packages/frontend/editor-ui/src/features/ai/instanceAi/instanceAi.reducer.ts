import { reactive } from 'vue';
import {
	getRenderHint,
	createInitialState,
	reduceEvent as reduceRunEvent,
	toAgentTree,
	findAgent,
	stateFromAgentTree,
	isSafeObjectKey,
} from '@n8n/api-types';
import type {
	InstanceAiEvent,
	InstanceAiMessage,
	InstanceAiAgentNode,
	AgentRunState,
} from '@n8n/api-types';

/**
 * Per-thread reducer state.
 *
 * The run states are node-centric (see `agent-run-reducer.ts`): the agent tree
 * a message renders (`msg.agentTree`) IS the run state's root node — the same
 * live objects, mutated in place by the shared reducer. There is no separate
 * denormalized copy to keep in sync.
 *
 * Run states are wrapped in Vue's `reactive()` (see `createRunState`), so those
 * in-place mutations flow through the same canonical proxies the components
 * render — a text-delta invalidates exactly the component reading that node's
 * text, nothing else.
 */
export interface InstanceAiReducerState {
	messages: InstanceAiMessage[];
	activeRunId: string | null;
	/**
	 * One normalized AgentRunState per messageGroupId.
	 * All runs within the same user turn share one state.
	 * Falls back to runId as key when no messageGroupId exists.
	 *
	 * A Map (not a plain object): this is FE-only runtime state, never
	 * serialized — no prototype-pollution footgun, clean add/delete/clear.
	 */
	runStateByGroupId: Map<string, AgentRunState>;
	/**
	 * Maps any runId to its messageGroupId (or itself when no group exists).
	 * This is the primary routing table — every incoming event resolves its
	 * runId through this map to find the correct state and message.
	 * Survives follow-up chains: runA → mg_1, runB → mg_1, runC → mg_1.
	 */
	groupIdByRunId: Map<string, string>;
}

/** Resolve a runId to its group key. */
function resolveGroupId(state: InstanceAiReducerState, runId: string): string {
	if (!isSafeObjectKey(runId)) return runId;
	const groupId = state.groupIdByRunId.get(runId);
	return groupId && isSafeObjectKey(groupId) ? groupId : runId;
}

/** Find the message that owns a group. */
function findMessageByGroupId(
	state: InstanceAiReducerState,
	groupId: string,
): InstanceAiMessage | undefined {
	if (!isSafeObjectKey(groupId)) return undefined;
	return state.messages.find((m) => m.messageGroupId === groupId || m.runId === groupId);
}

export function findMessageByRunId(
	state: InstanceAiReducerState,
	runId: string,
): InstanceAiMessage | undefined {
	if (!isSafeObjectKey(runId)) return undefined;
	const groupId = resolveGroupId(state, runId);
	return findMessageByGroupId(state, groupId);
}

/**
 * Find an agent node in a message's tree by agentId.
 * Searches recursively (no depth limit).
 */
export function findAgentNode(
	msg: InstanceAiMessage | undefined,
	agentId: string,
): InstanceAiAgentNode | undefined {
	if (!msg?.agentTree) return undefined;
	return findNodeRecursive(msg.agentTree, agentId);
}

function findNodeRecursive(
	node: InstanceAiAgentNode,
	agentId: string,
): InstanceAiAgentNode | undefined {
	if (node.agentId === agentId) return node;
	for (const child of node.children) {
		const found = findNodeRecursive(child, agentId);
		if (found) return found;
	}
	return undefined;
}

// Re-export for backward compat
export { getRenderHint };

/**
 * Create a reactive run state. Reactivity must live on the run state itself:
 * the shared reducer mutates it in place, and components render the very same
 * node objects via `msg.agentTree` — wrapping here makes those mutations
 * observable everywhere without any synchronization layer.
 */
function createRunState(rootAgentId?: string): AgentRunState {
	return reactive(createInitialState(rootAgentId));
}

/**
 * Index a snapshot tree (session restore / run-sync) into a reactive run state.
 * The tree's nodes are adopted, not copied — live events keep mutating the
 * exact objects the message already renders.
 */
export function createRunStateFromTree(tree: InstanceAiAgentNode): AgentRunState | undefined {
	const runState = stateFromAgentTree(tree);
	return runState ? reactive(runState) : undefined;
}

/**
 * Get or create the AgentRunState for a group.
 */
function getOrCreateGroupState(
	state: InstanceAiReducerState,
	groupId: string,
	rootAgentId?: string,
): AgentRunState {
	if (!isSafeObjectKey(groupId)) {
		return createRunState(rootAgentId);
	}
	let runState = state.runStateByGroupId.get(groupId);
	if (!runState) {
		runState = createRunState(rootAgentId);
		state.runStateByGroupId.set(groupId, runState);
	}
	return runState;
}

/** Register a runId → groupId mapping. */
function registerRunId(state: InstanceAiReducerState, runId: string, groupId: string): void {
	if (!isSafeObjectKey(runId) || !isSafeObjectKey(groupId)) return;
	state.groupIdByRunId.set(runId, groupId);
}

function hasSafeEventKeys(event: InstanceAiEvent): boolean {
	if (!isSafeObjectKey(event.runId) || !isSafeObjectKey(event.agentId)) return false;

	switch (event.type) {
		case 'run-start':
			return event.payload.messageGroupId ? isSafeObjectKey(event.payload.messageGroupId) : true;
		case 'agent-spawned':
			return isSafeObjectKey(event.payload.parentId);
		case 'tool-call':
		case 'tool-result':
		case 'tool-error':
		case 'confirmation-request':
			return isSafeObjectKey(event.payload.toolCallId);
		default:
			return true;
	}
}

// ---------------------------------------------------------------------------
// Event routing helper — resolves runId → groupId → (message, runState)
// ---------------------------------------------------------------------------

interface ResolvedTarget {
	msg: InstanceAiMessage | undefined;
	runState: AgentRunState | undefined;
	groupId: string;
}

function resolveTarget(state: InstanceAiReducerState, runId: string): ResolvedTarget {
	const groupId = resolveGroupId(state, runId);
	return {
		msg: findMessageByGroupId(state, groupId),
		runState: state.runStateByGroupId.get(groupId),
		groupId,
	};
}

// ---------------------------------------------------------------------------
// Main reducer
// ---------------------------------------------------------------------------

/** Mutates state.messages in-place. Returns the new activeRunId (may differ from input). */
export function handleEvent(state: InstanceAiReducerState, event: InstanceAiEvent): string | null {
	// Ensure maps exist (backward compat)
	if (!state.groupIdByRunId) state.groupIdByRunId = new Map();
	if (!state.runStateByGroupId) state.runStateByGroupId = new Map();
	if (!hasSafeEventKeys(event)) return state.activeRunId;

	// Mid-run replay guard: if we receive events for a runId that has no
	// message yet (e.g., reconnect missed the run-start), create the message
	// on the fly so subsequent events aren't dropped.
	if (event.type !== 'run-start') {
		const { msg, groupId } = resolveTarget(state, event.runId);
		if (!msg) {
			const rootAgentId = event.type === 'agent-spawned' ? event.payload.parentId : event.agentId;
			registerRunId(state, event.runId, groupId);
			const runState = getOrCreateGroupState(state, groupId, rootAgentId);
			state.messages.push({
				id: groupId,
				runId: event.runId,
				messageGroupId: groupId,
				role: 'assistant',
				createdAt: new Date().toISOString(),
				content: '',
				reasoning: '',
				isStreaming: true,
				agentTree: toAgentTree(runState),
			});
		}
	}

	switch (event.type) {
		case 'run-start': {
			const messageGroupId = event.payload.messageGroupId ?? event.runId;
			registerRunId(state, event.runId, messageGroupId);

			// Auto-follow-up merging: if this group already has a message, merge.
			const existingMsg = findMessageByGroupId(state, messageGroupId);
			if (existingMsg) {
				const runState = state.runStateByGroupId.get(messageGroupId);
				if (runState) {
					// The shared reducer preserves the existing agent tree for
					// follow-up runs and re-activates the root orchestrator.
					reduceRunEvent(runState, event);
					// Re-point in case run-start re-initialized the root node.
					existingMsg.agentTree = toAgentTree(runState);
				}
				existingMsg.runId = event.runId;
				existingMsg.isStreaming = true;
				return event.runId;
			}

			// First run in this group — create new message.
			const runState = getOrCreateGroupState(state, messageGroupId, event.agentId);
			reduceRunEvent(runState, event);
			state.messages.push({
				id: event.runId,
				runId: event.runId,
				messageGroupId,
				role: 'assistant',
				createdAt: new Date().toISOString(),
				content: '',
				reasoning: '',
				isStreaming: true,
				agentTree: toAgentTree(runState),
			});
			return event.runId;
		}

		case 'text-delta': {
			const { msg, runState } = resolveTarget(state, event.runId);
			if (runState) {
				reduceRunEvent(runState, event);
				// Mirror the root agent's text onto the message for consumers that
				// read `msg.content` (previews, fallback rendering, feedback copy).
				if (msg && event.agentId === runState.rootAgentId) {
					msg.content = findAgent(runState, event.agentId)?.textContent ?? msg.content;
				}
			}
			return state.activeRunId;
		}

		case 'reasoning-delta': {
			const { msg, runState } = resolveTarget(state, event.runId);
			if (runState) {
				reduceRunEvent(runState, event);
				if (msg && event.agentId === runState.rootAgentId) {
					msg.reasoning = findAgent(runState, event.agentId)?.reasoning ?? msg.reasoning;
				}
			}
			return state.activeRunId;
		}

		case 'tool-call':
		case 'tool-result':
		case 'tool-error':
		case 'agent-spawned':
		case 'agent-completed':
		case 'confirmation-request':
		case 'tasks-update':
		case 'status': {
			const { runState } = resolveTarget(state, event.runId);
			if (runState) {
				reduceRunEvent(runState, event);
			}
			return state.activeRunId;
		}

		case 'error': {
			const { msg, runState } = resolveTarget(state, event.runId);
			if (runState) {
				reduceRunEvent(runState, event);
				// Enrich the affected agent with structured error details.
				const target =
					findAgent(runState, event.agentId) ?? findAgent(runState, runState.rootAgentId);
				if (target) {
					target.status = 'error';
					target.error = event.payload.content;
					target.errorDetails = {
						...(event.payload.statusCode !== undefined
							? { statusCode: event.payload.statusCode }
							: {}),
						...(event.payload.provider ? { provider: event.payload.provider } : {}),
						...(event.payload.technicalDetails
							? { technicalDetails: event.payload.technicalDetails }
							: {}),
					};
					if (msg && target.agentId === runState.rootAgentId) {
						msg.content = target.textContent;
					}
				}
			} else if (msg) {
				msg.content += '\n\n*Error: ' + event.payload.content + '*';
			}
			return state.activeRunId;
		}

		case 'filesystem-request':
		case 'thread-title-updated':
			return state.activeRunId;

		case 'run-finish': {
			const { msg, runState } = resolveTarget(state, event.runId);
			if (runState) {
				reduceRunEvent(runState, event);
				const { status, reason } = event.payload;
				const root = findAgent(runState, runState.rootAgentId);
				// Surface the failure reason on the root agent (the shared reducer
				// only sets the status).
				if (root && status === 'error' && reason && !root.error) {
					root.error = reason;
				}
				if (msg) msg.isStreaming = false;
			} else if (msg) {
				msg.isStreaming = false;
				const { status, reason } = event.payload;
				if (status === 'error' && reason) {
					msg.content += '\n\n*Error: ' + reason + '*';
				}
			}
			return null;
		}

		default:
			return state.activeRunId;
	}
}
