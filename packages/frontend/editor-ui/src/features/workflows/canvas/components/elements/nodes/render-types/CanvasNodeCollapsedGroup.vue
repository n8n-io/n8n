<script setup lang="ts">
import { computed } from 'vue';
import { Position } from '@vue-flow/core';
import type { ActionDropdownItem } from '@n8n/design-system';
import { NodeConnectionTypes } from 'n8n-workflow';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getNodeIconSource, type NodeIconSource } from '@/app/utils/nodeIcon';
import { useCanvasNode } from '../../../../composables/useCanvasNode';
import { CanvasConnectionMode, CanvasNodeRenderType } from '../../../../canvas.types';
import type { CanvasElementPortWithRenderData } from '../../../../canvas.types';
import {
	GROUP_COLLAPSED_WIDTH,
	GROUP_COLLAPSED_HEIGHT,
} from '../../../../stores/canvasNodeGroups.constants';
import CanvasHandleRenderer from '../../handles/CanvasHandleRenderer.vue';
import { useGroupCardVariant } from './group-card-variants/useGroupCardVariant';
import type { PinnedNodeDisplay } from './group-card-variants/types';

const emit = defineEmits<{
	'open:contextmenu': [event: MouseEvent];
}>();

const workflowDocumentStore = injectWorkflowDocumentStore();
const ndvStore = injectNDVStore();
const nodeTypesStore = useNodeTypesStore();
const { render, isReadOnly, isSelected } = useCanvasNode();

// PROTOTYPE: which collapsed group-card design is currently active.
const { activeVariant } = useGroupCardVariant();

const options = computed(() =>
	render.value.type === CanvasNodeRenderType.CollapsedGroup ? render.value.options : null,
);

const incoming = computed(() => options.value?.incoming ?? []);
const outgoing = computed(() => options.value?.outgoing ?? []);

// Distribute handles evenly down the left/right edge.
function handleTop(index: number, count: number): string {
	return `${((index + 1) / (count + 1)) * 100}%`;
}

// Build the same port render-data shape a normal node feeds to
// CanvasHandleRenderer, so the connector dots use identical styling. They are
// always "connected" (each represents real external connections), which also
// hides the "+" add affordance. New connections aren't allowed from the box.
function toPort(
	handle: { handleId: string; type: CanvasElementPortWithRenderData['type'] },
	index: number,
	count: number,
	position: Position,
): CanvasElementPortWithRenderData {
	return {
		type: handle.type,
		index,
		handleId: handle.handleId,
		connectionsCount: 1,
		isConnecting: false,
		position,
		offset: { top: handleTop(index, count) },
	};
}

const incomingPorts = computed(() =>
	incoming.value.map((handle, index) =>
		toPort(handle, index, incoming.value.length, Position.Left),
	),
);
const outgoingPorts = computed(() =>
	outgoing.value.map((handle, index) =>
		toPort(handle, index, outgoing.value.length, Position.Right),
	),
);

function noValidConnection(): boolean {
	return false;
}

const currentGroup = computed(() => {
	const groupId = options.value?.groupId;
	return groupId ? workflowDocumentStore.value.getGroupById(groupId) : undefined;
});

const description = computed(() => currentGroup.value?.description ?? '');

// All member nodes (id + name) — used by the V3 variant to resolve services and
// click-to-open. Cheap; ignored by V1/V2.
const memberNodes = computed<Array<{ id: string; name: string }>>(() => {
	const group = currentGroup.value;
	if (!group) return [];
	const store = workflowDocumentStore.value;
	return group.nodeIds
		.map((nodeId) => {
			const node = store.getNodeById(nodeId);
			return node ? { id: nodeId, name: node.name } : undefined;
		})
		.filter((entry): entry is { id: string; name: string } => entry !== undefined);
});

function iconSourceForNodeId(nodeId: string): NodeIconSource | undefined {
	const node = workflowDocumentStore.value.getNodeById(nodeId);
	if (!node) return undefined;
	const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
	return getNodeIconSource(nodeType, node, workflowDocumentStore.value.getExpressionHandler());
}

// Execution-order rank: a node executes after all its main-connection
// ancestors, so a node always has strictly more ancestors than any of its
// predecessors — making the ancestor count a valid topological sort key.
function executionRank(nodeName: string): number {
	return workflowDocumentStore.value.getParentNodes(nodeName, NodeConnectionTypes.Main, -1).length;
}

