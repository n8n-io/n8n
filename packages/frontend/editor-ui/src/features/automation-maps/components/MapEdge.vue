<script setup lang="ts">
import type { AutomationMapEdgeKind } from '@n8n/api-types';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@vue-flow/core';
import { computed } from 'vue';

import type { MapFocusState } from '../automationMap.types';

export interface MapEdgeData {
	kind: AutomationMapEdgeKind;
	label: string | null;
	focus: MapFocusState;
	labelVisible: boolean;
	markerId: string;
}

const props = defineProps<EdgeProps<MapEdgeData>>();

const path = computed(() =>
	getBezierPath({
		sourceX: props.sourceX,
		sourceY: props.sourceY,
		sourcePosition: props.sourcePosition,
		targetX: props.targetX,
		targetY: props.targetY,
		targetPosition: props.targetPosition,
		curvature: 0.35,
	}),
);

const showLabel = computed(() => Boolean(props.data?.label) && Boolean(props.data?.labelVisible));
</script>

<template>
	<g>
		<BaseEdge
			:id="id"
			:path="path[0]"
			:marker-end="`url(#${data?.markerId})`"
			:class="[
				$style.edge,
				$style[data?.kind ?? 'calls'],
				{
					[$style.focused]: data?.focus === 'focused',
					[$style.dimmed]: data?.focus === 'dimmed',
				},
			]"
		/>
		<EdgeLabelRenderer v-if="showLabel">
			<div
				:class="$style.label"
				:style="{ transform: `translate(-50%, -50%) translate(${path[1]}px, ${path[2]}px)` }"
			>
				{{ data?.label }}
			</div>
		</EdgeLabelRenderer>
	</g>
</template>

<style lang="scss" module>
.edge {
	stroke: light-dark(oklch(0.72 0 0), oklch(0.5 0 0)) !important;
	stroke-width: 2 !important;
	fill: none;
	transition:
		opacity 0.2s ease,
		stroke 0.2s ease;
}

.dispatches {
	stroke-dasharray: 8 6;
}

.references {
	stroke-dasharray: 2 6;
	stroke-linecap: round;
}

.errorHandler {
	stroke: var(--color--danger) !important;
	stroke-dasharray: 8 6;
}

.reads,
.writes,
.uses {
	stroke: var(--color--primary--tint-1) !important;
	stroke-width: 1.5 !important;
}

.focused {
	stroke: var(--color--primary) !important;
	stroke-width: 2.5 !important;
}

.dimmed {
	opacity: 0.12;
}

.label {
	position: absolute;
	pointer-events: none;
	font-size: var(--font-size--3xs);
	color: var(--color--text);
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius);
	padding: 0 var(--spacing--4xs);
	white-space: nowrap;
}
</style>
