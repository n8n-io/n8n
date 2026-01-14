<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getNodeIconSource } from '@/app/utils/nodeIcon';
import type { NodeProps } from '@vue-flow/core';
import { computed } from 'vue';
import { useWorkflowDoc } from '../composables';
import { useWorkflowAwarenessOptional } from '../composables/useWorkflowAwareness';

const { findNode } = useWorkflowDoc();
const nodeTypesStore = useNodeTypesStore();
const awareness = useWorkflowAwarenessOptional();

const props = defineProps<NodeProps>();

const node = findNode(props.id);

const icon = computed(() => {
	if (!node?.type) return undefined;
	const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
	return getNodeIconSource(nodeType);
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
		<NodeIcon v-if="icon" :icon-source="icon" :size="30" :shrink="false" />
		<span v-else>{{ data.label }}</span>

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
	width: 96px;
	height: 96px;
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
