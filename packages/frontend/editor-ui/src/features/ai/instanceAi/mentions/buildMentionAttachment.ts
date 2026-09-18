import type { InstanceAiNodesAttachment, InstanceAiWorkflowAttachment } from '@n8n/api-types';

import type {
	InstanceAiDraftMention,
	InstanceAiMentionOrigin,
	InstanceAiMentionSource,
	InstanceAiMentionTarget,
} from './instanceAiMentions.types';

export function buildMentionKey(target: InstanceAiMentionTarget): string {
	switch (target.kind) {
		case 'workflow':
			return `workflow:${target.workflowId}`;
		case 'node':
			return `node:${target.workflowId}:${target.nodeId}`;
		case 'canvas-group':
			return `canvas-group:${target.workflowId}:${target.groupId}`;
	}
}

export function buildMentionAttachment(
	source: InstanceAiMentionSource,
): InstanceAiWorkflowAttachment | InstanceAiNodesAttachment {
	if (source.kind === 'workflow') {
		return { type: 'workflow', id: source.workflowId, name: source.workflowName };
	}

	if (source.kind === 'node') {
		return {
			type: 'nodes',
			workflowId: source.workflowId,
			workflowName: source.workflowName,
			sets: [
				{
					selectionKind: 'nodes',
					nodes: [source.node],
				},
			],
		};
	}

	if (source.nodes.length === 0 || source.nodes.length > 50) {
		throw new Error('Canvas groups must contain between 1 and 50 nodes');
	}

	return {
		type: 'nodes',
		workflowId: source.workflowId,
		workflowName: source.workflowName,
		sets: [
			{
				selectionKind: 'canvas-group',
				canvasGroupId: source.groupId,
				canvasGroupName: source.groupName,
				nodes: source.nodes,
			},
		],
	};
}

export function buildDraftMention(
	source: InstanceAiMentionSource,
	origin: InstanceAiMentionOrigin,
): InstanceAiDraftMention {
	const target: InstanceAiMentionTarget =
		source.kind === 'workflow'
			? { kind: 'workflow', workflowId: source.workflowId }
			: source.kind === 'node'
				? { kind: 'node', workflowId: source.workflowId, nodeId: source.node.id }
				: { kind: 'canvas-group', workflowId: source.workflowId, groupId: source.groupId };
	const label =
		source.kind === 'workflow'
			? source.workflowName
			: source.kind === 'node'
				? source.node.name
				: source.groupName;

	return {
		key: buildMentionKey(target),
		target,
		label,
		...(source.kind === 'workflow' ? {} : { parentLabel: source.workflowName }),
		origin,
		attachment: buildMentionAttachment(source),
	};
}
