<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getNodeIconSource } from '@/app/utils/nodeIcon';
import CanvasHandleDiamond from '@/features/workflows/canvas/components/elements/handles/render-types/parts/CanvasHandleDiamond.vue';
import CanvasHandleDot from '@/features/workflows/canvas/components/elements/handles/render-types/parts/CanvasHandleDot.vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { NodeProps } from '@vue-flow/core';
import { Handle, Position, useNode } from '@vue-flow/core';
import { computed, inject, onScopeDispose, shallowRef, triggerRef, watch } from 'vue';
import { useWorkflowDoc } from '../composables';
import { useWorkflowAwarenessOptional } from '../composables/useWorkflowAwareness';
import type { ComputedHandle } from '../types/workflowDocument.types';
import type { ExecutionDocument } from '../types/executionDocument.types';

const i18n = useI18n();

const doc = useWorkflowDoc();
const nodeTypesStore = useNodeTypesStore();
const awareness = useWorkflowAwarenessOptional();

// Inject execution document (provided by parent canvas component)
const executionDoc = inject<ExecutionDocument | null>('executionDoc', null);

const props = defineProps<NodeProps>();

// Use Vue Flow's useNode for O(1) edge lookups (only edges connected to this node)
const { connectedEdges } = useNode(props.id);

/**
 * Connection counts per handle, stored as a shallowRef.
 * Updated from Vue Flow's connectedEdges but with change detection
 * to prevent re-renders when counts haven't actually changed.
 */
const connectionCounts = shallowRef<Map<string, number>>(new Map());

/**
 * Calculate connection counts from Vue Flow's connectedEdges.
 * Only updates the ref if counts actually changed.
 */
function updateConnectionCounts(): void {
	const edges = connectedEdges.value;
	const newCounts = new Map<string, number>();

	for (const edge of edges) {
		if (edge.sourceHandle) {
			newCounts.set(edge.sourceHandle, (newCounts.get(edge.sourceHandle) ?? 0) + 1);
		}
		if (edge.targetHandle) {
			newCounts.set(edge.targetHandle, (newCounts.get(edge.targetHandle) ?? 0) + 1);
		}
	}

	// Only trigger reactivity if counts actually changed
	const oldCounts = connectionCounts.value;
	if (newCounts.size !== oldCounts.size) {
		connectionCounts.value = newCounts;
		return;
	}
	for (const [key, value] of newCounts) {
		if (oldCounts.get(key) !== value) {
			connectionCounts.value = newCounts;
			return;
		}
	}
}

// Initialize connection counts
updateConnectionCounts();

// Watch connectedEdges and update counts with change detection
watch(connectedEdges, updateConnectionCounts, { flush: 'sync' });

// Get initial node data (static - for type/icon)
const initialNode = doc.findNode(props.id);

const inputHandles = shallowRef<ComputedHandle[]>(initialNode?.inputs ?? []);
const outputHandles = shallowRef<ComputedHandle[]>(initialNode?.outputs ?? []);
const subtitle = shallowRef<string | undefined>(initialNode?.subtitle);
const disabled = shallowRef<boolean>(initialNode?.disabled ?? false);

// Subscribe to handle changes (not position/params)
const { off: offHandles } = doc.onNodeHandlesChange(({ nodeId, inputs, outputs }) => {
	if (nodeId === props.id) {
		inputHandles.value = inputs;
		outputHandles.value = outputs;
		triggerRef(inputHandles);
		triggerRef(outputHandles);
	}
});

// Subscribe to subtitle changes from server
const { off: offSubtitle } = doc.onNodeSubtitleChange(({ nodeId, subtitle: newSubtitle }) => {
	if (nodeId === props.id) {
		subtitle.value = newSubtitle;
	}
});

// Subscribe to disabled state changes
const { off: offDisabled } = doc.onNodeDisabledChange(({ nodeId, disabled: newDisabled }) => {
	if (nodeId === props.id) {
		disabled.value = newDisabled;
	}
});

