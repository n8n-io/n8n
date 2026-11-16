import type { InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';

import type { ArtifactToolCall, ArtifactTurn } from './artifactTurns';

/**
 * Flattens the agent tree of the current runtime into the input of the
 * artifact readers. The Agents runtime maps its chat messages to the same
 * input, so this adapter goes away with the agent tree.
 */

/**
 * A node's own calls come before the calls of its sub-agents: the agent
 * delegates to a sub-agent, so the sub-agent's results are more recent.
 */
function collectToolCalls(node: InstanceAiAgentNode, toolCalls: ArtifactToolCall[]): void {
	// The tool call state of this runtime already has the fields of an artifact tool call.
	toolCalls.push(...node.toolCalls);
	for (const child of node.children) collectToolCalls(child, toolCalls);
}

function treeFields(
	tree: InstanceAiAgentNode | undefined,
): Pick<ArtifactTurn, 'isLive' | 'toolCalls' | 'announcedWorkflowId'> {
	if (!tree) return { isLive: false, toolCalls: [] };
	const toolCalls: ArtifactToolCall[] = [];
	collectToolCalls(tree, toolCalls);
	const announcedWorkflowId = tree.latestSetupAnnouncement?.workflowId;
	return {
		isLive: tree.status === 'active',
		toolCalls,
		...(announcedWorkflowId ? { announcedWorkflowId } : {}),
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
