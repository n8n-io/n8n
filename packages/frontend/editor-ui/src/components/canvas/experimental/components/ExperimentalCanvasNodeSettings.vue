<script setup lang="ts">
import NodeSettings from '@/components/NodeSettings.vue';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { type IUpdateInformation } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed } from 'vue';

const { nodeId, isReadOnly, subTitle } = defineProps<{
	nodeId: string;
	isReadOnly?: boolean;
	subTitle?: string;
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

	// Otherwise, let it scroll the settings pane
	event.stopImmediatePropagation();
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
		:sub-title="subTitle"
		@value-changed="handleValueChanged"
		@capture-wheel-body="handleCaptureWheelEvent"
	>
		<template #actions>
			<slot name="actions" />
		</template>
	</NodeSettings>
</template>