// Track pinned data state
const hasPinnedData = shallowRef<boolean>(false);

// Initialize pinned data state
if (doc.getPinnedData) {
	const pinnedData = doc.getPinnedData(props.id);
	hasPinnedData.value = pinnedData !== undefined && pinnedData.length > 0;
}

// --- Execution State ---
// Track execution status for this node
const executionStatus = shallowRef<'idle' | 'running' | 'success' | 'error'>('idle');
const outputItemCount = shallowRef<number>(0);
const executionError = shallowRef<string | null>(null);
const runDataIterations = shallowRef<number>(0);

// Initialize execution state from execution doc
function updateExecutionState(): void {
	if (!executionDoc) return;

	const nodeData = executionDoc.getNodeExecutionById(props.id);
	if (!nodeData?.length) {
		executionStatus.value = 'idle';
		outputItemCount.value = 0;
		executionError.value = null;
		runDataIterations.value = 0;
		return;
	}

	const lastRun = nodeData[nodeData.length - 1];
	const status = lastRun.executionStatus;

	if (status === 'success') {
		executionStatus.value = 'success';
	} else if (status === 'error') {
		executionStatus.value = 'error';
		executionError.value = lastRun.error?.message ?? 'Unknown error';
	} else {
		executionStatus.value = 'running';
	}

	// Calculate output item count from data
	const mainOutputs = lastRun.data?.main ?? [];
	outputItemCount.value = mainOutputs.flat().length;

	// Track number of iterations (runs) for this node
	runDataIterations.value = nodeData.length;
}

// Subscribe to execution state changes
let offExecutionChange: (() => void) | undefined;
let offExecutionStarted: (() => void) | undefined;
if (executionDoc) {
	// Watch for execution doc to become ready (async CRDT sync)
	// This handles the case where Tab 2 opens and receives existing execution data
	watch(
		() => executionDoc.isReady.value,
		(isReady) => {
			if (isReady) {
				updateExecutionState();
			}
		},
		{ immediate: true },
	);

	// Reset state when a new execution starts
	const { off: offStarted } = executionDoc.onExecutionStarted(() => {
		executionStatus.value = 'idle';
		outputItemCount.value = 0;
		executionError.value = null;
		runDataIterations.value = 0;
	});
	offExecutionStarted = offStarted;

	const { off } = executionDoc.onNodeExecutionChange(({ nodeId }) => {
		if (nodeId === props.id) {
			updateExecutionState();
		}
	});
	offExecutionChange = off;
}

// Subscribe to pinned data changes
let offPinnedData: (() => void) | undefined;
if (doc.onPinnedDataChange) {
	const { off } = doc.onPinnedDataChange(({ nodeId }) => {
		if (nodeId === props.id) {
			const pinnedData = doc.getPinnedData?.(props.id);
			hasPinnedData.value = pinnedData !== undefined && pinnedData.length > 0;
		}
	});
	offPinnedData = off;
}

onScopeDispose(() => {
	offHandles();
	offSubtitle();
	offDisabled();
	offPinnedData?.();
	offExecutionStarted?.();
	offExecutionChange?.();
});

const nodeType = computed(() => {
	if (!initialNode?.type) return undefined;
	return nodeTypesStore.getNodeType(initialNode.type, initialNode.typeVersion);
});

const icon = computed(() => {
	if (!nodeType.value) return undefined;
	return getNodeIconSource(nodeType.value);
});

/**
 * Check if this is a trigger node (has 'trigger' in its group).
 * Trigger nodes get asymmetric rounded corners (rounded left side).
 */
const isTriggerNode = computed((): boolean => {
	if (!nodeType.value) return false;
	return nodeType.value.group?.includes('trigger') ?? false;
});

/**
 * Check if this is a configuration node (has non-main outputs).
 * Configuration nodes are pill-shaped (fully rounded).
 */
const isConfigurationNode = computed((): boolean => {
	const outputs = outputHandles.value;
	if (outputs.length === 0) return false;
	return outputs.some((output) => output.type !== 'main');
});

