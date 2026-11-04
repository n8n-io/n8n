import type {
	InstanceAiAgentNode,
	InstanceAiMessage,
	InstanceAiToolCallState,
} from '@n8n/api-types';

import type { ArtifactSubAgentTarget, ArtifactToolCall, ArtifactTurn } from './artifactTurns';

/**
 * Flattens the agent tree of the current runtime into the input of the
 * artifact readers. The Agents runtime maps its chat messages to the same
 * input, so this adapter goes away with the agent tree.
 */

function subAgentTargetOf(node: InstanceAiAgentNode): ArtifactSubAgentTarget | undefined {
	if (!node.targetResource?.id) return undefined;
	return { ...node.targetResource, ...(node.activity ? { activity: node.activity } : {}) };
}

function toArtifactToolCall(
	toolCall: InstanceAiToolCallState,
	subAgentTarget: ArtifactSubAgentTarget | undefined,
): ArtifactToolCall {
	return {
		toolCallId: toolCall.toolCallId,
		toolName: toolCall.toolName,
		args: toolCall.args,
		result: toolCall.result,
		error: toolCall.error,
		isLoading: toolCall.isLoading,
		startedAt: toolCall.startedAt,
		...(subAgentTarget ? { subAgentTarget } : {}),
	};
}

/**
 * A node's own calls come before the calls of its sub-agents: the agent
 * delegates to a sub-agent, so the sub-agent's results are more recent.
 * A call gets the target of its own node, else the target of the latest
 * sub-agent that the node spawned (an old spawning tool result has no
 * resource id), else the target of a parent. Returns the target that the
 * node's calls got.
 */
function collectToolCalls(
	node: InstanceAiAgentNode,
	inheritedTarget: ArtifactSubAgentTarget | undefined,
	toolCalls: ArtifactToolCall[],
	targets: ArtifactSubAgentTarget[],
): ArtifactSubAgentTarget | undefined {
	const ownTarget = subAgentTargetOf(node);
	if (ownTarget) targets.push(ownTarget);
	const childCalls: ArtifactToolCall[] = [];
	let childTarget: ArtifactSubAgentTarget | undefined;
	for (const child of node.children) {
		childTarget =
			collectToolCalls(child, ownTarget ?? inheritedTarget, childCalls, targets) ?? childTarget;
	}
	const target = ownTarget ?? childTarget ?? inheritedTarget;
	for (const toolCall of node.toolCalls) toolCalls.push(toArtifactToolCall(toolCall, target));
	toolCalls.push(...childCalls);
	return target;
}

function treeFields(
	tree: InstanceAiAgentNode | undefined,
): Pick<ArtifactTurn, 'isLive' | 'toolCalls' | 'setupAnnouncement' | 'subAgentTargets'> {
	if (!tree) return { isLive: false, toolCalls: [] };
	const toolCalls: ArtifactToolCall[] = [];
	const subAgentTargets: ArtifactSubAgentTarget[] = [];
	collectToolCalls(tree, undefined, toolCalls, subAgentTargets);
	const announcement = tree.latestSetupAnnouncement;
	return {
		isLive: tree.status === 'active',
		toolCalls,
		...(subAgentTargets.length > 0 ? { subAgentTargets } : {}),
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
