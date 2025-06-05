<script setup lang="ts">
import NodeSettings from '@/components/NodeSettings.vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed } from 'vue';

const { nodeId } = defineProps<{ nodeId: string }>();

const settingsEventBus = createEventBus();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();

const activeNode = computed(() => workflowsStore.getNodeById(nodeId));
const activeNodeType = computed(() => {
	if (activeNode.value) {
		return nodeTypesStore.getNodeType(activeNode.value.type, activeNode.value.typeVersion);
	}
	return null;
});
</script>

<template>
	<NodeSettings
		:event-bus="settingsEventBus"
		:dragging="false"
		:active-node="activeNode"
		:node-type="activeNodeType"
		push-ref=""
		:foreign-credentials="[]"
		:read-only="false"
		:block-u-i="false"
		:executable="false"
		:input-size="0"
	/>
</template>
