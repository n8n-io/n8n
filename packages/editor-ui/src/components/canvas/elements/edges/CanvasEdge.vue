<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import type { CanvasConnectionData } from '@/types';
import { isValidNodeConnectionType } from '@/utils/typeGuards';
import type { Connection, EdgeProps } from '@vue-flow/core';
import { useVueFlow, BaseEdge, EdgeLabelRenderer } from '@vue-flow/core';
import { NodeConnectionType } from 'n8n-workflow';
import { computed, useCssModule, ref, toRef } from 'vue';
import CanvasEdgeToolbar from './CanvasEdgeToolbar.vue';
import { getCustomPath } from './utils/edgePath';

const emit = defineEmits<{
	add: [connection: Connection];
	delete: [connection: Connection];
}>();

export type CanvasEdgeProps = EdgeProps<CanvasConnectionData> & {
	readOnly?: boolean;
	hovered?: boolean;
};

const props = defineProps<CanvasEdgeProps>();

const data = toRef(props, 'data');

const { onEdgeMouseEnter, onEdgeMouseLeave } = useVueFlow();

const isHovered = ref(false);

onEdgeMouseEnter(({ edge }) => {
	if (edge.id !== props.id) return;
	isHovered.value = true;
});
onEdgeMouseLeave(({ edge }) => {
	if (edge.id !== props.id) return;
	isHovered.value = false;
});

const $style = useCssModule();

const connectionType = computed(() =>
	isValidNodeConnectionType(props.data.source.type)
		? props.data.source.type
		: NodeConnectionType.Main,
);

const renderToolbar = computed(() => isHovered.value && !props.readOnly);

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
	stroke: isHovered.value ? 'var(--color-primary)' : edgeColor.value,
}));

const edgeLabelStyle = computed(() => ({ color: edgeColor.value }));

const edgeToolbarStyle = computed(() => {
	const [, labelX, labelY] = path.value;
	return {
		transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
	};
});

const path = computed(() =>
	getCustomPath(props, {
		connectionType: connectionType.value,
	}),
);

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
</script>

<template>
	<BaseEdge
		:id="id"
		:class="$style.edge"
		:style="edgeStyle"
		:path="path[0]"
		:marker-end="markerEnd"
		:interaction-width="40"
	/>

	<EdgeLabelRenderer>
		<div
			data-test-id="edge-label-wrapper"
			:style="edgeToolbarStyle"
			:class="$style.edgeLabelWrapper"
			@mouseenter="isHovered = true"
			@mouseleave="isHovered = false"
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
