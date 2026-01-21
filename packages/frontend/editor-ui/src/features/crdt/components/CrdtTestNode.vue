<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getNodeIconSource } from '@/app/utils/nodeIcon';
import CanvasHandleDiamond from '@/features/workflows/canvas/components/elements/handles/render-types/parts/CanvasHandleDiamond.vue';
import CanvasHandleDot from '@/features/workflows/canvas/components/elements/handles/render-types/parts/CanvasHandleDot.vue';
import type { NodeProps } from '@vue-flow/core';
import { Handle, Position, useNode } from '@vue-flow/core';
import { computed, onScopeDispose, shallowRef, triggerRef, watch } from 'vue';
import { useWorkflowDoc } from '../composables';
import { useWorkflowAwarenessOptional } from '../composables/useWorkflowAwareness';
import type { ComputedHandle } from '../types/workflowDocument.types';

const doc = useWorkflowDoc();
const nodeTypesStore = useNodeTypesStore();
const awareness = useWorkflowAwarenessOptional();

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
// (auto-cleaned up by Vue when component unmounts)
watch(connectedEdges, updateConnectionCounts, { flush: 'sync' });

// Get initial node data (static - for type/icon)
const initialNode = doc.findNode(props.id);

const inputHandles = shallowRef<ComputedHandle[]>(initialNode?.inputs ?? []);
const outputHandles = shallowRef<ComputedHandle[]>(initialNode?.outputs ?? []);

// Subscribe only to handle changes (not position/params)
const { off: offHandles } = doc.onNodeHandlesChange(({ nodeId, inputs, outputs }) => {
	if (nodeId === props.id) {
		inputHandles.value = inputs;
		outputHandles.value = outputs;
		triggerRef(inputHandles);
		triggerRef(outputHandles);
	}
});

onScopeDispose(() => {
	offHandles();
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
 * Check if a handle type is "main" (horizontal flow: left/right).
 * Non-main types use vertical flow (top/bottom).
 */
function isMainType(type: string): boolean {
	return type === 'main';
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
 * Pre-compute handles with all template values to avoid re-renders.
 * This prevents re-renders during drag by avoiding function calls in template.
 * Uses memoized connection counts so only changes to THIS node's edges trigger updates.
 */
const mappedInputHandles = computed((): MappedHandle[] => {
	const handles = inputHandles.value;
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

		// Input handles:
		// - Main inputs: can only END connections (not start)
		// - Non-main inputs (ai_tool, model, etc.): can both start and end (bidirectional)
		const connectableStart = !limitReached && !isMain;
		const connectableEnd = !limitReached;

		// Pre-compute position and classes to avoid template function calls
		const position = isMain ? Position.Left : Position.Bottom;
		const positionClass = isMain ? 'left' : 'bottom';
		const classes = isMain
			? ['crdt-handle', 'crdt-handle--left']
			: ['crdt-handle', 'crdt-handle--bottom', 'crdt-handle--non-main'];

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
		:class="{ 'crdt-node--selected-by-collaborator': selectedByCollaborator }"
		:style="selectedByCollaborator ? { '--collaborator--color': selectedByCollaborator.color } : {}"
	>
		<!-- Input handles (main = left, non-main = bottom) -->
		<Handle
			v-for="handle in mappedInputHandles"
			:id="handle.handleId"
			:key="handle.handleId"
			type="target"
			:position="handle.position"
			:connectable-start="handle.connectableStart"
			:connectable-end="handle.connectableEnd"
			:class="handle.classes"
			:style="handle.offsetStyle"
		>
			<CanvasHandleDot
				v-if="handle.isMain"
				:class="['handle-render', handle.positionClass]"
				handle-classes="target"
			/>
			<CanvasHandleDiamond
				v-else
				:class="['handle-render', handle.positionClass]"
				handle-classes="target"
			/>
		</Handle>

		<!-- Node content -->
		<NodeIcon v-if="icon" :icon-source="icon" :size="30" :shrink="false" />
		<span v-else>{{ data.label }}</span>

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
			<CanvasHandleDot
				v-if="handle.isMain"
				:class="['handle-render', handle.positionClass]"
				handle-classes="source"
			/>
			<CanvasHandleDiamond
				v-else
				:class="['handle-render', handle.positionClass]"
				handle-classes="source"
			/>
		</Handle>

		<!-- Collaborator selection indicator -->
		<div v-if="selectedByCollaborator" class="collaborator-indicator">
			<span class="collaborator-name">{{ selectedByCollaborator.name }}</span>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.crdt-node {
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

.crdt-node--selected-by-collaborator {
	box-shadow:
		0 0 0 2px var(--collaborator--color),
		0 0 8px var(--collaborator--color);
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
</style>