/**
 * Check if this is a configurable node (has non-main inputs).
 * Configurable nodes (like AI Agent) render their label inside the node body.
 */
const isConfigurableNode = computed((): boolean => {
	const inputs = inputHandles.value;
	return inputs.some((input) => input.type !== 'main');
});

/**
 * Check if a handle type is "main" (horizontal flow: left/right).
 * Non-main types use vertical flow (top/bottom).
 */
function isMainType(type: string): boolean {
	return type === 'main';
}

/**
 * Minimum number of non-main input slots to show.
 * This ensures consistent spacing on nodes like AI Agent.
 */
const NODE_MIN_INPUT_ITEMS_COUNT = 4;

/**
 * Inserts spacers (null values) between required and optional endpoints.
 * This ensures a minimum number of slots are shown for consistent positioning.
 * Matches the production behavior in canvas.utils.ts.
 */
function insertSpacersBetweenEndpoints<T>(
	endpoints: T[],
	requiredEndpointsCount = 0,
): Array<T | null> {
	const endpointsWithSpacers: Array<T | null> = [...endpoints];
	const optionalNonMainInputsCount = endpointsWithSpacers.length - requiredEndpointsCount;
	const spacerCount =
		NODE_MIN_INPUT_ITEMS_COUNT - requiredEndpointsCount - optionalNonMainInputsCount;

	// Insert `null` in between required non-main inputs and non-required non-main inputs
	// to separate them visually if there are less than `minEndpointsCount` inputs in total
	if (endpointsWithSpacers.length < NODE_MIN_INPUT_ITEMS_COUNT) {
		for (let i = 0; i < spacerCount; i++) {
			endpointsWithSpacers.splice(requiredEndpointsCount + i, 0, null);
		}
	}

	return endpointsWithSpacers;
}

/**
 * Handle with pre-computed values to avoid re-renders.
 * By pre-computing these in a computed property, we avoid calling
 * functions in the template which causes re-renders.
 */
interface MappedHandle extends ComputedHandle {
	/** Whether this is a "main" type handle (horizontal flow: left/right) */
	isMain: boolean;
	/** Pre-computed offset style for positioning */
	offsetStyle: Record<string, string>;
	/** Pre-computed position for Vue Flow Handle component */
	position:
		| typeof Position.Left
		| typeof Position.Right
		| typeof Position.Top
		| typeof Position.Bottom;
	/** Position as lowercase string for CSS class */
	positionClass: 'left' | 'right' | 'top' | 'bottom';
	/** Pre-computed CSS classes */
	classes: string[];
	/** Whether this handle can start a connection (drag from it) */
	connectableStart: boolean;
	/** Whether this handle can end a connection (drop onto it) */
	connectableEnd: boolean;
}

/**
 * Calculate offset style for a handle at a given index in a group.
 * Uses the same algorithm as CanvasNode.vue: (100 / (total + 1)) * (index + 1)%
 */
function calculateOffsetStyle(
	index: number,
	total: number,
	isMain: boolean,
): Record<string, string> {
	const offset = (100 / (total + 1)) * (index + 1);
	if (isMain) {
		return { top: `${offset}%` };
	} else {
		return { left: `${offset}%` };
	}
}

/**
 * Get connection count for a specific handle from the stable counts map.
 * This avoids re-filtering edges on every access.
 */
function getHandleConnectionCount(handleId: string): number {
	return connectionCounts.value.get(handleId) ?? 0;
}

/**
 * Check if a handle has any connections.
 * Used to determine if we should show the plus button on output handles.
 */
function isHandleConnected(handleId: string): boolean {
	return getHandleConnectionCount(handleId) > 0;
}

/**
 * Pre-compute handles with all template values to avoid re-renders.
 * This prevents re-renders during drag by avoiding function calls in template.
 * Uses memoized connection counts so only changes to THIS node's edges trigger updates.
 *
 * Non-main inputs include spacers to maintain consistent positioning (matching production).
 */
