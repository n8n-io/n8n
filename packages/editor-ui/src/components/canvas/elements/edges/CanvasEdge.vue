<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import type { CanvasConnectionData } from '@/types';
import { isValidNodeConnectionType } from '@/utils/typeGuards';
import type { Connection, EdgeProps } from '@vue-flow/core';
import { BaseEdge, EdgeLabelRenderer } from '@vue-flow/core';
import { NodeConnectionType } from 'n8n-workflow';
import { computed, useCssModule } from 'vue';
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

const $style = useCssModule();

const connectionType = computed(() =>
	isValidNodeConnectionType(props.data.source.type)
		? props.data.source.type
		: NodeConnectionType.Main,
);

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
	if (isFocused.value && !props.readOnly) {
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
	const [, labelX, labelY] = path.value;
	return {
		transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
	};
});

const edgeToolbarClasses = computed(() => ({
	[$style.edgeToolbar]: true,
	[$style.edgeToolbarVisible]: isFocused.value,
	nodrag: true,
	nopan: true,
}));

const path = computed(() => getCustomPath(props));

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
		:label="edgeLabel"
		:label-x="path[1]"
		:label-y="path[2]"
		:label-style="edgeLabelStyle"
		:label-show-bg="false"
	/>

	<EdgeLabelRenderer v-if="!readOnly">
		<CanvasEdgeToolbar
			:type="connectionType"
			:class="edgeToolbarClasses"
			:style="edgeToolbarStyle"
			@add="onAdd"
			@delete="onDelete"
		/>
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
