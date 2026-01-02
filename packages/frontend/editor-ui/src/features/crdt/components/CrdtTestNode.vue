<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getNodeIconSource } from '@/app/utils/nodeIcon';
import type { NodeProps } from '@vue-flow/core';
import { computed } from 'vue';
import { useWorkflowDoc } from '../composables';

const { findNode } = useWorkflowDoc();
const nodeTypesStore = useNodeTypesStore();

const props = defineProps<NodeProps>();

const node = findNode(props.id);

const icon = computed(() => {
	if (!node?.type) return undefined;
	const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
	return getNodeIconSource(nodeType);
});
</script>

<template>
	<div class="crdt-node">
		<NodeIcon v-if="icon" :icon-source="icon" :size="30" :shrink="false" />
		<span v-else>{{ data.label }}</span>
	</div>
</template>

<style scoped>
.crdt-node {
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
}
</style>
