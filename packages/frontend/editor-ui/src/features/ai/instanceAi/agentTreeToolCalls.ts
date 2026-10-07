import type {
	InstanceAiAgentNode,
	InstanceAiMessage,
	InstanceAiToolCallState,
} from '@n8n/api-types';

function collectFromNode(node: InstanceAiAgentNode, calls: InstanceAiToolCallState[]): void {
	for (const call of node.toolCalls) calls.push(call);
	for (const child of node.children) collectFromNode(child, calls);
}

/**
 * Every tool call in the messages, including the calls of nested sub-agents.
 * The order is message order, then the calls of a node before the calls of its
 * children. This is not always time order: a parent can call a tool after a
 * child finished. Callers that need the most recent call compare
 * `completedAt` when both calls have it, and use this order as the fallback.
 */
export function collectToolCalls(
	messages: ReadonlyArray<Pick<InstanceAiMessage, 'agentTree'>>,
): InstanceAiToolCallState[] {
	const calls: InstanceAiToolCallState[] = [];
	for (const message of messages) {
		if (message.agentTree) collectFromNode(message.agentTree, calls);
	}
	return calls;
}
