<script setup lang="ts">
import { computed } from 'vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useGenerativeUiNode } from '../nodeLookup';

const props = defineProps<{ nodeId?: string | null; size?: number }>();

const node = useGenerativeUiNode(() => props.nodeId);
const nodeTypesStore = useNodeTypesStore();
const nodeType = computed(() => {
	if (!node.value) return null;
	return nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion);
});
</script>

<template>
	<NodeIcon
		v-if="nodeType || node"
		:node-type="nodeType"
		:node="node ?? undefined"
		:size="size ?? 20"
		:show-tooltip="true"
	/>
</template>
