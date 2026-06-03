<script setup lang="ts">
import { computed } from 'vue';
import { Position } from '@vue-flow/core';
import { useI18n } from '@n8n/i18n';
import {
	N8nActionDropdown,
	N8nIconButton,
	N8nTooltip,
	type ActionDropdownItem,
} from '@n8n/design-system';

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

interface ServiceGroup {
	key: string;
	name: string;
	iconSource: NodeIconSource;
	nodes: Array<{ id: string; name: string }>;
}

// The group's contents reduced to a set of "services" — one entry per unique
// icon. A node counts as a service when it's an external app (file/brand icon)
// OR an agent/host (a node that accepts sub-nodes, i.e. has non-main inputs),
// even though agents are core nodes. Sub-nodes (model/memory/tools feeding a
// host via a non-main output) are always excluded. Nodes sharing an icon are
// grouped so the icon can surface its node list on hover/click.
const services = computed<ServiceGroup[]>(() => {
	const group = currentGroup.value;
	if (!group) return [];
	const store = workflowDocumentStore.value;
	const expression = store.getExpressionHandler();
	const byKey = new Map<string, ServiceGroup>();

	for (const nodeId of group.nodeIds) {
		const node = store.getNodeById(nodeId);
		if (!node) continue;

		// Sub-nodes feed their host via a non-main outgoing connection — skip them.
		if (store.getChildNodes(node.name, 'ALL_NON_MAIN', 1).length > 0) continue;

		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		const iconSource = getNodeIconSource(nodeType, node, expression);
		if (!iconSource) continue;

		// Hosts/agents accept sub-nodes (non-main inputs) — include them even
		// though their icon is a core font icon.
		const isHost = store.getParentNodes(node.name, 'ALL_NON_MAIN', 1).length > 0;
		if (iconSource.type !== 'file' && !isHost) continue;

		const key = iconSource.type === 'file' ? `file:${iconSource.src}` : `icon:${iconSource.name}`;
		let service = byKey.get(key);
		if (!service) {
			service = { key, name: nodeType?.displayName ?? node.type, iconSource, nodes: [] };
			byKey.set(key, service);
		}
		service.nodes.push({ id: node.id, name: node.name });
	}

	return [...byKey.values()];
});

function serviceTooltip(service: ServiceGroup): string {
	return i18n.baseText('canvas.nodeGroup.serviceNodeCount', {
		adjustToNumber: service.nodes.length,
		interpolate: { name: service.name, count: service.nodes.length },
	});
}

function dropdownItems(service: ServiceGroup): Array<ActionDropdownItem<string>> {
	return service.nodes.map((node) => ({ id: node.id, label: node.name }));
}

function onExpand() {
	const groupId = options.value?.groupId;
	if (!groupId || isReadOnly.value) return;
	workflowDocumentStore.value.setGroupCollapsed(groupId, false);
}

function onContextMenu(event: MouseEvent) {
	emit('open:contextmenu', event);
}

function onOpenNode(nodeId: string) {
	const node = workflowDocumentStore.value.getNodeById(nodeId);
	if (node) ndvStore.value.setActiveNodeName(node.name, 'other');
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
		</div>

		<div
			v-if="services.length"
			:class="$style.serviceIcons"
			data-test-id="canvas-collapsed-group-services"
		>
			<!-- `nodrag` stops the group box from being dragged when interacting
				with an icon (without swallowing pointerdown, which the open dropdown
				needs to detect an outside click and close). @click/@dblclick.stop keep
				the click from selecting / expanding the group. -->
			<div
				v-for="service in services"
				:key="service.key"
				:class="[$style.serviceIcon, 'nodrag']"
				@click.stop
				@dblclick.stop
			>
				<!-- One node: clicking the icon opens its NDV directly. -->
				<N8nTooltip v-if="service.nodes.length === 1" :content="serviceTooltip(service)">
					<button
						:class="$style.iconButton"
						type="button"
						data-test-id="canvas-collapsed-group-service"
						@click="onOpenNode(service.nodes[0].id)"
					>
						<NodeIcon :icon-source="service.iconSource" :size="20" />
					</button>
				</N8nTooltip>

				<!-- Multiple nodes: clicking the icon opens a dropdown of the nodes. -->
				<N8nActionDropdown
					v-else
					:items="dropdownItems(service)"
					placement="bottom-start"
					data-test-id="canvas-collapsed-group-service"
					@select="onOpenNode"
				>
					<template #activator>
						<N8nTooltip :content="serviceTooltip(service)">
							<button :class="$style.iconButton" type="button">
								<NodeIcon :icon-source="service.iconSource" :size="20" />
							</button>
						</N8nTooltip>
					</template>
					<template #menuItem="item">
						<span :class="$style.menuItem">
							<NodeIcon :icon-source="service.iconSource" :size="16" />
							<span :class="$style.menuItemLabel">{{ item.label }}</span>
						</span>
					</template>
				</N8nActionDropdown>
			</div>
		</div>
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

.expandToggle {
	flex-shrink: 0;
}

.title {
	flex: 1;
	min-width: 0;

	white-space: nowrap;
}

.serviceIcons {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: flex-end;
	padding: 0 var(--spacing--xs);
	gap: var(--spacing--xs);
	margin-top: var(--spacing--xs);
}

.serviceIcon {
	display: flex;
}

.iconButton {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--4xs);
	border: 0;
	border-radius: var(--radius);
	background: transparent;
	cursor: pointer;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
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
