import {
	getRenderHint,
	createInitialState,
	reduceEvent as reduceRunEvent,
	toAgentTree,
	findAgent,
	isSafeObjectKey,
} from '@n8n/api-types';
import type {
	InstanceAiEvent,
	InstanceAiMessage,
	InstanceAiAgentNode,
	AgentRunState,
} from '@n8n/api-types';

export interface InstanceAiReducerState {
	messages: InstanceAiMessage[];
	activeRunId: string | null;
	/**
	 * One normalized AgentRunState per messageGroupId.
	 * All runs within the same user turn share one state.
	 * Falls back to runId as key when no messageGroupId exists.
	 */
	runStateByGroupId: Record<string, AgentRunState>;
	/**
	 * Maps any runId to its messageGroupId (or itself when no group exists).
	 * This is the primary routing table — every incoming event resolves its
	 * runId through this map to find the correct state and message.
	 * Survives follow-up chains: runA → mg_1, runB → mg_1, runC → mg_1.
	 */
	groupIdByRunId: Record<string, string>;
}

/** Resolve a runId to its group key. */
function resolveGroupId(state: InstanceAiReducerState, runId: string): string {
	if (!isSafeObjectKey(runId)) return runId;
	const groupId = state.groupIdByRunId[runId];
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
 * Find an agent node in the tree by agentId.
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
 * Get or create the AgentRunState for a group.
 */
function getOrCreateGroupState(
	state: InstanceAiReducerState,
	groupId: string,
	rootAgentId?: string,
): AgentRunState {
	if (!isSafeObjectKey(groupId)) {
		return createInitialState(rootAgentId);
	}
	let runState = state.runStateByGroupId[groupId];
	if (!runState) {
		runState = createInitialState(rootAgentId);
		state.runStateByGroupId[groupId] = runState;
	}
	return runState;
}

/** Register a runId → groupId mapping. */
function registerRunId(state: InstanceAiReducerState, runId: string, groupId: string): void {
	if (!isSafeObjectKey(runId) || !isSafeObjectKey(groupId)) return;
	state.groupIdByRunId[runId] = groupId;
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

/**
 * Sync the agentTree on a message from the normalized run state.
 * Uses in-place patching when the tree structure hasn't changed.
 */
function syncAgentTree(msg: InstanceAiMessage, runState: AgentRunState): void {
	if (!msg.agentTree) {
		msg.agentTree = toAgentTree(runState);
		return;
	}
	if (!patchNodeInPlace(msg.agentTree, runState)) {
		msg.agentTree = toAgentTree(runState);
	}
}

function patchNodeInPlace(node: InstanceAiAgentNode, state: AgentRunState): boolean {
	const agent = state.agentsById[node.agentId];
	if (!agent) return false;

	const childIds = state.childrenByAgentId[node.agentId] ?? [];
	const toolCallIds = state.toolCallIdsByAgentId[node.agentId] ?? [];
	const timeline = state.timelineByAgentId[node.agentId] ?? [];

	if (node.children.length !== childIds.length || node.toolCalls.length !== toolCallIds.length) {
		return false;
	}
	for (let i = 0; i < childIds.length; i++) {
		if (node.children[i].agentId !== childIds[i]) return false;
	}

	node.status = agent.status;
	node.textContent = agent.textContent;
	node.reasoning = agent.reasoning;
	node.result = agent.result;
	node.error = agent.error;
	node.tasks = agent.tasks;
	node.planItems = agent.planItems;
	node.kind = agent.kind;
	node.title = agent.title;
	node.subtitle = agent.subtitle;
	node.goal = agent.goal;
	node.targetResource = agent.targetResource;

	for (let i = 0; i < toolCallIds.length; i++) {
		if (!isSafeObjectKey(toolCallIds[i])) return false;
		const tc = state.toolCallsById[toolCallIds[i]];
		const existing = node.toolCalls[i];
		if (!tc || !existing || existing.toolCallId !== tc.toolCallId) return false;
		node.toolCalls[i] = { ...tc };
	}

	if (node.timeline.length !== timeline.length) return false;
	for (let i = 0; i < timeline.length; i++) {
		const existing = node.timeline[i];
		const updated = timeline[i];
		if (existing.type !== updated.type) return false;
		if (existing.type === 'text' && updated.type === 'text') {
			existing.content = updated.content;
		}
	}

	for (let i = 0; i < childIds.length; i++) {
		if (!patchNodeInPlace(node.children[i], state)) return false;
	}
	return true;
}

function patchStreamingTextTimeline(
	node: InstanceAiAgentNode,
	timeline: AgentRunState['timelineByAgentId'][string],
): boolean {
	if (node.timeline.length === timeline.length) {
		if (timeline.length === 0) return true;
		for (let i = 0; i < timeline.length; i++) {
			if (node.timeline[i].type !== timeline[i].type) return false;
		}
		const existingLast = node.timeline.at(-1);
		const updatedLast = timeline.at(-1);
		if (existingLast?.type !== 'text' || updatedLast?.type !== 'text') return false;
		existingLast.content = updatedLast.content;
		return true;
	}

	if (node.timeline.length + 1 !== timeline.length) return false;
	for (let i = 0; i < node.timeline.length; i++) {
		if (node.timeline[i].type !== timeline[i].type) return false;
	}
	const updatedLast = timeline.at(-1);
	if (updatedLast?.type !== 'text') return false;
	node.timeline.push({
		type: 'text',
		content: updatedLast.content,
		...(updatedLast.responseId ? { responseId: updatedLast.responseId } : {}),
	});
	return true;
}

function syncStreamingTextNode(
	msg: InstanceAiMessage,
	runState: AgentRunState,
	agentId: string,
): void {
	if (!msg.agentTree) {
		msg.agentTree = toAgentTree(runState);
		return;
	}

	const renderedNode = findAgentNode(msg, agentId);
	const stateNode = findAgent(runState, agentId);
	if (!renderedNode || !stateNode) {
		syncAgentTree(msg, runState);
		return;
	}

	renderedNode.status = stateNode.status;
	renderedNode.textContent = stateNode.textContent;
	renderedNode.result = stateNode.result;
	renderedNode.error = stateNode.error;
	const timeline = runState.timelineByAgentId[agentId] ?? [];
	if (!patchStreamingTextTimeline(renderedNode, timeline)) {
		syncAgentTree(msg, runState);
		return;
	}

	if (agentId === runState.rootAgentId) {
		msg.content = stateNode.textContent;
	}
}

function syncStreamingReasoningNode(
	msg: InstanceAiMessage,
	runState: AgentRunState,
	agentId: string,
): void {
	if (!msg.agentTree) {
		msg.agentTree = toAgentTree(runState);
		return;
	}

	const renderedNode = findAgentNode(msg, agentId);
	const stateNode = findAgent(runState, agentId);
	if (!renderedNode || !stateNode) {
		syncAgentTree(msg, runState);
		return;
	}

	renderedNode.status = stateNode.status;
	renderedNode.reasoning = stateNode.reasoning;
	renderedNode.result = stateNode.result;
	renderedNode.error = stateNode.error;

	if (agentId === runState.rootAgentId) {
		msg.reasoning = stateNode.reasoning;
	}
}

/**
 * Rebuild an AgentRunState from a snapshot tree (for run-sync).
 */
export function rebuildRunStateFromTree(tree: InstanceAiAgentNode): AgentRunState | undefined {
	if (!isSafeObjectKey(tree.agentId)) return undefined;

	const runState = createInitialState(tree.agentId);
	populateRunStateFromNode(runState, tree, undefined);
	runState.status = tree.status === 'active' ? 'active' : tree.status;
	return runState;
}

function populateRunStateFromNode(
	state: AgentRunState,
	node: InstanceAiAgentNode,
	parentId: string | undefined,
): void {
	if (!isSafeObjectKey(node.agentId)) return;

	state.agentsById[node.agentId] = {
		agentId: node.agentId,
		role: node.role,
		tools: node.tools,
		taskId: node.taskId,
		kind: node.kind,
		title: node.title,
		subtitle: node.subtitle,
		goal: node.goal,
		targetResource: node.targetResource,
		status: node.status,
		textContent: node.textContent,
		reasoning: node.reasoning,
		tasks: node.tasks,
		planItems: node.planItems,
		result: node.result,
		error: node.error,
	};
	if (parentId && isSafeObjectKey(parentId)) state.parentByAgentId[node.agentId] = parentId;

	const safeChildren = node.children.filter((child) => isSafeObjectKey(child.agentId));
	state.childrenByAgentId[node.agentId] = safeChildren.map((child) => child.agentId);
	state.timelineByAgentId[node.agentId] = node.timeline.filter((entry) => {
		if (entry.type === 'child') return isSafeObjectKey(entry.agentId);
		if (entry.type === 'tool-call') return isSafeObjectKey(entry.toolCallId);
		return true;
	});
	const safeToolCalls = node.toolCalls.filter((toolCall) => isSafeObjectKey(toolCall.toolCallId));
	state.toolCallIdsByAgentId[node.agentId] = safeToolCalls.map((toolCall) => toolCall.toolCallId);
	for (const tc of safeToolCalls) {
		state.toolCallsById[tc.toolCallId] = { ...tc };
	}
	for (const child of safeChildren) {
		populateRunStateFromNode(state, child, node.agentId);
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
		runState: state.runStateByGroupId[groupId],
		groupId,
	};
}

// ---------------------------------------------------------------------------
// Main reducer
// ---------------------------------------------------------------------------

/** Mutates state.messages in-place. Returns the new activeRunId (may differ from input). */
export function handleEvent(state: InstanceAiReducerState, event: InstanceAiEvent): string | null {
	// Ensure maps exist (backward compat)
	if (!state.groupIdByRunId) state.groupIdByRunId = {};
	if (!state.runStateByGroupId) state.runStateByGroupId = {};
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
				const runState = state.runStateByGroupId[messageGroupId];
				if (runState) {
					// Re-activate root orchestrator — do NOT call reduceRunEvent
					// which would wipe the agent tree.
					runState.status = 'active';
					const root = findAgent(runState, runState.rootAgentId);
					if (root) root.status = 'active';
				}
				existingMsg.runId = event.runId;
				existingMsg.isStreaming = true;
				if (runState) syncAgentTree(existingMsg, runState);
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
				if (msg) syncStreamingTextNode(msg, runState, event.agentId);
			}
			return state.activeRunId;
		}

		case 'reasoning-delta': {
			const { msg, runState } = resolveTarget(state, event.runId);
			if (runState) {
				reduceRunEvent(runState, event);
				if (msg) syncStreamingReasoningNode(msg, runState, event.agentId);
			}
			return state.activeRunId;
		}

		case 'tool-call':
		case 'tool-result':
		case 'tool-error':
		case 'agent-spawned':
		case 'agent-completed':
		case 'confirmation-request':
		case 'tasks-update': {
			const { msg, runState } = resolveTarget(state, event.runId);
			if (runState) {
				reduceRunEvent(runState, event);
				if (msg) syncAgentTree(msg, runState);
			}
			return state.activeRunId;
		}

		case 'error': {
			const { msg, runState } = resolveTarget(state, event.runId);
			if (runState) {
				reduceRunEvent(runState, event);
				if (msg) {
					const targetAgentId = findAgent(runState, event.agentId)
						? event.agentId
						: runState.rootAgentId;
					syncStreamingTextNode(msg, runState, targetAgentId);
					// Enrich the rendered node with structured error details from HEAD
					const target = findAgentNode(msg, targetAgentId) ?? msg.agentTree;
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
				if (msg) {
					msg.isStreaming = false;
					syncAgentTree(msg, runState);
					// Preserve error status set by a prior 'error' event (don't downgrade)
					const { status, reason } = event.payload;
					if (msg.agentTree && msg.agentTree.status !== 'error' && status === 'error') {
						msg.agentTree.status = 'error';
					}
					if (msg.agentTree && status === 'error' && reason && !msg.agentTree.error) {
						msg.agentTree.error = reason;
					}
				}
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
