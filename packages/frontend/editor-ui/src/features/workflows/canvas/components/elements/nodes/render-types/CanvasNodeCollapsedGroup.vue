<script setup lang="ts">
import { computed } from 'vue';
import { Position } from '@vue-flow/core';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton } from '@n8n/design-system';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useCanvasNode } from '../../../../composables/useCanvasNode';
import { CanvasConnectionMode, CanvasNodeRenderType } from '../../../../canvas.types';
import type { CanvasElementPortWithRenderData } from '../../../../canvas.types';
import {
	GROUP_COLLAPSED_WIDTH,
	GROUP_HEADER_HEIGHT,
} from '../../../../stores/canvasNodeGroups.constants';
import CanvasHandleRenderer from '../../handles/CanvasHandleRenderer.vue';

const emit = defineEmits<{
	'open:contextmenu': [event: MouseEvent];
}>();

const i18n = useI18n();
const workflowDocumentStore = injectWorkflowDocumentStore();
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

function onExpand() {
	const groupId = options.value?.groupId;
	if (!groupId || isReadOnly.value) return;
	workflowDocumentStore.value.setGroupCollapsed(groupId, false);
}

function onContextMenu(event: MouseEvent) {
	emit('open:contextmenu', event);
}
</script>

<template>
	<div
		v-if="options"
		:class="[$style.collapsedGroup, { [$style.selected]: isSelected }]"
		:style="{ width: `${GROUP_COLLAPSED_WIDTH}px`, minHeight: `${GROUP_HEADER_HEIGHT}px` }"
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

		<N8nIconButton
			v-if="!isReadOnly"
			:class="$style.expandToggle"
			variant="ghost"
			size="small"
			icon="chevron-right"
			:aria-label="i18n.baseText('canvas.nodeGroup.expand')"
			data-test-id="canvas-collapsed-group-expand"
			@click.stop="onExpand"
			@mousedown.stop
		/>
		<span :class="$style.title" data-test-id="canvas-collapsed-group-title">{{
			options.title
		}}</span>
	</div>
</template>

<style lang="scss" module>
.collapsedGroup {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 0 var(--spacing--sm);
	box-sizing: border-box;
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--lg);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
}

.selected {
	/* stylelint-disable-next-line @n8n/css-var-naming */
	box-shadow: 0 0 0 calc(6px * var(--canvas-zoom-compensation-factor, 1))
		var(--canvas--color--selected-transparent);
}

.expandToggle {
	flex-shrink: 0;
}

.title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
