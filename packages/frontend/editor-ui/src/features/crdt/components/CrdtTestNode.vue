<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getNodeIconSource } from '@/app/utils/nodeIcon';
import type { NodeProps } from '@vue-flow/core';
import { Handle, Position } from '@vue-flow/core';
import { computed, onScopeDispose, shallowRef, triggerRef } from 'vue';
import { useWorkflowDoc } from '../composables';
import { useWorkflowAwarenessOptional } from '../composables/useWorkflowAwareness';
import type { ComputedHandle } from '../types/workflowDocument.types';

const doc = useWorkflowDoc();
const nodeTypesStore = useNodeTypesStore();
const awareness = useWorkflowAwarenessOptional();

const props = defineProps<NodeProps>();

// Get initial node data (static - for type/icon)
const initialNode = doc.findNode(props.id);

// Fallback to default handles if server hasn't computed them yet
const getDefaultInputs = (): ComputedHandle[] => {
	if (initialNode?.type?.toLowerCase().includes('trigger')) {
		return []; // Trigger nodes have no inputs
	}
	return [{ handleId: 'inputs/main/0', type: 'main', mode: 'inputs', index: 0 }];
};
const getDefaultOutputs = (): ComputedHandle[] => {
	return [{ handleId: 'outputs/main/0', type: 'main', mode: 'outputs', index: 0 }];
};

const inputHandles = shallowRef<ComputedHandle[]>(
	initialNode?.inputs?.length ? initialNode.inputs : getDefaultInputs(),
);
const outputHandles = shallowRef<ComputedHandle[]>(
	initialNode?.outputs?.length ? initialNode.outputs : getDefaultOutputs(),
);

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
 * Handle with pre-computed offset style to avoid re-renders.
 * By pre-computing the style in a computed property, we avoid calling
 * functions in the template's :style binding which causes re-renders.
 */
interface MappedHandle extends ComputedHandle {
	offsetStyle: Record<string, string>;
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
 * Pre-compute handles with their offset styles.
 * This prevents re-renders during drag by avoiding function calls in template.
 */
const mappedInputHandles = computed((): MappedHandle[] => {
	const handles = inputHandles.value;
	const mainHandles = handles.filter((h) => isMainType(h.type));
	const nonMainHandles = handles.filter((h) => !isMainType(h.type));

	return handles.map((handle) => {
		const isMain = isMainType(handle.type);
		const group = isMain ? mainHandles : nonMainHandles;
		const indexInGroup = group.findIndex((h) => h.handleId === handle.handleId);
		return {
			...handle,
			offsetStyle: calculateOffsetStyle(indexInGroup, group.length, isMain),
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
		return {
			...handle,
			offsetStyle: calculateOffsetStyle(indexInGroup, group.length, isMain),
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
			:position="isMainType(handle.type) ? Position.Left : Position.Bottom"
			:class="[
				'crdt-handle',
				isMainType(handle.type) ? 'crdt-handle--left' : 'crdt-handle--bottom crdt-handle--non-main',
			]"
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
			:position="isMainType(handle.type) ? Position.Right : Position.Top"
			:class="[
				'crdt-handle',
				isMainType(handle.type) ? 'crdt-handle--right' : 'crdt-handle--top crdt-handle--non-main',
			]"
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
	border: 1px solid #777;
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

/* Left handles (main inputs) */
.crdt-handle--left {
	left: -6px;
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