const mappedInputHandles = computed((): Array<MappedHandle | null> => {
	const handles = inputHandles.value;
	const mainHandles = handles.filter((h) => isMainType(h.type));
	const nonMainHandles = handles.filter((h) => !isMainType(h.type));

	// Separate required and optional non-main handles
	const requiredNonMain = nonMainHandles.filter((h) => h.required);
	const optionalNonMain = nonMainHandles.filter((h) => !h.required);

	// Insert spacers between required and optional non-main handles
	const nonMainWithSpacers = insertSpacersBetweenEndpoints(
		[...requiredNonMain, ...optionalNonMain],
		requiredNonMain.length,
	);

	// Map main handles
	const mappedMain: MappedHandle[] = mainHandles.map((handle, indexInGroup) => {
		const currentConnections = getHandleConnectionCount(handle.handleId);
		const limitReached =
			handle.maxConnections !== undefined && currentConnections >= handle.maxConnections;

		return {
			...handle,
			isMain: true,
			offsetStyle: calculateOffsetStyle(indexInGroup, mainHandles.length, true),
			position: Position.Left,
			positionClass: 'left' as const,
			classes: ['crdt-handle', 'crdt-handle--left'],
			connectableStart: false, // Main inputs can only END connections
			connectableEnd: !limitReached,
		};
	});

	// Map non-main handles with spacers (null entries remain null)
	const mappedNonMain: Array<MappedHandle | null> = nonMainWithSpacers.map(
		(handle, indexInGroup) => {
			if (handle === null) return null;

			const currentConnections = getHandleConnectionCount(handle.handleId);
			const limitReached =
				handle.maxConnections !== undefined && currentConnections >= handle.maxConnections;

			return {
				...handle,
				isMain: false,
				offsetStyle: calculateOffsetStyle(indexInGroup, nonMainWithSpacers.length, false),
				position: Position.Bottom,
				positionClass: 'bottom' as const,
				classes: ['crdt-handle', 'crdt-handle--bottom', 'crdt-handle--non-main'],
				connectableStart: !limitReached, // Non-main inputs can start connections
				connectableEnd: !limitReached,
			};
		},
	);

	return [...mappedMain, ...mappedNonMain];
});

const mappedOutputHandles = computed((): MappedHandle[] => {
	const handles = outputHandles.value;
	const mainHandles = handles.filter((h) => isMainType(h.type));
	const nonMainHandles = handles.filter((h) => !isMainType(h.type));

	return handles.map((handle) => {
		const isMain = isMainType(handle.type);
		const group = isMain ? mainHandles : nonMainHandles;
		const indexInGroup = group.findIndex((h) => h.handleId === handle.handleId);

		// Check if max connections reached using memoized connection counts
		const currentConnections = getHandleConnectionCount(handle.handleId);
		const limitReached =
			handle.maxConnections !== undefined && currentConnections >= handle.maxConnections;

		// Output handles:
		// - Main outputs: can only START connections (not end - you don't drop onto outputs)
		// - Non-main outputs: can both start and end (bidirectional)
		const connectableStart = !limitReached;
		const connectableEnd = !limitReached && !isMain;

		// Pre-compute position and classes to avoid template function calls
		const position = isMain ? Position.Right : Position.Top;
		const positionClass = isMain ? 'right' : 'top';
		const classes = isMain
			? ['crdt-handle', 'crdt-handle--right']
			: ['crdt-handle', 'crdt-handle--top', 'crdt-handle--non-main'];

		return {
			...handle,
			isMain,
			offsetStyle: calculateOffsetStyle(indexInGroup, group.length, isMain),
			position,
			positionClass,
			classes,
			connectableStart,
			connectableEnd,
		};
	});
});

/**
 * Whether the strike-through line should be visible.
 * Shown for disabled nodes with exactly 1 main input and 1 main output.
 * Configuration nodes (pill-shaped) don't show strike-through.
 */
