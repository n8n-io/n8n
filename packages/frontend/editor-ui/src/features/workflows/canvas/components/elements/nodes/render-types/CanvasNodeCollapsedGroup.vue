<script setup lang="ts">
import { computed } from 'vue';
import { Position } from '@vue-flow/core';
import { useI18n } from '@n8n/i18n';
import { N8nActionDropdown, N8nIconButton, type ActionDropdownItem } from '@n8n/design-system';
import { NodeConnectionTypes } from 'n8n-workflow';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { getNodeIconSource, type NodeIconSource } from '@/app/utils/nodeIcon';
import { useCanvasNode } from '../../../../composables/useCanvasNode';
import { CanvasConnectionMode, CanvasNodeRenderType } from '../../../../canvas.types';
import type { CanvasElementPortWithRenderData } from '../../../../canvas.types';
import {
	GROUP_COLLAPSED_WIDTH,
	GROUP_COLLAPSED_HEIGHT,
} from '../../../../stores/canvasNodeGroups.constants';
import CanvasHandleRenderer from '../../handles/CanvasHandleRenderer.vue';

const emit = defineEmits<{
	'open:contextmenu': [event: MouseEvent];
}>();

const i18n = useI18n();
const workflowDocumentStore = injectWorkflowDocumentStore();
const ndvStore = injectNDVStore();
const nodeTypesStore = useNodeTypesStore();
const { render, isReadOnly, isSelected } = useCanvasNode();

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

interface PinnedNodeDisplay {
	id: string;
	name: string;
	iconSource: NodeIconSource | undefined;
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

		<div :class="$style.header">
			<N8nIconButton
				v-if="!isReadOnly"
				:class="$style.expandToggle"
				variant="ghost"
				icon="chevrons-up-down"
				:aria-label="i18n.baseText('canvas.nodeGroup.expand')"
				data-test-id="canvas-collapsed-group-expand"
				@click.stop="onExpand"
				@mousedown.stop
			/>
			<span :class="$style.title" data-test-id="canvas-collapsed-group-title">{{
				options.title
			}}</span>
			<!-- Stop propagation on the wrapper (not the button): the dropdown's
				trigger is a descendant and opens first, then we halt the event so it
				doesn't reach Vue Flow's node drag/select. Stopping on the button
				itself would swallow the click before the trigger sees it. -->
			<div
				v-if="canPickNodes"
				:class="$style.pinButton"
				@pointerdown.stop
				@mousedown.stop
				@click.stop
				@dblclick.stop
			>
				<N8nActionDropdown
					:items="pickableItems"
					placement="bottom-end"
					data-test-id="canvas-collapsed-group-pin"
					@select="onPickNode"
				>
					<template #activator>
						<N8nIconButton
							variant="ghost"
							icon="plus"
							:aria-label="i18n.baseText('canvas.nodeGroup.pinNode')"
						/>
					</template>
					<template #menuItem="item">
						<span :class="$style.menuItem">
							<NodeIcon :icon-source="iconSourceForNodeId(item.id)" :size="14" />
							<span :class="$style.menuItemLabel">{{ item.label }}</span>
						</span>
					</template>
				</N8nActionDropdown>
			</div>
		</div>

		<ul
			v-if="pinnedNodes.length"
			:class="$style.pinnedList"
			data-test-id="canvas-collapsed-group-pinned"
		>
			<li
				v-for="pinned in pinnedNodes"
				:key="pinned.id"
				:class="$style.pinnedItem"
				data-test-id="canvas-collapsed-group-pinned-item"
				@pointerdown.stop
				@mousedown.stop
				@click.stop="onOpenNode(pinned.name)"
			>
				<div :class="$style.iconWrapper">
					<NodeIcon :icon-source="pinned.iconSource" :size="14" />
				</div>
				<span :class="$style.pinnedName">{{ pinned.name }}</span>
				<N8nIconButton
					v-if="!isReadOnly"
					:class="$style.unpinButton"
					variant="ghost"
					size="small"
					icon="x"
					:aria-label="i18n.baseText('canvas.nodeGroup.unpinNode')"
					data-test-id="canvas-collapsed-group-unpin"
					@click.stop="onUnpinNode(pinned.id)"
					@mousedown.stop
					@pointerdown.stop
				/>
			</li>
		</ul>
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

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.expandToggle,
.pinButton {
	flex-shrink: 0;
}

// The "+" picker only appears while hovering the collapsed box.
.pinButton {
	opacity: 0;
	transition: opacity 0.1s ease-in;
}

.collapsedGroup:hover .pinButton,
.pinButton:focus-within {
	opacity: 1;
}

.title {
	flex: 1;
	min-width: 0;

	white-space: nowrap;
}

.pinnedList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
	margin-top: var(--spacing--xs);
	list-style: none;
}

.pinnedItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) 0;
	border-radius: var(--radius);
	font-weight: var(--font-weight--regular);
	font-size: var(--font-size--sm);
	cursor: pointer;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.iconWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
}

.pinnedName {
	flex: 1;
	min-width: 0;

	text-overflow: ellipsis;
	white-space: nowrap;
}

.unpinButton {
	flex-shrink: 0;
	opacity: 0;
	transition: opacity 0.1s ease-in;
}

.pinnedItem:hover .unpinButton,
.unpinButton:focus-visible {
	opacity: 1;
}

.menuItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.menuItemLabel {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
