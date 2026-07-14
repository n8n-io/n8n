<script lang="ts" setup>
import { BaseEdge, type EdgeProps } from '@vue-flow/core';
import { computed, inject } from 'vue';

import type { ProjectEdgeData } from '../canvas-types';
import { ProjectCanvasContextKey } from '../canvas-types';

const props = defineProps<EdgeProps<ProjectEdgeData>>();

const context = inject(ProjectCanvasContextKey, null);

const isToolUse = computed(() => props.data?.relationshipType === 'uses-as-tool');

/** A trigger edge whose target sits left of its source loops around instead of crossing. */
const BACKWARD_THRESHOLD = 20;
const BACKWARD_PADDING_BOTTOM = 110;
const BACKWARD_CONTENT_CLEARANCE = 60;
const BACKWARD_PADDING_X = 40;
const BACKWARD_BORDER_RADIUS = 16;

interface Point {
	x: number;
	y: number;
}

/** Polyline through the given points with rounded corners. */
function roundedPolylinePath(points: Point[], radius: number): string {
	let d = `M ${points[0].x} ${points[0].y}`;
	for (let i = 1; i < points.length - 1; i++) {
		const prev = points[i - 1];
		const corner = points[i];
		const next = points[i + 1];
		const inLen = Math.hypot(corner.x - prev.x, corner.y - prev.y);
		const outLen = Math.hypot(next.x - corner.x, next.y - corner.y);
		if (inLen === 0 || outLen === 0) continue;
		const rIn = Math.min(radius, inLen / 2);
		const rOut = Math.min(radius, outLen / 2);
		const a = {
			x: corner.x - ((corner.x - prev.x) / inLen) * rIn,
			y: corner.y - ((corner.y - prev.y) / inLen) * rIn,
		};
		const b = {
			x: corner.x + ((next.x - corner.x) / outLen) * rOut,
			y: corner.y + ((next.y - corner.y) / outLen) * rOut,
		};
		d += ` L ${a.x} ${a.y} Q ${corner.x} ${corner.y} ${b.x} ${b.y}`;
	}
	const last = points[points.length - 1];
	d += ` L ${last.x} ${last.y}`;
	return d;
}

/**
 * Cubic bezier matching the prototype: trigger edges bow horizontally (right of source →
 * left of target), tool edges bow vertically (bottom of source → top of target). Backward
 * trigger edges (source right of target) would cut diagonally across the graph, so they
 * loop around instead: down beneath both endpoints, left past the canvas's leftmost
 * content, and up into the target's left side.
 */
const edgePath = computed(() => {
	const p0 = { x: props.sourceX ?? 0, y: props.sourceY ?? 0 };
	const p1 = { x: props.targetX ?? 0, y: props.targetY ?? 0 };
	if (isToolUse.value) {
		const o = Math.min(120, Math.max(40, Math.abs(p1.y - p0.y) * 0.45));
		return `M ${p0.x} ${p0.y} C ${p0.x} ${p0.y + o}, ${p1.x} ${p1.y - o}, ${p1.x} ${p1.y}`;
	}
	if (p0.x - BACKWARD_THRESHOLD > p1.x) {
		// run beneath the lowest visible unit, so the loop follows content moved downwards
		const contentBottom = context?.contentBottomY.value;
		const belowY = Math.max(
			Math.max(p0.y, p1.y) + BACKWARD_PADDING_BOTTOM,
			contentBottom !== undefined ? contentBottom + BACKWARD_CONTENT_CLEARANCE : -Infinity,
		);
		const contentLeft = context?.contentLeftX.value ?? p1.x;
		const riseX = Math.min(contentLeft, p1.x) - BACKWARD_PADDING_X;
		return roundedPolylinePath(
			[
				p0,
				{ x: p0.x + BACKWARD_PADDING_X, y: p0.y },
				{ x: p0.x + BACKWARD_PADDING_X, y: belowY },
				{ x: riseX, y: belowY },
				{ x: riseX, y: p1.y },
				p1,
			],
			BACKWARD_BORDER_RADIUS,
		);
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
