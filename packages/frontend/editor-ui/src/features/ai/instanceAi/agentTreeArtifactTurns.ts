import type {
	InstanceAiAgentNode,
	InstanceAiMessage,
	InstanceAiToolCallState,
} from '@n8n/api-types';

import type { ArtifactToolCall, ArtifactTurn } from './artifactTurns';

/**
 * Flattens the agent tree of the current runtime into the input of the
 * artifact readers. The Agents runtime maps its chat messages to the same
 * input, so this adapter goes away with the agent tree.
 */

function toArtifactToolCall(toolCall: InstanceAiToolCallState): ArtifactToolCall {
	return {
		toolCallId: toolCall.toolCallId,
		toolName: toolCall.toolName,
		args: toolCall.args,
		result: toolCall.result,
		error: toolCall.error,
		isLoading: toolCall.isLoading,
		startedAt: toolCall.startedAt,
	};
}

/**
 * A node's own calls come before the calls of its sub-agents: the agent
 * delegates to a sub-agent, so the sub-agent's results are more recent.
 */
function collectToolCalls(node: InstanceAiAgentNode, toolCalls: ArtifactToolCall[]): void {
	for (const toolCall of node.toolCalls) toolCalls.push(toArtifactToolCall(toolCall));
	for (const child of node.children) collectToolCalls(child, toolCalls);
}

function treeFields(
	tree: InstanceAiAgentNode | undefined,
): Pick<ArtifactTurn, 'isLive' | 'toolCalls' | 'setupAnnouncement'> {
	if (!tree) return { isLive: false, toolCalls: [] };
	const toolCalls: ArtifactToolCall[] = [];
	collectToolCalls(tree, toolCalls);
	const announcement = tree.latestSetupAnnouncement;
	return {
		isLive: tree.status === 'active',
		toolCalls,
		...(announcement
			? {
					setupAnnouncement: {
						workflowId: announcement.workflowId,
						timestamp: announcement.timestamp,
					},
				}
			: {}),
	};
}

export function toArtifactTurns(messages: readonly InstanceAiMessage[]): ArtifactTurn[] {
	return messages.map((message) => ({
		id: message.id,
		role: message.role,
		...treeFields(message.agentTree),
		...(message.attachments ? { attachments: message.attachments } : {}),
		...(message.context ? { context: message.context } : {}),
	}));
}

/** One assistant turn from a single agent tree. */
export function agentTreeToArtifactTurns(tree: InstanceAiAgentNode): ArtifactTurn[] {
	return [{ id: tree.agentId, role: 'assistant', ...treeFields(tree) }];
}
