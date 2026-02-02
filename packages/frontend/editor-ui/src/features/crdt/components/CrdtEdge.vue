<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import { isValidNodeConnectionType } from '@/app/utils/typeGuards';
import type { Connection, EdgeProps } from '@vue-flow/core';
import { BaseEdge, EdgeLabelRenderer } from '@vue-flow/core';
import { NodeConnectionTypes } from 'n8n-workflow';
import { computed, inject, onScopeDispose, ref, shallowRef, useCssModule, watch } from 'vue';
import CanvasEdgeToolbar from '@/features/workflows/canvas/components/elements/edges/CanvasEdgeToolbar.vue';
import { getEdgeRenderData } from '@/features/workflows/canvas/components/elements/edges/utils';
import type { ExecutionDocument } from '../types/executionDocument.types';

const emit = defineEmits<{
	add: [connection: Connection];
	delete: [connection: Connection];
}>();

export type CrdtEdgeProps = EdgeProps & {
	readOnly?: boolean;
	hovered?: boolean;
};

const props = defineProps<CrdtEdgeProps>();

const $style = useCssModule();

// Inject execution document (provided by parent canvas component)
const executionDoc = inject<ExecutionDocument | null>('executionDoc', null);

/**
 * Parse sourceHandle to determine connection type.
 * Handle format: "outputs/main/0" or "outputs/ai_tool/0"
 */
const connectionType = computed(() => {
	const handle = props.sourceHandleId ?? '';
	const parts = handle.split('/');
	const type = parts[1] ?? 'main';
	return isValidNodeConnectionType(type) ? type : NodeConnectionTypes.Main;
});

// --- Execution State ---
// Track edge execution state (item counts)
const edgeItemCount = shallowRef<number>(0);
const edgeHasExecuted = shallowRef<boolean>(false);

// Initialize and subscribe to edge execution state
function updateEdgeExecutionState(): void {
	if (!executionDoc) return;

	const edgeExec = executionDoc.getEdgeExecution(props.id);
	if (!edgeExec) {
		edgeItemCount.value = 0;
		edgeHasExecuted.value = false;
		return;
	}

	edgeItemCount.value = edgeExec.totalItems;
	edgeHasExecuted.value = edgeExec.totalItems > 0;
}

let offEdgeExecutionChange: (() => void) | undefined;
let offExecutionStarted: (() => void) | undefined;
if (executionDoc) {
	// Watch for execution doc to become ready (async CRDT sync)
	// This handles the case where Tab 2 opens and receives existing execution data
	watch(
		() => executionDoc.isReady.value,
		(isReady) => {
			if (isReady) {
				updateEdgeExecutionState();
			}
		},
		{ immediate: true },
	);

	// Reset state when a new execution starts
	const { off: offStarted } = executionDoc.onExecutionStarted(() => {
		edgeItemCount.value = 0;
		edgeHasExecuted.value = false;
	});
	offExecutionStarted = offStarted;

	const { off } = executionDoc.onEdgeExecutionChange(({ edgeId }) => {
		if (edgeId === props.id) {
			updateEdgeExecutionState();
		}
	});
	offEdgeExecutionChange = off;
}

onScopeDispose(() => {
	offExecutionStarted?.();
	offEdgeExecutionChange?.();
});

const delayedHovered = ref(props.hovered);
const delayedHoveredSetTimeoutRef = ref<ReturnType<typeof setTimeout> | null>(null);
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

const isMainConnection = computed(() => connectionType.value === NodeConnectionTypes.Main);

const edgeStyle = computed(() => ({
	...props.style,
	...(isMainConnection.value ? {} : { strokeDasharray: '5,6' }),
}));

const edgeClasses = computed(() => ({
	[$style.edge]: true,
	hovered: delayedHovered.value,
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

/**
 * Calculate lightness values for edges.
 * Uses static base values to avoid re-renders on zoom/pan.
 * Hover state changes lightness for visual feedback.
 */
const edgeLightness = computed(() => {
	// Static lightness values (matching production at 100% zoom)
	// Avoids viewport dependency which would cause re-renders on every pan/zoom
	return {
		light: delayedHovered.value ? '0.54' : '0.84',
		dark: delayedHovered.value ? '0.62' : '0.42',
	};
});

const edgeStyles = computed(() => {
	const styles: Record<string, string> = {
		'--canvas-edge--color--lightness--light': edgeLightness.value.light,
		'--canvas-edge--color--lightness--dark': edgeLightness.value.dark,
	};

	// Use success color when edge has executed
	if (edgeHasExecuted.value) {
		styles['--canvas-edge--color'] = 'var(--color--success)';
	}

	return styles;
});

/**
 * Edge label text - shows item count during execution, or provided label otherwise.
 */
const edgeLabelText = computed(() => {
	if (edgeItemCount.value > 0) {
		return `${edgeItemCount.value} item${edgeItemCount.value !== 1 ? 's' : ''}`;
	}
	return props.label;
});

function onAdd() {
	emit('add', connection.value);
}

function onDelete() {
	emit('delete', connection.value);
}
</script>

<template>
	<g data-test-id="crdt-edge" :style="edgeStyles" v-bind="$attrs">
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
		<div data-test-id="crdt-edge-label" :style="edgeToolbarStyle" :class="edgeToolbarClasses">
			<CanvasEdgeToolbar
				v-if="renderToolbar"
				:type="connectionType"
				@add="onAdd"
				@delete="onDelete"
			/>
			<div v-else :class="$style.edgeLabel">{{ edgeLabelText }}</div>
		</div>
	</EdgeLabelRenderer>
</template>

<style lang="scss" module>
.edge {
	transition: fill 0.3s ease;
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
