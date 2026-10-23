import { MAX_INSTANCE_AI_NODES_PER_SET, type InstanceAiResourceAttachment } from '@n8n/api-types';

import type {
	AssistantMentionItem,
	AssistantMentionSelection,
	WorkflowArtifactIndex,
} from '../assistantAtMentions.types';

export function buildMentionAttachment(
	item: AssistantMentionItem,
	index?: WorkflowArtifactIndex,
): AssistantMentionSelection | undefined {
	if (item.kind === 'workflow') {
		return {
			item,
			attachment: {
				type: 'workflow',
				id: item.workflowId,
				name: item.workflowName,
			},
			truncated: false,
		};
	}

	if (item.kind === 'node') {
		return {
			item,
			attachment: {
				type: 'nodes',
				workflowId: item.workflowId,
				workflowName: item.workflowName,
				sets: [{ nodes: [{ id: item.entityId, name: item.label }] }],
			},
			truncated: false,
		};
	}

	const group = index?.groupsById.get(item.entityId);
	if (!group || !index) return undefined;
	const groupNodes = group.nodeIds
		.map((nodeId) => index.nodesById.get(nodeId))
		.filter((node) => node !== undefined);
	const nodes = groupNodes
		.slice(0, MAX_INSTANCE_AI_NODES_PER_SET)
		.map(({ id, name }) => ({ id, name }));
	if (nodes.length === 0) return undefined;

	const attachment: InstanceAiResourceAttachment = {
		type: 'nodes',
		workflowId: item.workflowId,
		workflowName: item.workflowName,
		sets: [
			{
				nodes,
				canvasGroupId: group.id,
				canvasGroupName: group.name,
			},
		],
	};

	return { item, attachment, truncated: groupNodes.length > MAX_INSTANCE_AI_NODES_PER_SET };
}
