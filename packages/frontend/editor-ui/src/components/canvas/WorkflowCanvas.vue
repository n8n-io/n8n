<script setup lang="ts">
import Canvas from '@/components/canvas/Canvas.vue';
import type { WatchStopHandle } from 'vue';
import { computed, ref, toRef, useCssModule, watch } from 'vue';
import type { Workflow } from 'n8n-workflow';
import type { IWorkflowDb } from '@/Interface';
import { useCanvasMapping } from '@/composables/useCanvasMapping';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import type { CanvasConnection, CanvasEventBusEvents, CanvasNode } from '@/types';
import { useVueFlow } from '@vue-flow/core';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { debounce } from 'lodash-es';

defineOptions({
	inheritAttrs: false,
});

const props = withDefaults(
	defineProps<{
		id?: string;
		workflow: IWorkflowDb;
		workflowObject: Workflow;
		fallbackNodes?: IWorkflowDb['nodes'];
		showFallbackNodes?: boolean;
		eventBus?: EventBus<CanvasEventBusEvents>;
		readOnly?: boolean;
		executing?: boolean;
	}>(),
	{
		id: 'canvas',
		eventBus: () => createEventBus<CanvasEventBusEvents>(),
		fallbackNodes: () => [],
		showFallbackNodes: true,
	},
);

const $style = useCssModule();

const nodeTypesStore = useNodeTypesStore();

const { onNodesInitialized } = useVueFlow({ id: props.id });

const workflow = toRef(props, 'workflow');
const workflowObject = toRef(props, 'workflowObject');

const nodes = computed(() => {
	return props.showFallbackNodes
		? [...props.workflow.nodes, ...props.fallbackNodes]
		: props.workflow.nodes;
});
const connections = computed(() => props.workflow.connections);

const {
	nodes: mappedNodes,
	connections: mappedConnections,
	simulatedNodeTypeDescriptionByNodeId,
} = useCanvasMapping({
	nodes,
	connections,
	workflowObject,
});

const nodeTypeDescriptions = computed(() => {
	return mappedNodes.value.reduce<Record<string, INodeTypeDescription>>((acc, node) => {
		if (!node.data) {
			return acc;
		}

		if (simulatedNodeTypeDescriptionByNodeId.value[node.id]) {
			acc[simulatedNodeTypeDescriptionByNodeId.value[node.id].name] =
				simulatedNodeTypeDescriptionByNodeId.value[node.id];
		}

		const key = `${node.data.type}@${node.data.typeVersion}`;
		if (acc[key]) {
			return acc;
		}

		const nodeTypeDescription = nodeTypesStore.getNodeType(node.data.type, node.data.typeVersion);
		if (nodeTypeDescription) {
			acc[key] = nodeTypeDescription;
		}

		return acc;
	}, {});
});

const initialFitViewDone = ref(false); // Workaround for https://github.com/bcakmakoglu/vue-flow/issues/1636
onNodesInitialized(() => {
	if (!initialFitViewDone.value || props.showFallbackNodes) {
		props.eventBus.emit('fitView');
		initialFitViewDone.value = true;
	}
});

// Debounced versions of nodes and connections and watchers
const nodesDebounced = ref<CanvasNode[]>([]);
const connectionsDebounced = ref<CanvasConnection[]>([]);
const debounceNodesWatcher = ref<WatchStopHandle>();
const debounceConnectionsWatcher = ref<WatchStopHandle>();

// Update debounce watchers when execution state changes
watch(() => props.executing, setupDebouncedWatchers, { immediate: true });

/**
 * Sets up debounced watchers for nodes and connections
 * Uses different debounce times based on execution state:
 * - During execution: Debounce updates to reduce performance impact for large number of nodes/items
 * - Otherwise: Update immediately
 */
function setupDebouncedWatchers() {
	// Clear existing watchers if they exist
	debounceNodesWatcher.value?.();
	debounceConnectionsWatcher.value?.();

	// Configure debounce parameters based on execution state
	const debounceTime = props.executing ? 200 : 0;
	const maxWait = props.executing ? 50 : 0;

	// Set up debounced watcher for nodes
	debounceNodesWatcher.value = watch(
		mappedNodes,
		debounce(
			(value) => {
				nodesDebounced.value = value;
			},
			debounceTime,
			{ maxWait },
		),
		{ immediate: true, deep: true },
	);

	// Set up debounced watcher for connections
	debounceConnectionsWatcher.value = watch(
		mappedConnections,
		debounce(
			(value) => {
				connectionsDebounced.value = value;
			},
			debounceTime,
			{ maxWait },
		),
		{ immediate: true, deep: true },
	);
}
</script>

<template>
	<div :class="$style.wrapper" data-test-id="canvas-wrapper">
		<div :class="$style.canvas">
			<Canvas
				v-if="workflow"
				:id="id"
				:nodes="nodesDebounced"
				:connections="connectionsDebounced"
				:node-type-descriptions="nodeTypeDescriptions"
				:event-bus="eventBus"
				:read-only="readOnly"
				v-bind="$attrs"
			/>
		</div>
		<slot />
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: block;
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.canvas {
	width: 100%;
	height: 100%;
	position: relative;
	display: block;
}
</style>
