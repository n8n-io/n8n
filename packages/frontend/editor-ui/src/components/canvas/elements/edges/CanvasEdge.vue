<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import type { CanvasConnectionData } from '@/types';
import { isValidNodeConnectionType } from '@/utils/typeGuards';
import type { Connection, EdgeProps } from '@vue-flow/core';
import { BaseEdge, EdgeLabelRenderer } from '@vue-flow/core';
import { NodeConnectionPivotPoint, NodeConnectionTypes } from 'n8n-workflow';
import { computed, ref, toRef, useCssModule, watch } from 'vue';
import CanvasEdgeToolbar from './CanvasEdgeToolbar.vue';
import { getEdgeRenderData } from './utils';
import { useCanvas } from '@/composables/useCanvas';

const emit = defineEmits<{
	add: [connection: Connection];
	delete: [connection: Connection];
	'create:pivot': [connection: Connection, event: MouseEvent];
	'delete:pivot': [connection: Connection, pivotId: string];
	'update:pivot': [connection: Connection, pivotId: string, position: [number, number]];
	'update:label:hovered': [hovered: boolean];
}>();

export type CanvasEdgeProps = EdgeProps<CanvasConnectionData> & {
	readOnly?: boolean;
	hovered?: boolean;
	bringToFront?: boolean; // Determines if entire edges layer should be brought to front
};

const props = defineProps<CanvasEdgeProps>();

const { getProjectedPosition } = useCanvas();

const data = toRef(props, 'data');

const $style = useCssModule();

const connectionType = computed(() =>
	isValidNodeConnectionType(props.data.source.type)
		? props.data.source.type
		: NodeConnectionTypes.Main,
);

const delayedHovered = ref(props.hovered);
const delayedHoveredSetTimeoutRef = ref<NodeJS.Timeout | null>(null);
const delayedHoveredTimeout = 600;

watch(
	() => props.hovered,
	(isHovered) => {
		if (isHovered) {
			if (delayedHoveredSetTimeoutRef.value) clearTimeout(delayedHoveredSetTimeoutRef.value);
			delayedHovered.value = true;
		} else {
			delayedHoveredSetTimeoutRef.value = setTimeout(() => {
				delayedHovered.value = false;
			}, delayedHoveredTimeout);
		}
	},
	{ immediate: true },
);

const renderToolbar = computed(() => (props.selected || delayedHovered.value) && !props.readOnly);

const isMainConnection = computed(() => data.value.source.type === NodeConnectionTypes.Main);

const status = computed(() => props.data.status);

const edgeColor = computed(() => {
	if (status.value === 'success') {
		return 'var(--color-success)';
	} else if (status.value === 'pinned') {
		return 'var(--color-secondary)';
	} else if (!isMainConnection.value) {
		return 'var(--node-type-supplemental-color)';
	} else if (props.selected) {
		return 'var(--color-background-dark)';
	} else {
		return 'var(--color-foreground-xdark)';
	}
});

const edgeStyle = computed(() => ({
	...props.style,
	...(isMainConnection.value ? {} : { strokeDasharray: '8,8' }),
	strokeWidth: 2,
	stroke: delayedHovered.value ? 'var(--color-primary)' : edgeColor.value,
}));

const edgeClasses = computed(() => ({
	[$style.edge]: true,
	hovered: delayedHovered.value,
	'bring-to-front': props.bringToFront,
}));

const edgeLabelStyle = computed(() => ({
	transform: `translate(0, ${isConnectorStraight.value ? '-100%' : '0%'})`,
	color: 'var(--color-text-base)',
}));

const isConnectorStraight = computed(() => renderData.value.isConnectorStraight);

const edgeToolbarStyle = computed(() => ({
	transform: `translate(-50%, -50%) translate(${labelPosition.value[0]}px, ${labelPosition.value[1]}px)`,
	...(delayedHovered.value ? { zIndex: 1 } : {}),
}));

const edgeToolbarClasses = computed(() => ({
	[$style.edgeLabelWrapper]: true,
	'vue-flow__edge-label': true,
	selected: props.selected,
}));

