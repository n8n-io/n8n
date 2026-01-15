<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getNodeIconSource } from '@/app/utils/nodeIcon';
import type { NodeProps } from '@vue-flow/core';
import { Handle, Position } from '@vue-flow/core';
import { computed } from 'vue';
import { useNodeReactive, useWorkflowDoc } from '../composables';
import { useWorkflowAwarenessOptional } from '../composables/useWorkflowAwareness';
import type { ComputedHandle } from '../types/workflowDocument.types';

const doc = useWorkflowDoc();
const nodeTypesStore = useNodeTypesStore();
const awareness = useWorkflowAwarenessOptional();

const props = defineProps<NodeProps>();

// Use reactive node reference that updates when handles change
const node = useNodeReactive(doc, props.id);

const nodeType = computed(() => {
	if (!node.value?.type) return undefined;
	return nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion);
});

const icon = computed(() => {
	if (!nodeType.value) return undefined;
	return getNodeIconSource(nodeType.value);
});

/**
 * Input handles from server-computed data.
 * Falls back to single main input if not available.
 */
const inputHandles = computed((): ComputedHandle[] => {
	if (node.value?.inputs && node.value.inputs.length > 0) {
		return node.value.inputs;
	}
	// Fallback for nodes without computed handles (e.g., REST mode or old data)
	// Check if it's a trigger node (no inputs)
	if (node.value?.type?.toLowerCase().includes('trigger')) {
		return [];
	}
	return [{ handleId: 'inputs/main/0', type: 'main', mode: 'inputs', index: 0 }];
});

/**
 * Output handles from server-computed data.
 * Falls back to single main output if not available.
 */
const outputHandles = computed((): ComputedHandle[] => {
	if (node.value?.outputs && node.value.outputs.length > 0) {
		return node.value.outputs;
	}
	// Fallback for nodes without computed handles
	return [{ handleId: 'outputs/main/0', type: 'main', mode: 'outputs', index: 0 }];
});

/**
 * Check if a handle type is "main" (horizontal flow: left/right).
 * Non-main types use vertical flow (top/bottom).
 */
function isMainType(type: string): boolean {
	return type === 'main';
}

/**
 * Split handles by position for proper offset calculation.
 */
const mainInputHandles = computed(() => inputHandles.value.filter((h) => isMainType(h.type)));
const nonMainInputHandles = computed(() => inputHandles.value.filter((h) => !isMainType(h.type)));
const mainOutputHandles = computed(() => outputHandles.value.filter((h) => isMainType(h.type)));
const nonMainOutputHandles = computed(() => outputHandles.value.filter((h) => !isMainType(h.type)));

/**
 * Calculate offset style for a handle within its position group.
 * Uses the same algorithm as CanvasNode.vue: (100 / (total + 1)) * (index + 1)%
 * This ensures handles are evenly distributed within the node bounds.
 */
function getHandleOffsetStyle(
	handle: ComputedHandle,
	groupHandles: ComputedHandle[],
): Record<string, string> {
	const indexInGroup = groupHandles.findIndex((h) => h.handleId === handle.handleId);
	const totalInGroup = groupHandles.length;

	// Calculate percentage offset: distributes handles evenly within the node
	// e.g., 1 handle: 50%, 2 handles: 33%/66%, 3 handles: 25%/50%/75%, etc.
	const offset = (100 / (totalInGroup + 1)) * (indexInGroup + 1);

	if (isMainType(handle.type)) {
		// Vertical distribution for left/right handles
		return { top: `${offset}%` };
	} else {
		// Horizontal distribution for top/bottom handles
		return { left: `${offset}%` };
	}
}

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
		<!-- Main input handles (left side) -->
		<Handle
			v-for="handle in mainInputHandles"
			:id="handle.handleId"
			:key="handle.handleId"
			type="target"
			:position="Position.Left"
			class="crdt-handle crdt-handle--left"
			:style="getHandleOffsetStyle(handle, mainInputHandles)"
		/>

		<!-- Non-main input handles (bottom side - for AI model/tool inputs) -->
		<Handle
			v-for="handle in nonMainInputHandles"
			:id="handle.handleId"
			:key="handle.handleId"
			type="target"
			:position="Position.Bottom"
			class="crdt-handle crdt-handle--bottom crdt-handle--non-main"
			:style="getHandleOffsetStyle(handle, nonMainInputHandles)"
		/>

		<!-- Node content -->
		<NodeIcon v-if="icon" :icon-source="icon" :size="30" :shrink="false" />
		<span v-else>{{ data.label }}</span>

		<!-- Main output handles (right side) -->
		<Handle
			v-for="handle in mainOutputHandles"
			:id="handle.handleId"
			:key="handle.handleId"
			type="source"
			:position="Position.Right"
			class="crdt-handle crdt-handle--right"
			:style="getHandleOffsetStyle(handle, mainOutputHandles)"
		/>

		<!-- Non-main output handles (top side) -->
		<Handle
			v-for="handle in nonMainOutputHandles"
			:id="handle.handleId"
			:key="handle.handleId"
			type="source"
			:position="Position.Top"
			class="crdt-handle crdt-handle--top crdt-handle--non-main"
			:style="getHandleOffsetStyle(handle, nonMainOutputHandles)"
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
