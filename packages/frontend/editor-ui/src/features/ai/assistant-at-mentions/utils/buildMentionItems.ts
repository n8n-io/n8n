import type { IWorkflowDb } from '@/Interface';

import type {
	AssistantMentionItem,
	AssistantMentionKind,
	AssistantMentionSourceId,
	WorkflowArtifactIndex,
	WorkflowArtifactReference,
} from '../assistantAtMentions.types';

export const MAX_MENTION_RESULTS = 10;

export function buildMentionKey(
	kind: AssistantMentionKind,
	workflowId: string,
	entityId: string,
): string {
	return `${kind}:${workflowId}:${entityId}`;
}

export function buildWorkflowMentionItem(
	workflow: Pick<IWorkflowDb, 'id' | 'name' | 'description'>,
	source: AssistantMentionSourceId,
): AssistantMentionItem {
	return {
		key: buildMentionKey('workflow', workflow.id, workflow.id),
		kind: 'workflow',
		source,
		label: workflow.name,
		breadcrumbs: [workflow.name],
		workflowId: workflow.id,
		entityId: workflow.id,
		workflowName: workflow.name,
		...(workflow.description ? { description: workflow.description } : {}),
	};
}

function buildNodeMentionItem(
	index: WorkflowArtifactIndex,
	nodeId: string,
	groupId?: string,
): AssistantMentionItem | undefined {
	const node = index.nodesById.get(nodeId);
	if (!node) return undefined;

	const group = groupId ? index.groupsById.get(groupId) : undefined;
	return {
		key: buildMentionKey('node', index.workflowId, node.id),
		kind: 'node',
		source: 'artifacts',
		label: node.name,
		breadcrumbs: [index.workflowName, ...(group ? [group.name] : []), node.name],
		workflowId: index.workflowId,
		entityId: node.id,
		workflowName: index.workflowName,
		...(group ? { groupId: group.id, groupName: group.name } : {}),
		nodeTypeName: node.type,
		nodeTypeVersion: node.typeVersion,
	};
}

function buildGroupMentionItem(
	index: WorkflowArtifactIndex,
	groupId: string,
	includeChildren: boolean,
	excludedKeys?: ReadonlySet<string>,
): AssistantMentionItem | undefined {
	const group = index.groupsById.get(groupId);
	if (!group) return undefined;

	const children = includeChildren
		? group.nodeIds
				.map((nodeId) => buildNodeMentionItem(index, nodeId, group.id))
				.filter(
					(item): item is AssistantMentionItem =>
						item !== undefined && !excludedKeys?.has(item.key),
				)
				.slice(0, MAX_MENTION_RESULTS)
		: undefined;

	return {
		key: buildMentionKey('group', index.workflowId, group.id),
		kind: 'group',
		source: 'artifacts',
		label: group.name,
		breadcrumbs: [index.workflowName, group.name],
		workflowId: index.workflowId,
		entityId: group.id,
		workflowName: index.workflowName,
		groupId: group.id,
		groupName: group.name,
		nodeCount: group.nodeIds.length,
		...(includeChildren
			? { hasChildren: Boolean(children?.length), ...(children ? { children } : {}) }
			: {}),
	};
}

function buildArtifactWorkflowItem(
	artifact: WorkflowArtifactReference,
	index?: WorkflowArtifactIndex,
	includeChildren = true,
	excludedKeys?: ReadonlySet<string>,
): AssistantMentionItem {
	const workflowName = index?.workflowName ?? artifact.name;
	const children =
		includeChildren && index
			? [
					...index.groups.map((group) =>
						buildGroupMentionItem(index, group.id, true, excludedKeys),
					),
					...index.nodes
						.filter((node) => !index.nodeIdToGroupId.has(node.id))
						.map((node) => buildNodeMentionItem(index, node.id)),
				]
					.filter(
						(item): item is AssistantMentionItem =>
							item !== undefined &&
							(!excludedKeys?.has(item.key) || Boolean(item.hasChildren && item.children?.length)),
					)
					.slice(0, MAX_MENTION_RESULTS)
			: undefined;

	return {
		key: buildMentionKey('workflow', artifact.id, artifact.id),
		kind: 'workflow',
		source: 'artifacts',
		label: workflowName,
		breadcrumbs: [workflowName],
		workflowId: artifact.id,
		entityId: artifact.id,
		workflowName,
		...(index ? { nodeCount: index.nodes.length } : {}),
		...(includeChildren
			? { hasChildren: index ? Boolean(children?.length) : true, ...(children ? { children } : {}) }
			: {}),
	};
}

export function buildArtifactBrowseItems(
	artifacts: readonly WorkflowArtifactReference[],
	getIndex: (workflowId: string) => WorkflowArtifactIndex | undefined,
	excludedKeys?: ReadonlySet<string>,
): AssistantMentionItem[] {
	const items: AssistantMentionItem[] = [];
	for (const artifact of artifacts) {
		const item = buildArtifactWorkflowItem(artifact, getIndex(artifact.id), true, excludedKeys);
		if (excludedKeys?.has(item.key) && !item.hasChildren) continue;
		items.push(item);
		if (items.length === MAX_MENTION_RESULTS) break;
	}
	return items;
}

export function buildArtifactSearchItems(
	artifacts: readonly WorkflowArtifactReference[],
	getIndex: (workflowId: string) => WorkflowArtifactIndex | undefined,
	excludedKeys?: ReadonlySet<string>,
): AssistantMentionItem[] {
	const items: AssistantMentionItem[] = [];

	for (const artifact of artifacts) {
		const index = getIndex(artifact.id);
		const workflowItem = buildArtifactWorkflowItem(artifact, index, false);
		if (!excludedKeys?.has(workflowItem.key)) items.push(workflowItem);
		if (!index) continue;

		for (const group of index.groups) {
			const item = buildGroupMentionItem(index, group.id, false);
			if (item && !excludedKeys?.has(item.key)) items.push(item);
		}

		for (const node of index.nodes) {
			const item = buildNodeMentionItem(index, node.id, index.nodeIdToGroupId.get(node.id));
			if (item && !excludedKeys?.has(item.key)) items.push(item);
		}
	}

	return items;
}
