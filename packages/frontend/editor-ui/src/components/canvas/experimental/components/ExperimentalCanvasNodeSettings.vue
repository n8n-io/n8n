<script setup lang="ts">
import NodeSettings from '@/components/NodeSettings.vue';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { type IUpdateInformation } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed } from 'vue';

const { nodeId, noWheel, isReadOnly, subTitle } = defineProps<{
	nodeId: string;
	noWheel?: boolean;
	isReadOnly?: boolean;
	subTitle?: string;
}>();

defineSlots<{ actions?: {} }>();

const workflowsStore = useWorkflowsStore();
const uiStore = useUIStore();
const { renameNode } = useCanvasOperations();
const nodeHelpers = useNodeHelpers();
const ndvStore = useNDVStore();

const activeNode = computed(() => workflowsStore.getNodeById(nodeId));
const foreignCredentials = computed(() =>
	nodeHelpers.getForeignCredentialsIfSharingEnabled(activeNode.value?.credentials),
);
const isWorkflowRunning = computed(() => uiStore.isActionActive.workflowRunning);
const isExecutionWaitingForWebhook = computed(() => workflowsStore.executionWaitingForWebhook);
const blockUi = computed(() => isWorkflowRunning.value || isExecutionWaitingForWebhook.value);

function handleValueChanged(parameterData: IUpdateInformation) {
	if (parameterData.name === 'name' && parameterData.oldValue) {
		void renameNode(parameterData.oldValue as string, parameterData.value as string);
	}
}
</script>

<template>
	<NodeSettings
		:dragging="false"
		:active-node="activeNode"
		:push-ref="ndvStore.pushRef"
		:foreign-credentials="foreignCredentials"
		:read-only="isReadOnly"
		:block-u-i="blockUi"
		:executable="!isReadOnly"
		is-embedded-in-canvas
		:no-wheel="noWheel"
		:sub-title="subTitle"
		@value-changed="handleValueChanged"
	>
		<template #actions>
			<slot name="actions" />
		</template>
	</NodeSettings>
</template>