const isStrikethroughVisible = computed(() => {
	if (!disabled.value) return false;

	// Configuration nodes (pill-shaped, with non-main outputs) don't show strike-through
	if (isConfigurationNode.value) return false;

	const mainInputs = inputHandles.value.filter((h) => h.type === 'main');
	const mainOutputs = outputHandles.value.filter((h) => h.type === 'main');

	// Must have exactly 1 main input and 1 main output
	return mainInputs.length === 1 && mainOutputs.length === 1;
});

/**
 * Find collaborator who has this node selected (if any).
 * Uses O(1) lookup via the reverse index instead of iterating all collaborators.
 */
const selectedByCollaborator = computed(() => {
	if (!awareness) return null;
	const selectingUsers = awareness.nodeIdToSelectingUsers.get(props.id);
	return selectingUsers?.[0] ?? null;
});
</script>

<template>
	<div
		class="crdt-node"
		:class="{
			'crdt-node--selected': props.selected,
			'crdt-node--selected-by-collaborator': selectedByCollaborator,
			'crdt-node--trigger': isTriggerNode,
			'crdt-node--configuration': isConfigurationNode,
			'crdt-node--configurable': isConfigurableNode,
			'crdt-node--disabled': disabled,
			'crdt-node--success': executionStatus === 'success',
			'crdt-node--error': executionStatus === 'error',
			'crdt-node--running': executionStatus === 'running',
		}"
		:style="selectedByCollaborator ? { '--collaborator--color': selectedByCollaborator.color } : {}"
	>
		<!-- Input handles (main = left, non-main = bottom with spacers) -->
		<template
			v-for="(handle, index) in mappedInputHandles"
			:key="handle?.handleId ?? `spacer-${index}`"
		>
			<Handle
				v-if="handle !== null"
				:id="handle.handleId"
				type="target"
				:position="handle.position"
				:connectable-start="handle.connectableStart"
				:connectable-end="handle.connectableEnd"
				:class="handle.classes"
				:style="handle.offsetStyle"
			>
				<template v-if="handle.isMain">
					<div
						v-if="handle.displayName"
						:class="[
							'handle-label',
							'handle-label--main-input',
							{ 'handle-label--required': handle.required },
						]"
					>
						{{ handle.displayName }}
					</div>
					<CanvasHandleDot
						:class="['handle-render', handle.positionClass]"
						handle-classes="target"
					/>
				</template>
				<template v-else>
					<div
						v-if="handle.displayName"
						:class="[
							'handle-label',
							'handle-label--non-main-input',
							{ 'handle-label--required': handle.required },
						]"
					>
						{{ handle.displayName }}
					</div>
					<CanvasHandleDiamond
						:class="['handle-render', handle.positionClass]"
						handle-classes="target"
					/>
					<!-- Inline plus button for non-main inputs (bottom position, extends downward) -->
					<svg
						v-if="!isHandleConnected(handle.handleId)"
						class="handle-plus handle-plus--bottom"
						viewBox="0 0 24 70"
						width="24"
						height="70"
					>
						<line class="handle-plus-line" x1="12" y1="0" x2="12" y2="47" stroke-width="2" />
						<g class="handle-plus-button" transform="translate(0, 46)">
							<rect x="2" y="2" width="20" height="20" stroke-width="2" rx="4" />
							<path
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M8 12h8m-4-4v8"
							/>
						</g>
					</svg>
				</template>
			</Handle>
		</template>

		<!-- Node content -->
		<NodeIcon v-if="icon" :icon-source="icon" :size="30" :shrink="false" :disabled="disabled" />
		<span v-else>{{ data.label }}</span>

		<!-- Description (title & subtitle) -->
		<div class="description">
			<div v-if="data.label" class="label">{{ data.label }}</div>
			<div v-if="disabled" class="disabled-label">({{ i18n.baseText('node.disabled') }})</div>
			<div v-if="subtitle" class="subtitle">{{ subtitle }}</div>
		</div>

		<!-- Output handles (main = right, non-main = top) -->
		<Handle
			v-for="handle in mappedOutputHandles"
			:id="handle.handleId"
			:key="handle.handleId"
			type="source"
			:position="handle.position"
			:connectable-start="handle.connectableStart"
			:connectable-end="handle.connectableEnd"
			:class="handle.classes"
			:style="handle.offsetStyle"
		>
			<template v-if="handle.isMain">
				<div
					v-if="handle.displayName"
					:class="[
						'handle-label',
						'handle-label--main-output',
						{ 'handle-label--required': handle.required },
					]"
				>
					{{ handle.displayName }}
				</div>
				<CanvasHandleDot :class="['handle-render', handle.positionClass]" handle-classes="source" />
				<!-- Inline plus button (avoids useCanvas dependency from CanvasHandlePlus) -->
				<svg
					v-if="!isHandleConnected(handle.handleId)"
					class="handle-plus"
					viewBox="0 0 70 24"
					width="70"
					height="24"
				>
					<line class="handle-plus-line" x1="0" y1="12" x2="47" y2="12" stroke-width="2" />
					<g class="handle-plus-button" transform="translate(46, 0)">
						<rect x="2" y="2" width="20" height="20" stroke-width="2" rx="4" />
						<path
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M8 12h8m-4-4v8"
						/>
					</g>
				</svg>
			</template>
			<template v-else>
				<div
					v-if="handle.displayName"
					:class="[
						'handle-label',
						'handle-label--non-main-output',
						{ 'handle-label--required': handle.required },
					]"
				>
					{{ handle.displayName }}
				</div>
				<CanvasHandleDiamond
					:class="['handle-render', handle.positionClass]"
					handle-classes="source"
				/>
				<!-- Non-main outputs (configuration nodes) don't have plus buttons in production -->
			</template>
		</Handle>

		<!-- Pinned data indicator -->
		<div v-if="hasPinnedData" class="pinned-indicator" data-test-id="canvas-node-status-pinned">
			<N8nIcon icon="node-pin" size="medium" />
		</div>

		<!-- Execution status icons (positioned bottom-right inside node, matching production) -->
		<div v-if="executionStatus !== 'idle' && !disabled" class="status-icons">
			<div
				v-if="executionStatus === 'error'"
				class="status status--error"
				data-test-id="canvas-node-status-error"
			>
				<N8nIcon icon="node-execution-error" size="medium" :title="executionError ?? undefined" />
			</div>
			<div
				v-else-if="executionStatus === 'success'"
				class="status status--success"
				data-test-id="canvas-node-status-success"
			>
				<N8nIcon icon="node-success" size="medium" />
				<span v-if="runDataIterations > 1" class="status-count">{{ runDataIterations }}</span>
			</div>
			<!-- Running state is indicated by the animated border, not an icon -->
		</div>

		<!-- Collaborator selection indicator -->
		<div v-if="selectedByCollaborator" class="collaborator-indicator">
			<span class="collaborator-name">{{ selectedByCollaborator.name }}</span>
		</div>

		<!-- Strike-through line for disabled nodes (only for single main input/output) -->
		<div v-if="isStrikethroughVisible" class="disabled-strike-through" />
	</div>
