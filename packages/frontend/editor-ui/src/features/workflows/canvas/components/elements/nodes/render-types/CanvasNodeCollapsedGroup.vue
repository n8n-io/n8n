<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position } from '@vue-flow/core';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton } from '@n8n/design-system';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useCanvasNode } from '../../../../composables/useCanvasNode';
import { CanvasNodeRenderType } from '../../../../canvas.types';
import {
	GROUP_COLLAPSED_WIDTH,
	GROUP_HEADER_HEIGHT,
} from '../../../../stores/canvasNodeGroups.constants';

const i18n = useI18n();
const workflowDocumentStore = injectWorkflowDocumentStore();
const { render, isReadOnly } = useCanvasNode();

const options = computed(() =>
	render.value.type === CanvasNodeRenderType.CollapsedGroup ? render.value.options : null,
);

const incoming = computed(() => options.value?.incoming ?? []);
const outgoing = computed(() => options.value?.outgoing ?? []);

// Distribute handles evenly down the left/right edge.
function handleTop(index: number, count: number): string {
	return `${((index + 1) / (count + 1)) * 100}%`;
}

function onExpand() {
	const groupId = options.value?.groupId;
	if (!groupId || isReadOnly.value) return;
	workflowDocumentStore.value.setGroupCollapsed(groupId, false);
}
</script>

<template>
	<div
		v-if="options"
		:class="$style.collapsedGroup"
		:style="{ width: `${GROUP_COLLAPSED_WIDTH}px`, minHeight: `${GROUP_HEADER_HEIGHT}px` }"
		data-test-id="canvas-collapsed-group"
		:data-group-id="options.groupId"
	>
		<Handle
			v-for="(handle, index) in incoming"
			:id="handle.handleId"
			:key="handle.handleId"
			type="target"
			:position="Position.Left"
			:connectable="false"
			:style="{ top: handleTop(index, incoming.length) }"
		/>
		<Handle
			v-for="(handle, index) in outgoing"
			:id="handle.handleId"
			:key="handle.handleId"
			type="source"
			:position="Position.Right"
			:connectable="false"
			:style="{ top: handleTop(index, outgoing.length) }"
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
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
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
