<script setup lang="ts">
import { computed, inject, useCssModule } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton } from '@n8n/design-system';
import { Handle, Position } from '@vue-flow/core';
import { useCanvasNode } from '../../../../composables/useCanvasNode';
import type {
	CanvasNodeCollapsedGroupRender,
	CollapsedGroupAnchor,
} from '../../../../canvas.types';
import { CanvasGroupCollapseKey } from '../../../../composables/useCanvasGroupCollapse.key';

defineOptions({
	inheritAttrs: false,
});

const ANCHOR_MARGIN_PX = 6;

const $style = useCssModule();
const i18n = useI18n();
const groupCollapse = inject(CanvasGroupCollapseKey);

const { isSelected, isReadOnly, render } = useCanvasNode();

const renderOptions = computed(
	() => render.value.options as CanvasNodeCollapsedGroupRender['options'],
);

const classes = computed(() => ({
	[$style.collapsedGroup]: true,
	[$style.selected]: isSelected.value === true,
}));

const dimensions = computed(() => ({
	width: `${renderOptions.value.width}px`,
	height: `${renderOptions.value.height}px`,
}));

function anchorTop(index: number, total: number, heightPx: number): string {
	const margin = Math.min(ANCHOR_MARGIN_PX, heightPx / 2);
	const usable = Math.max(0, heightPx - margin * 2);
	const step = usable / (total + 1);
	return `${margin + step * (index + 1)}px`;
}

const inputHandles = computed(() => {
	const total = renderOptions.value.inputAnchors.length;
	return renderOptions.value.inputAnchors.map((anchor, index) => ({
		anchor,
		top: anchorTop(index, total, renderOptions.value.height),
	}));
});

const outputHandles = computed(() => {
	const total = renderOptions.value.outputAnchors.length;
	return renderOptions.value.outputAnchors.map((anchor, index) => ({
		anchor,
		top: anchorTop(index, total, renderOptions.value.height),
	}));
});

function onToggle() {
	if (isReadOnly.value) return;
	groupCollapse?.toggle(renderOptions.value.groupId);
}

function handleKey(anchor: CollapsedGroupAnchor, side: 'in' | 'out'): string {
	return `${side}:${anchor.handle}`;
}
</script>

<template>
	<div :class="classes" :style="dimensions" data-test-id="canvas-collapsed-group">
		<Handle
			v-for="{ anchor, top } in inputHandles"
			:id="anchor.handle"
			:key="handleKey(anchor, 'in')"
			:class="[$style.handle, $style.input]"
			type="target"
			:position="Position.Left"
			:style="{ top }"
			:connectable-start="false"
			:connectable-end="false"
			:data-test-id="`canvas-collapsed-group-input-${anchor.memberNodeId}`"
		/>
		<Handle
			v-for="{ anchor, top } in outputHandles"
			:id="anchor.handle"
			:key="handleKey(anchor, 'out')"
			:class="[$style.handle, $style.output]"
			type="source"
			:position="Position.Right"
			:style="{ top }"
			:connectable-start="false"
			:connectable-end="false"
			:data-test-id="`canvas-collapsed-group-output-${anchor.memberNodeId}`"
		/>
		<N8nIconButton
			:class="$style.toggle"
			variant="ghost"
			size="small"
			icon="chevrons-up-down"
			:disabled="isReadOnly === true"
			:aria-label="i18n.baseText('canvas.nodeGroup.expand')"
			:title="i18n.baseText('canvas.nodeGroup.expand')"
			data-test-id="canvas-collapsed-group-toggle"
			@click.stop="onToggle"
			@mousedown.stop
		/>
		<span :class="$style.title">{{ renderOptions.title }}</span>
	</div>
</template>

<style lang="scss" module>
.collapsedGroup {
	box-sizing: border-box;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--xs);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	border: var(--border);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	overflow: hidden;
	cursor: grab;

	&.selected {
		box-shadow: 0 0 0 4px var(--canvas--color--selected);
	}
}

.toggle {
	flex-shrink: 0;
}

.title {
	flex: 1 1 auto;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: var(--font-weight--medium);
}

.handle {
	width: 10px;
	height: 10px;
	background: var(--color--foreground, #888);
	border: 2px solid var(--background--surface);
	border-radius: 50%;

	&.input {
		left: -5px;
	}

	&.output {
		right: -5px;
		left: auto;
	}
}
</style>
