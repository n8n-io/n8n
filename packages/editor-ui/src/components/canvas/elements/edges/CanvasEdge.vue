<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import type { Connection, EdgeProps } from '@vue-flow/core';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@vue-flow/core';
import CanvasEdgeToolbar from './CanvasEdgeToolbar.vue';
import { computed, useCssModule } from 'vue';

const emit = defineEmits<{
	delete: [connection: Connection];
}>();

const props = defineProps<
	EdgeProps & {
		hovered?: boolean;
	}
>();

const $style = useCssModule();

const edgeStyle = computed(() => ({
	strokeWidth: 2,
	...props.style,
}));

const isEdgeToolbarVisible = computed(() => props.selected || props.hovered);

const edgeToolbarStyle = computed(() => {
	return {
		transform: `translate(-50%, -50%) translate(${path.value[1]}px,${path.value[2]}px)`,
	};
});

const edgeToolbarClasses = computed(() => ({
	[$style.edgeToolbar]: true,
	[$style.edgeToolbarVisible]: isEdgeToolbarVisible.value,
	nodrag: true,
	nopan: true,
}));

const path = computed(() =>
	getBezierPath({
		sourceX: props.sourceX,
		sourceY: props.sourceY,
		sourcePosition: props.sourcePosition,
		targetX: props.targetX,
		targetY: props.targetY,
		targetPosition: props.targetPosition,
	}),
);

const connection = computed<Connection>(() => ({
	source: props.source,
	target: props.target,
	sourceHandle: props.sourceHandleId,
	targetHandle: props.targetHandleId,
}));

function onDelete() {
	emit('delete', connection.value);
}
</script>

<template>
	<BaseEdge
		:id="id"
		:style="edgeStyle"
		:path="path[0]"
		:marker-end="markerEnd"
		:label="data?.label"
		:label-x="path[1]"
		:label-y="path[2]"
		:label-style="{ fill: 'white' }"
		:label-show-bg="true"
		:label-bg-style="{ fill: 'red' }"
		:label-bg-padding="[2, 4]"
		:label-bg-border-radius="2"
		:class="$style.edge"
	/>
	<EdgeLabelRenderer>
		<CanvasEdgeToolbar :class="edgeToolbarClasses" :style="edgeToolbarStyle" @delete="onDelete" />
	</EdgeLabelRenderer>
</template>

<style lang="scss" module>
.edgeToolbar {
	position: absolute;
	opacity: 0;

	&.edgeToolbarVisible {
		opacity: 1;
	}

	&:hover {
		opacity: 1;
	}
}
</style>
