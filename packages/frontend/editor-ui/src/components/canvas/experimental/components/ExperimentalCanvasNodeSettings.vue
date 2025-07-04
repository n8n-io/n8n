<script setup lang="ts">
import NodeSettings from '@/components/NodeSettings.vue';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { type IUpdateInformation } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed } from 'vue';

const { nodeId, noWheel, isReadOnly } = defineProps<{
	nodeId: string;
	noWheel?: boolean;
	isReadOnly?: boolean;
}>();

defineSlots<{ actions?: {} }>();

const settingsEventBus = createEventBus();
const workflowsStore = useWorkflowsStore();
const { renameNode } = useCanvasOperations();

const activeNode = computed(() => workflowsStore.getNodeById(nodeId));

function handleValueChanged(parameterData: IUpdateInformation) {
	if (parameterData.name === 'name' && parameterData.oldValue) {
		void renameNode(parameterData.oldValue as string, parameterData.value as string);
	}
}
</script>

<template>
	<NodeSettings
		:event-bus="settingsEventBus"
		:dragging="false"
		:active-node="activeNode"
		push-ref=""
		:foreign-credentials="[]"
		:read-only="isReadOnly"
		:block-u-i="false"
		:executable="false"
		:input-size="0"
		is-embedded-in-canvas
		:no-wheel="noWheel"
		@value-changed="handleValueChanged"
	>
		<template #actions>
			<slot name="actions" />
		</template>
	</NodeSettings>
</template>
