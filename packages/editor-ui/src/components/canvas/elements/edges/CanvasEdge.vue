<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import type { Connection, EdgeProps } from '@vue-flow/core';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@vue-flow/core';
import CanvasEdgeToolbar from './CanvasEdgeToolbar.vue';
import { computed, useCssModule } from 'vue';
import type { CanvasConnectionData } from '@/types';

const emit = defineEmits<{
	delete: [connection: Connection];
}>();

export type CanvasEdgeProps = EdgeProps<CanvasConnectionData> & {
	hovered?: boolean;
};

const props = defineProps<CanvasEdgeProps>();

const $style = useCssModule();

const isFocused = computed(() => props.selected || props.hovered);

const status = computed(() => props.data.status);
const statusColor = computed(() => {
	if (props.selected) {
		return 'var(--color-background-dark)';
	} else if (status.value === 'success') {
		return 'var(--color-success)';
	} else if (status.value === 'pinned') {
		return 'var(--color-secondary)';
	} else if (status.value === 'running') {
		return 'var(--color-primary)';
	} else {
		return 'var(--color-foreground-xdark)';
	}
});

const edgeStyle = computed(() => ({
	...props.style,
	strokeWidth: 2,
	stroke: statusColor.value,
}));

const edgeLabel = computed(() => {
	if (isFocused.value) {
		return '';
	}

	return props.label;
});

const edgeLabelStyle = computed(() => ({
	fill: statusColor.value,
	transform: 'translateY(calc(var(--spacing-xs) * -1))',
	fontSize: 'var(--font-size-xs)',
}));

const edgeToolbarStyle = computed(() => {
	return {
		transform: `translate(-50%, -50%) translate(${path.value[1]}px,${path.value[2]}px)`,
	};
});

const edgeToolbarClasses = computed(() => ({
	[$style.edgeToolbar]: true,
	[$style.edgeToolbarVisible]: isFocused.value,
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
		:class="$style.edge"
		:style="edgeStyle"
		:path="path[0]"
		:marker-end="markerEnd"
		:label="edgeLabel"
		:label-x="path[1]"
		:label-y="path[2]"
		:label-style="edgeLabelStyle"
		:label-show-bg="false"
	/>
	<EdgeLabelRenderer>
		<CanvasEdgeToolbar :class="edgeToolbarClasses" :style="edgeToolbarStyle" @delete="onDelete" />
	</EdgeLabelRenderer>
</template>

<style lang="scss" module>
.edge {
	transition: stroke 0.3s ease;
}

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
