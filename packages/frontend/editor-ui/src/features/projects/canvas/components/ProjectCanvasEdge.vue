<script lang="ts" setup>
import { BaseEdge, type EdgeProps } from '@vue-flow/core';
import { computed, inject } from 'vue';

import type { ProjectEdgeData } from '../canvas-types';
import { ProjectCanvasContextKey } from '../canvas-types';

const props = defineProps<EdgeProps<ProjectEdgeData>>();

const context = inject(ProjectCanvasContextKey, null);

const isToolUse = computed(() => props.data?.relationshipType === 'uses-as-tool');

/**
 * Cubic bezier matching the prototype: trigger edges bow horizontally
 * (right of source → left of target), tool edges bow vertically
 * (bottom of source → top of target).
 */
const edgePath = computed(() => {
	const p0 = { x: props.sourceX ?? 0, y: props.sourceY ?? 0 };
	const p1 = { x: props.targetX ?? 0, y: props.targetY ?? 0 };
	if (isToolUse.value) {
		const o = Math.min(120, Math.max(40, Math.abs(p1.y - p0.y) * 0.45));
		return `M ${p0.x} ${p0.y} C ${p0.x} ${p0.y + o}, ${p1.x} ${p1.y - o}, ${p1.x} ${p1.y}`;
	}
	const o = Math.min(130, Math.max(46, Math.abs(p1.x - p0.x) * 0.45));
	return `M ${p0.x} ${p0.y} C ${p0.x + o} ${p0.y}, ${p1.x - o} ${p1.y}, ${p1.x} ${p1.y}`;
});

const hoverState = computed<'highlighted' | 'dimmed' | null>(() => {
	const hovered = context?.hoveredNodeId.value;
	if (!hovered) return null;
	return props.source === hovered || props.target === hovered ? 'highlighted' : 'dimmed';
});

const strokeColor = computed(() =>
	isToolUse.value
		? 'var(--color--secondary)'
		: hoverState.value === 'highlighted'
			? 'var(--color--text--shade-1)'
			: 'var(--color--foreground--shade-1)',
);

const edgeStyle = computed(() => ({
	stroke: strokeColor.value,
	strokeWidth: hoverState.value === 'highlighted' ? 2.4 : 1.8,
	strokeDasharray: isToolUse.value ? '5 4' : undefined,
	opacity: hoverState.value === 'dimmed' ? 0.18 : 1,
	transition: 'opacity 0.15s ease',
}));
</script>

<template>
	<BaseEdge :id="props.id" :path="edgePath" :style="edgeStyle" :marker-end="props.markerEnd" />
</template>