</template>

<style lang="scss" scoped>
.crdt-node {
	--trigger-node--radius: 36px;

	position: relative;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	background: var(--node--color--background, #fff);
	/* Default size - Vue Flow overrides via width/height when set on the node */
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xs);
	box-sizing: border-box;
	transition: box-shadow 0.15s ease;
}

/* Selected by local user - greyish outline (matches production CanvasNodeDefault) */
.crdt-node--selected {
	/* stylelint-disable-next-line @n8n/css-var-naming */
	box-shadow: 0 0 0 calc(6px * var(--canvas-zoom-compensation-factor, 1))
		var(--canvas--color--selected-transparent);
}

/* Selected by collaborator - colored outline (works alongside local selection box-shadow) */
.crdt-node--selected-by-collaborator {
	/* stylelint-disable-next-line @n8n/css-var-naming */
	outline: calc(1px * var(--canvas-zoom-compensation-factor, 1)) solid var(--collaborator--color);
}

/* Trigger nodes - asymmetric rounded corners (rounded left side) */
.crdt-node--trigger {
	border-radius: var(--trigger-node--radius) var(--radius--lg) var(--radius--lg)
		var(--trigger-node--radius);
}

/* Configuration nodes - pill-shaped (fully rounded ends) */
.crdt-node--configuration {
	border-radius: 50%;
}

