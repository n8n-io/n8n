import type { InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';

/** True when the agent node is the workflow-builder sub-agent. */
export function isBuilderAgent(node: InstanceAiAgentNode): boolean {
	return node.kind === 'builder' || node.role === 'workflow-builder';
}

/** True when the node is a builder sub-agent that is currently running. */
export function isActiveBuilderAgent(node: InstanceAiAgentNode): boolean {
	return isBuilderAgent(node) && node.status === 'active';
}

/**
 * True when the message would produce visible output in the message list.
 *
 * Assistant messages whose only renderable content has been extracted to the
 * bottom builder section (or which haven't produced anything yet) would
 * otherwise leave an empty wrapper — this predicate filters them out.
 */
export function messageHasVisibleContent(message: InstanceAiMessage): boolean {
	if (message.role === 'user') return true;
	if (message.content) return true;

	const tree = message.agentTree;
	if (!tree) {
		// No tree — only the blinking cursor would render, during streaming.
		return message.isStreaming;
	}

	if (tree.reasoning) return true;
	if (tree.statusMessage) return true;
	if (tree.status === 'error' && tree.error) return true;

	// Background task chip: shown after the orchestrator stops streaming while
	// a non-builder child is still running (builders are rendered separately).
	if (
		!message.isStreaming &&
		tree.children.some((c) => c.status === 'active' && !isBuilderAgent(c))
	) {
		return true;
	}

	// Any timeline entry that isn't a hoisted active builder counts as content.
	const childrenById: Record<string, InstanceAiAgentNode> = {};
	for (const c of tree.children) childrenById[c.agentId] = c;
	return tree.timeline.some((e) => {
		if (e.type !== 'child') return true;
		const child = childrenById[e.agentId];
		return !child || !isActiveBuilderAgent(child);
	});
}

/**
 * Identity-stable getter over the visible-message list, for use inside a
 * `computed`. The filter reads per-message content, so it re-evaluates on
 * every streamed token — but its RESULT only changes when a message appears,
 * disappears, or flips visibility. Returning the previous array in the
 * unchanged case cuts reactive propagation at the computed, so the message
 * list does not re-render (and re-diff every message's vnodes) per token.
 */
export function createVisibleMessagesGetter(
	messages: () => InstanceAiMessage[],
): () => InstanceAiMessage[] {
	let prev: InstanceAiMessage[] = [];
	return () => {
		const next = messages().filter(messageHasVisibleContent);
		if (next.length === prev.length && next.every((msg, i) => msg === prev[i])) return prev;
		prev = next;
		return next;
	};
}

/**
 * Walks every message's agent tree and returns active builder sub-agents in
 * the order they appear. Used to render running builders in a dedicated bottom
 * section of the conversation; completed builders stay in their natural slot.
 */
export function collectActiveBuilderAgents(messages: InstanceAiMessage[]): InstanceAiAgentNode[] {
	const result: InstanceAiAgentNode[] = [];
	const visit = (node: InstanceAiAgentNode) => {
		if (isActiveBuilderAgent(node)) result.push(node);
		for (const child of node.children) visit(child);
	};
	for (const m of messages) {
		if (m.agentTree) visit(m.agentTree);
	}
	return result;
}
