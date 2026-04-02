<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import { createEventBus } from '@n8n/utils/event-bus';
import type {
	CanvasConnection,
	CanvasEventBusEvents,
	CanvasNode,
} from '@/features/workflows/canvas/canvas.types';
import { useCanvasMapping } from '@/features/workflows/canvas/composables/useCanvasMapping';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { IConnections, Workflow } from 'n8n-workflow';
import Canvas from '@/features/workflows/canvas/components/Canvas.vue';

const props = defineProps<{
	workflow: IWorkflowDb;
	canvasId: string;
	executionData?: IExecutionResponse | null;
}>();

const workflowsStore = useWorkflowsStore();
const eventBus = createEventBus<CanvasEventBusEvents>();

const workflowNodes = ref<INodeUi[]>([]);
const workflowConnections = ref<IConnections>({});
const workflowObjectRef = shallowRef<Workflow>(workflowsStore.createWorkflowObject([], {}));

// Only re-compute when the workflow prop identity changes (not on every tick)
watch(
	() => props.workflow,
	(wf) => {
		if (!wf) return;

		const nodesWithIds = wf.nodes.map((node) => {
			if (!node.id) {
				return { ...node, id: window.crypto.randomUUID() };
			}
			return node;
		});

		workflowObjectRef.value = workflowsStore.createWorkflowObject(nodesWithIds, wf.connections);
		workflowNodes.value = nodesWithIds;
		workflowConnections.value = wf.connections;
	},
	{ immediate: true },
);

const executionDataRef = computed(() => props.executionData ?? null);

const { nodes: mappedNodes, connections: mappedConnections } = useCanvasMapping({
	nodes: workflowNodes,
	connections: workflowConnections,
	workflowObject: workflowObjectRef,
	// Only pass executionData when explicitly provided — otherwise useCanvasMapping
	// falls back to the global store (which is correct for the main editor canvas).
	...(props.executionData !== null && props.executionData !== undefined
		? { executionData: executionDataRef }
		: {}),
});

// Mutate in-place like the diff view does — avoids creating new objects that
// trigger Vue Flow's internal watchers and cause infinite update loops.
const readOnlyNodes = computed(() =>
	mappedNodes.value.map((node: CanvasNode) => {
		node.draggable = false;
		node.selectable = false;
		node.focusable = false;
		return node;
	}),
);

const hasExecutionData = props.executionData !== null && props.executionData !== undefined;

const readOnlyConnections = computed(() =>
	mappedConnections.value.map((conn: CanvasConnection) => {
		conn.selectable = false;
		conn.focusable = false;
		// Keep labels when showing execution data (they display item counts)
		if (!hasExecutionData) {
			conn.label = '';
		}
		return conn;
	}),
);

// Auto-fit after nodes initialize
const initialFitDone = ref(false);
const { onNodesInitialized } = useVueFlow({ id: props.canvasId });
const { off } = onNodesInitialized(() => {
	if (!initialFitDone.value) {
		eventBus.emit('fitView');
		initialFitDone.value = true;
		off();
	}
});
</script>

<template>
	<div :class="$style.container">
		<Canvas
			:id="canvasId"
			:nodes="readOnlyNodes"
			:connections="readOnlyConnections"
			:event-bus="eventBus"
			:read-only="true"
			:hide-controls="true"
			:suppress-interaction="true"
			:key-bindings="false"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	height: 100%;
	position: relative;
}
</style>