/* Configurable nodes - label renders inside the node body */
.crdt-node--configurable {
	--node--icon--size: 30px;

	justify-content: flex-start;
	padding-left: calc(40px - (var(--node--icon--size)) / 2 - var(--border-width, 1px));

	.description {
		top: unset;
		position: relative;
		margin-top: 0;
		margin-left: var(--spacing--xs);
		margin-right: var(--spacing--xs);
		width: auto;
		min-width: unset;
		overflow: hidden;
		text-overflow: ellipsis;
		flex-grow: 1;
		flex-shrink: 1;
	}

	.label {
		text-align: left;
	}

	.subtitle {
		text-align: left;
	}

	.disabled-label {
		text-align: left;
	}
}

/* Disabled nodes - different border color */
.crdt-node--disabled {
	border-color: var(--color--foreground);
}

/* Success state - green border */
.crdt-node--success {
	border-width: 2px;
	border-color: var(--color--success);
}

/* Error state - red border */
.crdt-node--error {
	border-color: var(--color--danger);
}

/* Running state - animated gradient border */
.crdt-node--running {
	border-color: transparent;
}

/* stylelint-disable */
.crdt-node--running::after {
	content: '';
	position: absolute;
	inset: -3px;
	border-radius: 10px;
	z-index: -1;
	background: conic-gradient(
		from var(--node--gradient-angle),
		rgba(255, 109, 90, 1),
		rgba(255, 109, 90, 1) 20%,
		rgba(255, 109, 90, 0.2) 35%,
		rgba(255, 109, 90, 0.2) 65%,
		rgba(255, 109, 90, 1) 90%,
		rgba(255, 109, 90, 1)
	);
	animation: border-rotate 1.5s linear infinite;
}

/* Trigger nodes need different border-radius for the animated border */
.crdt-node--trigger.crdt-node--running::after {
	border-radius: var(--trigger-node--radius) var(--radius--lg) var(--radius--lg)
		var(--trigger-node--radius);
}

@property --node--gradient-angle {
	syntax: '<angle>';
	initial-value: 0deg;
	inherits: false;
}

@keyframes border-rotate {
	from {
		--node--gradient-angle: 0deg;
	}
	to {
		--node--gradient-angle: 360deg;
	}
}
/* stylelint-enable */

/* Strike-through line for disabled nodes (matches CanvasNodeDisabledStrikeThrough.vue) */
.disabled-strike-through {
	border: 1px solid var(--color--foreground--shade-1);
	position: absolute;
	top: calc(50% - 1px);
	left: -4px;
	width: calc(100% + 8px);
	pointer-events: none;
}

/* Handle styles - transparent container like production CanvasHandleRenderer */
.crdt-handle {
	--handle--indicator--width: 16px;
	--handle--indicator--height: 16px;

	width: var(--handle--indicator--width);
	height: var(--handle--indicator--height);
	display: inline-flex;
	justify-content: center;
	align-items: center;
	border: 0;
	z-index: 1;
	background: transparent;
	border-radius: 0;
}

/* Left handles (main inputs) - not draggable */
.crdt-handle--left {
	cursor: default;
}

/* Right handles (main outputs) */
.crdt-handle--right {
	cursor: crosshair;
}

/* Description (title & subtitle) below the node */
.description {
	top: 100%;
	position: absolute;
	width: 100%;
	min-width: calc(100% * 2);
	margin-top: var(--spacing--2xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	pointer-events: none;
}

.label,
.disabled-label {
	font-size: var(--font-size--md);
	text-align: center;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	overflow: hidden;
	overflow-wrap: anywhere;
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
}

.subtitle {
	width: 100%;
	text-align: center;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--xs);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--sm);
	font-weight: var(--font-weight--regular);
}

