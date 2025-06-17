<script setup lang="ts">
import NodeSettings from '@/components/NodeSettings.vue';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { type IUpdateInformation } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed } from 'vue';

const { nodeId, canOpenNdv } = defineProps<{ nodeId: string; canOpenNdv?: boolean }>();

const settingsEventBus = createEventBus();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const { setActiveNodeName } = useNDVStore();
const { renameNode } = useCanvasOperations();

const activeNode = computed(() => workflowsStore.getNodeById(nodeId));
const activeNodeType = computed(() => {
	if (activeNode.value) {
		return nodeTypesStore.getNodeType(activeNode.value.type, activeNode.value.typeVersion);
	}
	return null;
});

function handleOpenNdv() {
	if (activeNode.value) {
		setActiveNodeName(activeNode.value.name);
	}
}

function handleValueChanged(parameterData: IUpdateInformation) {
	if (parameterData.name === 'name' && parameterData.oldValue) {
		void renameNode(parameterData.oldValue as string, parameterData.value as string);
	}
}
</script>

<template>
	<NodeSettings
		:can-expand="canOpenNdv"
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
		hide-connections
		@expand="handleOpenNdv"
		@value-changed="handleValueChanged"
	/>
</template>
