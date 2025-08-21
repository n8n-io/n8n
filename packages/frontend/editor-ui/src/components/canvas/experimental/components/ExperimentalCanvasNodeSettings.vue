<script setup lang="ts">
import NodeSettings from '@/components/NodeSettings.vue';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { type IUpdateInformation } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed } from 'vue';

const { nodeId, isReadOnly, subTitle } = defineProps<{
	nodeId: string;
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

function handleDoubleClickHeader() {
	if (activeNode.value) {
		ndvStore.setActiveNodeName(activeNode.value.name);
	}
}

function handleCaptureWheelEvent(event: WheelEvent) {
	if (event.ctrlKey) {
		// If the event is pinch, let it propagate and zoom canvas
		return;
	}

	if (
		event.currentTarget instanceof HTMLElement &&
		event.currentTarget.scrollHeight <= event.currentTarget.offsetHeight
	) {
		// If the settings pane doesn't have to scroll, let it propagate and move the canvas
		return;
	}

	// If the event has larger horizontal element, let it propagate and move the canvas
	if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
		return;
	}

	// Otherwise, let it scroll the pane
	event.stopImmediatePropagation();
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
		:sub-title="subTitle"
		extra-tabs-class-name="nodrag"
		extra-parameter-wrapper-class-name="nodrag"
		@value-changed="handleValueChanged"
		@capture-wheel-body="handleCaptureWheelEvent"
		@dblclick-header="handleDoubleClickHeader"
	>
		<template #actions>
			<slot name="actions" />
		</template>
	</NodeSettings>
</template>
