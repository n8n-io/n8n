<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import type { CanvasConnectionData } from '../../../canvas.types';
import { isValidNodeConnectionType } from '@/app/utils/typeGuards';
import type { Connection, EdgeProps } from '@vue-flow/core';
import { BaseEdge, EdgeLabelRenderer } from '@vue-flow/core';
import { NodeConnectionTypes } from 'n8n-workflow';
import { computed, ref, toRef, useCssModule, watch } from 'vue';
import CanvasEdgeToolbar from './CanvasEdgeToolbar.vue';
import { getEdgeRenderData } from './utils';
import { useCanvas } from '../../../composables/useCanvas';
import { useZoomAdjustedValues } from '../../../composables/useZoomAdjustedValues';

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

const { viewport } = useCanvas();
const { calculateEdgeLightness } = useZoomAdjustedValues(viewport);

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

const renderToolbar = computed(() => delayedHovered.value && !props.readOnly);

const isMainConnection = computed(() => data.value.source.type === NodeConnectionTypes.Main);

const status = computed(() => props.data.status);

const edgeStyle = computed(() => ({
	...props.style,
	...(isMainConnection.value ? {} : { strokeDasharray: '5,6' }),
}));

const edgeClasses = computed(() => ({
	[$style.edge]: true,
	hovered: delayedHovered.value,
	'bring-to-front': props.bringToFront,
}));

const edgeToolbarStyle = computed(() => ({
	transform: `translate(-50%, -50%) translate(${labelPosition.value[0]}px, ${labelPosition.value[1]}px)`,
	...(delayedHovered.value ? { zIndex: 1 } : {}),
}));

const edgeToolbarClasses = computed(() => ({
	[$style.edgeLabelWrapper]: true,
	'vue-flow__edge-label': true,
	selected: props.selected,
	[$style.straight]: renderData.value.isConnectorStraight,
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

const edgeColor = computed(() => {
	if (status.value === 'success') {
		return 'var(--color--success)';
	} else if (status.value === 'pinned') {
		return 'var(--color--secondary)';
	}
	return undefined;
});

// For colored edges (success/pinned), don't apply hover effect
const hasColoredStatus = computed(() => status.value === 'success' || status.value === 'pinned');
const hoveredForLightness = computed(() => (hasColoredStatus.value ? false : delayedHovered.value));

const edgeLightness = calculateEdgeLightness(hoveredForLightness);

const edgeStyles = computed(() => {
	const styles: Record<string, string> = {
		'--canvas-edge--color--lightness--light': edgeLightness.value.light,
		'--canvas-edge--color--lightness--dark': edgeLightness.value.dark,
	};
	if (edgeColor.value) {
		styles['--canvas-edge--color'] = edgeColor.value;
	}
	return styles;
});

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
	<g
		data-test-id="edge"
		:data-source-node-name="data.source?.node"
		:data-target-node-name="data.target?.node"
		:style="edgeStyles"
		v-bind="$attrs"
	>
		<slot name="highlight" v-bind="{ segments }" />

		<BaseEdge
			v-for="(segment, index) in segments"
			:id="`${id}-${index}`"
			:key="segment[0]"
			:class="edgeClasses"
			:style="edgeStyle"
			:path="segment[0]"
			:marker-end="isMainConnection ? markerEnd : undefined"
			:interaction-width="40"
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
			<div v-else :class="$style.edgeLabel">{{ label }}</div>
		</div>
	</EdgeLabelRenderer>
</template>

<style lang="scss" module>
.edge {
	transition: fill 0.3s ease;
	// @bugfix cat-1639-connection-colors-not-rendering-correctly
	// Using !important here to override BaseEdge styles after Rolldown Vite migration
	stroke: var(
		--canvas-edge--color,
		light-dark(
			oklch(var(--canvas-edge--color--lightness--light) 0 0),
			oklch(var(--canvas-edge--color--lightness--dark) 0 0)
		)
	) !important;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	stroke-width: calc(2 * var(--canvas-zoom-compensation-factor, 1)) !important;
	stroke-linecap: square;
}

.edgeLabelWrapper {
	transform: translateY(calc(var(--spacing--xs) * -1));
	position: absolute;

	/* stylelint-disable-next-line @n8n/css-var-naming */
	--label-translate-y: 0;

	&.straight {
		/* stylelint-disable-next-line @n8n/css-var-naming */
		--label-translate-y: -100%;
	}
}

.edgeLabel {
	/* stylelint-disable-next-line @n8n/css-var-naming */
	transform: scale(var(--canvas-zoom-compensation-factor, 1)) translate(0, var(--label-translate-y));
	color: var(--canvas--label--color);
	font-size: var(--font-size--xs);
	background-color: var(--canvas--label--color--background);
}
</style>