const pivots = computed(() => props.data.pivots);

const renderData = computed(() =>
	getEdgeRenderData(props, {
		pivots: pivots.value,
		connectionType: connectionType.value,
	}),
);

const segments = computed(() => renderData.value.segments);

const labelPosition = computed(() => renderData.value.labelPosition);

const connection = computed<Connection>(() => ({
	source: props.source,
	target: props.target,
	sourceHandle: props.sourceHandleId,
	targetHandle: props.targetHandleId,
}));

function onAdd() {
	emit('add', connection.value);
}

function onDelete() {
	emit('delete', connection.value);
}

function onEdgeLabelMouseEnter() {
	emit('update:label:hovered', true);
}

function onEdgeLabelMouseLeave() {
	emit('update:label:hovered', false);
}

/**
 * Handle pivot point events
 */

function onPivotCreate(event: MouseEvent) {
	if (!pivots.value || pivots.value.length > 0) {
		return;
	}

	event.stopPropagation();

	emit('create:pivot', connection.value, event);
}

function onPivotDelete(pivot: NodeConnectionPivotPoint, event: MouseEvent) {
	event.stopPropagation();

	emit('delete:pivot', connection.value, pivot.id);
}

function onPivotMouseDown(pivot: NodeConnectionPivotPoint, event: MouseEvent) {
	if (event.button !== 0) {
		return;
	}

	event.stopPropagation();

	function onMouseMove(event: MouseEvent) {
		const { x, y } = getProjectedPosition(event);
		pivot.position[0] = x;
		pivot.position[1] = y;
	}

	function onMouseUp() {
		// emit('update:pivot', connection.value, pivot.id, [x, y]);

		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mouseup', onMouseUp);
	}

	document.addEventListener('mousemove', onMouseMove);
	document.addEventListener('mouseup', onMouseUp);
}
</script>

<template>
	<g
		data-test-id="edge"
		:data-source-node-name="data.source?.node"
		:data-target-node-name="data.target?.node"
		@dblclick="onPivotCreate"
	>
		<BaseEdge
			v-for="(segment, index) in segments"
			:id="`${id}-${index}`"
			:key="segment[0]"
			:class="edgeClasses"
			:style="edgeStyle"
			:path="segment[0]"
			:marker-end="markerEnd"
			:interaction-width="40"
		/>
		<circle
			v-for="(pivot, index) in pivots"
			:key="index"
			:class="$style.pivotPoint"
			:cx="pivot.position[0]"
			:cy="pivot.position[1]"
			r="10"
			@mousedown="onPivotMouseDown(pivot, $event)"
			@dblclick="onPivotDelete(pivot, $event)"
		/>
	</g>

	<EdgeLabelRenderer>
		<div
			data-test-id="edge-label"
			:data-source-node-name="data.source?.node"
			:data-target-node-name="data.target?.node"
			:data-edge-status="status"
			:style="edgeToolbarStyle"
			:class="edgeToolbarClasses"
			@mouseenter="onEdgeLabelMouseEnter"
			@mouseleave="onEdgeLabelMouseLeave"
		>
			<CanvasEdgeToolbar
				v-if="renderToolbar"
				:type="connectionType"
				@add="onAdd"
				@delete="onDelete"
			/>
			<div v-else :style="edgeLabelStyle" :class="$style.edgeLabel">{{ label }}</div>
		</div>
	</EdgeLabelRenderer>
</template>

<style lang="scss" module>
.edge {
	pointer-events: all;
	transition:
		stroke 0.3s ease,
		fill 0.3s ease;
}

.edgeLabelWrapper {
	transform: translateY(calc(var(--spacing-xs) * -1));
	top: -30px;
	position: absolute;
}

.edgeLabel {
	font-size: var(--font-size-xs);
	background-color: hsla(
		var(--color-canvas-background-h),
		var(--color-canvas-background-s),
		var(--color-canvas-background-l),
		0.85
	);
}

.pivotPoint {
	pointer-events: all;
}
</style>
