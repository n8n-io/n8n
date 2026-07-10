<script setup lang="ts">
import { computed, useCssModule } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton } from '@n8n/design-system';
import { Handle, Position } from '@vue-flow/core';
import { GROUP_HEADER_HEIGHT as HEADER_HEIGHT } from '../../../stores/canvasNodeGroups.constants';
import {
	CANVAS_NODE_GROUP_HANDLE_LEFT,
	CANVAS_NODE_GROUP_HANDLE_RIGHT,
	type CanvasGroupNodeData,
} from '../../../canvas.types';

// A sub-workflow group renders as a full-height node (title bar + frame body) so
// its connection handles sit at the vertical centre of the frame, and the whole
// element can be dragged and wired like a node.
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	data: CanvasGroupNodeData;
	selected?: boolean;
}>();

const emit = defineEmits<{
	toggle: [id: string];
}>();

const i18n = useI18n();
const $style = useCssModule();

const group = computed(() => props.data.group);
const isCollapsed = computed(() => props.data.isCollapsed);
const headerHeight = `${HEADER_HEIGHT}px`;

const toggleLabel = computed(() =>
	isCollapsed.value
		? i18n.baseText('canvas.nodeGroup.expand')
		: i18n.baseText('canvas.nodeGroup.collapse'),
);

function onToggleClick() {
	emit('toggle', group.value.id);
}

function onWrapperDblClick(event: MouseEvent) {
	if ((event.target as HTMLElement | null)?.closest('.nodrag')) return;
	emit('toggle', group.value.id);
}
</script>

<template>
	<div
		:class="[$style.wrapper, { [$style.collapsed]: isCollapsed, [$style.selected]: selected }]"
		style="width: 100%; height: 100%"
		data-test-id="canvas-node-group"
		:data-group-id="group.id"
		@dblclick.stop="onWrapperDblClick"
	>
		<Handle
			:id="CANVAS_NODE_GROUP_HANDLE_LEFT"
			type="target"
			:position="Position.Left"
			:class="$style.handle"
			:is-connectable="false"
		/>
		<Handle
			:id="CANVAS_NODE_GROUP_HANDLE_RIGHT"
			type="source"
			:position="Position.Right"
			:class="$style.handle"
			:is-connectable="false"
		/>

		<div :class="$style.titleBar">
			<N8nIconButton
				class="nodrag"
				:class="$style.toggle"
				variant="ghost"
				size="large"
				:icon="isCollapsed ? 'chevrons-up-down' : 'chevrons-down-up'"
				:aria-label="toggleLabel"
				:aria-expanded="!isCollapsed"
				data-test-id="canvas-node-group-toggle"
				@click.stop="onToggleClick"
			/>
			<div :class="$style.title" data-test-id="canvas-node-group-title">{{ group.name }}</div>
		</div>

		<div v-if="!isCollapsed" :class="$style.frame" data-test-id="canvas-node-group-frame" />
	</div>
</template>

<style lang="scss" module>
@use '../../../components/elements/nodes/render-types/_canvasNodeStyles.scss' as styles;

.wrapper {
	@include styles.canvas-node-border-defaults;
	position: relative;
	display: flex;
	flex-direction: column;
	border-radius: var(--radius--lg);
}

.wrapper.selected {
	@include styles.canvas-node-selected-ring;
}

.titleBar {
	position: relative;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
	height: v-bind(headerHeight);
	padding: 0 var(--spacing--lg);
	@include styles.group-title-bar-surface;
}

.toggle {
	@include styles.group-toggle;
}

.title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
}

.frame {
	flex: 1;
	@include styles.group-frame-surface;
}

.handle {
	opacity: 0;
	pointer-events: none;
}
</style>