// Nodes the user chose to surface on the box, shown as icon + name in
// execution order (not the order they were pinned).
const pinnedNodes = computed<PinnedNodeDisplay[]>(() => {
	const group = currentGroup.value;
	if (!group?.pinnedNodeIds?.length) return [];
	const store = workflowDocumentStore.value;
	const entries: Array<PinnedNodeDisplay & { rank: number }> = [];
	for (const id of group.pinnedNodeIds) {
		const node = store.getNodeById(id);
		if (!node) continue;
		entries.push({
			id,
			name: node.name,
			iconSource: iconSourceForNodeId(id),
			rank: executionRank(node.name),
		});
	}
	// Array.sort is stable, so equal-rank nodes keep their pinned order.
	entries.sort((a, b) => a.rank - b.rank);
	return entries.map(({ id, name, iconSource }) => ({ id, name, iconSource }));
});

// Direct member nodes (sub-nodes excluded) not already pinned, in execution
// order — the options the "+" picker offers.
const pickableItems = computed<Array<ActionDropdownItem<string>>>(() => {
	const group = currentGroup.value;
	if (!group) return [];
	const store = workflowDocumentStore.value;
	const pinned = new Set(group.pinnedNodeIds ?? []);
	const items: Array<ActionDropdownItem<string> & { rank: number }> = [];
	for (const nodeId of group.nodeIds) {
		if (pinned.has(nodeId)) continue;
		const node = store.getNodeById(nodeId);
		if (!node) continue;
		// A sub-node (model/memory/tool) feeds its host via a non-main OUTGOING
		// connection, so it has non-main children; a regular node does not.
		if (store.getChildNodes(node.name, 'ALL_NON_MAIN', 1).length > 0) continue;
		items.push({ id: nodeId, label: node.name, rank: executionRank(node.name) });
	}
	items.sort((a, b) => a.rank - b.rank);
	return items.map(({ id, label }) => ({ id, label }));
});

const canPickNodes = computed(() => !isReadOnly.value && pickableItems.value.length > 0);

function onExpand() {
	const groupId = options.value?.groupId;
	if (!groupId || isReadOnly.value) return;
	workflowDocumentStore.value.setGroupCollapsed(groupId, false);
}

function onContextMenu(event: MouseEvent) {
	emit('open:contextmenu', event);
}

function onPickNode(nodeId: string) {
	const groupId = options.value?.groupId;
	if (!groupId) return;
	workflowDocumentStore.value.addPinnedNodeToGroup(groupId, nodeId);
}

function onOpenNode(name: string) {
	ndvStore.value.setActiveNodeName(name, 'other');
}

function onUnpinNode(nodeId: string) {
	const groupId = options.value?.groupId;
	if (!groupId) return;
	workflowDocumentStore.value.removePinnedNodeFromGroup(groupId, nodeId);
}
</script>

<template>
	<div
		v-if="options"
		:class="[$style.collapsedGroup, { [$style.selected]: isSelected }]"
		:style="{ width: `${GROUP_COLLAPSED_WIDTH}px`, minHeight: `${GROUP_COLLAPSED_HEIGHT}px` }"
		data-test-id="canvas-collapsed-group"
		:data-group-id="options.groupId"
		@contextmenu="onContextMenu"
		@dblclick.stop="onExpand"
	>
		<CanvasHandleRenderer
			v-for="port in incomingPorts"
			:key="port.handleId"
			v-bind="port"
			:mode="CanvasConnectionMode.Input"
			:is-read-only="isReadOnly"
			:is-valid-connection="noValidConnection"
		/>
		<CanvasHandleRenderer
			v-for="port in outgoingPorts"
			:key="port.handleId"
			v-bind="port"
			:mode="CanvasConnectionMode.Output"
			:is-read-only="isReadOnly"
			:is-valid-connection="noValidConnection"
		/>

		<!-- PROTOTYPE: the visible card body is supplied by the active variant.
			This container owns all data/logic (handles, pinned nodes, expand) and
			feeds variants props + events. See group-card-variants/registry.ts. -->
		<component
			:is="activeVariant.component"
			:title="options.title"
			:description="description"
			:is-read-only="isReadOnly"
			:pinned-nodes="pinnedNodes"
			:pickable-items="pickableItems"
			:can-pick-nodes="canPickNodes"
			:icon-source-for-node-id="iconSourceForNodeId"
			:group-id="options.groupId"
			:member-nodes="memberNodes"
			@expand="onExpand"
			@pick-node="onPickNode"
			@open-node="onOpenNode"
			@unpin-node="onUnpinNode"
		/>
	</div>
</template>

<style lang="scss" module>
.collapsedGroup {
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--lg);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
	padding: var(--spacing--lg) var(--spacing--md);
}

.selected {
	/* stylelint-disable-next-line @n8n/css-var-naming */
	box-shadow: 0 0 0 calc(6px * var(--canvas-zoom-compensation-factor, 1))
		var(--canvas--color--selected-transparent);
}
</style>
