<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getNodeIconSource } from '@/app/utils/nodeIcon';
import type { NodeProps } from '@vue-flow/core';
import { Handle, Position, useNode } from '@vue-flow/core';
import { computed, onScopeDispose, shallowRef, triggerRef } from 'vue';
import { useWorkflowDoc } from '../composables';
import { useWorkflowAwarenessOptional } from '../composables/useWorkflowAwareness';
import type { ComputedHandle } from '../types/workflowDocument.types';

const doc = useWorkflowDoc();
const nodeTypesStore = useNodeTypesStore();
const awareness = useWorkflowAwarenessOptional();

const props = defineProps<NodeProps>();

// Use Vue Flow's built-in node composable for efficient edge tracking
// This provides a reactive ComputedRef<GraphEdge[]> that Vue Flow maintains internally
const { connectedEdges } = useNode(props.id);

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
 * Count connections for a specific handle from Vue Flow's connectedEdges.
 * Uses Vue Flow's reactive edge tracking instead of manual CRDT edge filtering.
 */
function countHandleConnections(handleId: string, mode: 'inputs' | 'outputs'): number {
	const edges = connectedEdges.value;
	if (mode === 'outputs') {
		// Count edges where this node is the source with this handle
		return edges.filter((e) => e.sourceHandle === handleId).length;
	} else {
		// Count edges where this node is the target with this handle
		return edges.filter((e) => e.targetHandle === handleId).length;
	}
}

/**
 * Pre-compute handles with all template values to avoid re-renders.
 * This prevents re-renders during drag by avoiding function calls in template.
 * Uses Vue Flow's reactive connectedEdges so connectivity updates automatically.
 */
const mappedInputHandles = computed((): MappedHandle[] => {
	const handles = inputHandles.value;
	const mainHandles = handles.filter((h) => isMainType(h.type));
	const nonMainHandles = handles.filter((h) => !isMainType(h.type));

	return handles.map((handle) => {
		const isMain = isMainType(handle.type);
		const group = isMain ? mainHandles : nonMainHandles;
		const indexInGroup = group.findIndex((h) => h.handleId === handle.handleId);

		// Check if max connections reached using Vue Flow's edge tracking
		const currentConnections = countHandleConnections(handle.handleId, 'inputs');
		const limitReached =
			handle.maxConnections !== undefined && currentConnections >= handle.maxConnections;

		// Input handles:
		// - Main inputs: can only END connections (not start)
		// - Non-main inputs (ai_tool, model, etc.): can both start and end (bidirectional)
		const connectableStart = !limitReached && !isMain;
		const connectableEnd = !limitReached;

		// Pre-compute position and classes to avoid template function calls
		const position = isMain ? Position.Left : Position.Bottom;
		const classes = isMain
			? ['crdt-handle', 'crdt-handle--left']
			: ['crdt-handle', 'crdt-handle--bottom', 'crdt-handle--non-main'];

		return {
			...handle,
			isMain,
			offsetStyle: calculateOffsetStyle(indexInGroup, group.length, isMain),
			position,
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

		// Check if max connections reached using Vue Flow's edge tracking
		const currentConnections = countHandleConnections(handle.handleId, 'outputs');
		const limitReached =
			handle.maxConnections !== undefined && currentConnections >= handle.maxConnections;

		// Output handles:
		// - Main outputs: can only START connections (not end - you don't drop onto outputs)
		// - Non-main outputs: can both start and end (bidirectional)
		const connectableStart = !limitReached;
		const connectableEnd = !limitReached && !isMain;

		// Pre-compute position and classes to avoid template function calls
		const position = isMain ? Position.Right : Position.Top;
		const classes = isMain
			? ['crdt-handle', 'crdt-handle--right']
			: ['crdt-handle', 'crdt-handle--top', 'crdt-handle--non-main'];

		return {
			...handle,
			isMain,
			offsetStyle: calculateOffsetStyle(indexInGroup, group.length, isMain),
			position,
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
		/>

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
		/>

		<!-- Collaborator selection indicator -->
		<div v-if="selectedByCollaborator" class="collaborator-indicator">
			<span class="collaborator-name">{{ selectedByCollaborator.name }}</span>
		</div>
	</div>
</template>

<style scoped>
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

/* Handle styles */
.crdt-handle {
	width: 12px;
	height: 12px;
	background: var(--color--foreground);
	border: 2px solid var(--color--background);
	border-radius: 50%;
}

.crdt-handle:hover {
	background: var(--color--primary);
}

/* Left handles (main inputs) - not draggable */
.crdt-handle--left {
	left: -6px;
	cursor: default;
}

/* Right handles (main outputs) */
.crdt-handle--right {
	right: -6px;
}

/* Top handles (non-main outputs) */
.crdt-handle--top {
	top: -6px;
}

/* Bottom handles (non-main inputs like AI model/tool) */
.crdt-handle--bottom {
	bottom: -6px;
}

/* Non-main handles have different styling */
.crdt-handle--non-main {
	background: var(--color--foreground--tint-1);
	width: 10px;
	height: 10px;
	border-radius: var(--radius--sm);
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