.collaborator-indicator {
	position: absolute;
	top: -20px;
	left: 50%;
	transform: translateX(-50%);
	pointer-events: none;
}

.collaborator-name {
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
	background-color: var(--collaborator--color);
	color: white;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
	max-width: 100px;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* Pinned data indicator (icon only, positioned bottom-right inside node) */
.pinned-indicator {
	position: absolute;
	bottom: var(--spacing--3xs);
	right: var(--spacing--3xs);
	color: var(--color--secondary);
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: none;
}

/* Status icons (positioned bottom-right inside node, matching production) */
.status-icons {
	position: absolute;
	bottom: var(--spacing--3xs);
	right: var(--spacing--3xs);
}

.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
	font-weight: var(--font-weight--bold);
}

.status--success {
	color: var(--color--success);
}

.status--error {
	color: var(--color--danger);
	cursor: default;
}

.status-count {
	font-size: var(--font-size--sm);
}

/* Handle labels */
.handle-label {
	position: absolute;
	font-size: var(--font-size--2xs);
	color: var(--canvas--label--color);
	background: var(--canvas--label--color--background);
	white-space: nowrap;
	text-align: center;
	z-index: 1;
}

/* Main input labels (left handles) - label appears to the LEFT of the handle */
.handle-label--main-input {
	top: 50%;
	left: calc(var(--spacing--xs) * -1);
	/* stylelint-disable-next-line @n8n/css-var-naming */
	transform: translate(0, -50%) scale(var(--canvas-zoom-compensation-factor, 1)) translate(-100%, 0);
	transform-origin: center left;
	color: var(--color--foreground--shade-2);
}

/* Main output labels (right handles) - label appears to the LEFT of the handle (inside node area) */
.handle-label--main-output {
	top: 50%;
	left: var(--spacing--md);
	/* stylelint-disable-next-line @n8n/css-var-naming */
	transform: translate(0, -50%) scale(var(--canvas-zoom-compensation-factor, 1));
	transform-origin: center left;
}

/* Non-main input labels (bottom handles) - label appears BELOW the handle */
.handle-label--non-main-input {
	top: var(--spacing--lg);
	left: 50%;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	transform: translate(-50%, 0) scale(var(--canvas-zoom-compensation-factor, 1));
}

/* Non-main output labels (top handles) - label appears ABOVE the handle */
.handle-label--non-main-output {
	top: calc(-1 * var(--spacing--lg));
	left: 50%;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	transform: translate(-50%, 0) scale(var(--canvas-zoom-compensation-factor, 1));
}

/* Required indicator asterisk */
.handle-label--required::after {
	content: '*';
	color: var(--color--danger);
}

/* Handle plus line and button */
.handle-plus {
	position: absolute;
	left: 100%;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	transform: scale(var(--canvas-zoom-compensation-factor, 1));
	transform-origin: center left;
}

.handle-plus--bottom {
	left: 50%;
	top: 100%;
	bottom: auto;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	transform: translateX(-50%) scale(var(--canvas-zoom-compensation-factor, 1));
	transform-origin: top center;
}

.handle-plus-line {
	stroke: light-dark(var(--color--neutral-300), var(--color--neutral-700));
}

.handle-plus-button {
	color: light-dark(var(--color--neutral-700), var(--color--neutral-250));
	cursor: pointer;

	rect {
		stroke: light-dark(var(--color--neutral-200), var(--color--neutral-850));
		fill: light-dark(var(--color--neutral-200), var(--color--neutral-850));
	}

	&:hover {
		color: light-dark(var(--color--neutral-850), var(--color--neutral-150));

		rect {
			stroke: light-dark(var(--color--neutral-250), var(--color--neutral-800));
			fill: light-dark(var(--color--neutral-250), var(--color--neutral-800));
		}
	}
}
</style>
