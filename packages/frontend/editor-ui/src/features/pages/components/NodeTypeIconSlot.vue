<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { SlotNodeIconProps } from '@n8n/frontend-module-sdk';
import { computed, onMounted } from 'vue';

/** Shows the icon of a node type by its name. It loads the node types when the app does not have them yet. */
const props = withDefaults(defineProps<SlotNodeIconProps>(), { size: undefined });

const nodeTypesStore = useNodeTypesStore();

const nodeTypeDescription = computed(() => nodeTypesStore.getNodeType(props.nodeType));

onMounted(() => {
	void nodeTypesStore.loadNodeTypesIfNotLoaded();
});
</script>

<template>
	<NodeIcon :node-type="nodeTypeDescription" :size="size" data-test-id="page-node-type-icon" />
</template>
