<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import type { CanvasConnectionData } from '@/types';
import { isValidNodeConnectionType } from '@/utils/typeGuards';
import type { Connection, EdgeProps } from '@vue-flow/core';
import { BaseEdge, EdgeLabelRenderer } from '@vue-flow/core';
import { NodeConnectionType } from 'n8n-workflow';
import { computed, useCssModule, toRef } from 'vue';
import CanvasEdgeToolbar from './CanvasEdgeToolbar.vue';
import { getEdgeRenderData } from './utils';

const emit = defineEmits<{
	add: [connection: Connection];
	delete: [connection: Connection];
	'update:label:hovered': [hovered: boolean];
}>();

export type CanvasEdgeProps = EdgeProps<CanvasConnectionData> & {
	readOnly?: boolean;
	hovered?: boolean;
	bringToFront?: boolean; // Determines if entire edges layer should be brought to front
};

const props = defineProps<CanvasEdgeProps>();

const data = toRef(props, 'data');

const $style = useCssModule();

const connectionType = computed(() =>
	isValidNodeConnectionType(props.data.source.type)
		? props.data.source.type
		: NodeConnectionType.Main,
);

const renderToolbar = computed(() => props.hovered && !props.readOnly);

const isMainConnection = computed(() => data.value.source.type === NodeConnectionType.Main);

const status = computed(() => props.data.status);

const edgeColor = computed(() => {
	if (status.value === 'success') {
		return 'var(--color-success)';
	} else if (status.value === 'pinned') {
		return 'var(--color-secondary)';
	} else if (status.value === 'running') {
		return 'var(--color-primary)';
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
	stroke: props.hovered ? 'var(--color-primary)' : edgeColor.value,
}));

const edgeClasses = computed(() => ({
	[$style.edge]: true,
	hovered: props.hovered,
	'bring-to-front': props.bringToFront,
}));

const edgeLabelStyle = computed(() => ({
	color: edgeColor.value,
}));

const edgeToolbarStyle = computed(() => {
	return {
		transform: `translate(-50%, -50%) translate(${labelPosition.value[0]}px,${labelPosition.value[1]}px)`,
		...(props.hovered ? { zIndex: 1 } : {}),
	};
});

const edgeToolbarClasses = computed(() => ({
	[$style.edgeLabelWrapper]: true,
	'vue-flow__edge-label': true,
	selected: props.selected,
}));

const renderData = computed(() =>
	getEdgeRenderData(props, {
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
</script>

<template>
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

	<EdgeLabelRenderer>
		<div
			data-test-id="edge-label-wrapper"
			:data-source-node-name="sourceNode?.label"
			:data-target-node-name="targetNode?.label"
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
	transition:
		stroke 0.3s ease,
		fill 0.3s ease;
}

.edgeLabelWrapper {
	transform: translateY(calc(var(--spacing-xs) * -1));
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
</style>
