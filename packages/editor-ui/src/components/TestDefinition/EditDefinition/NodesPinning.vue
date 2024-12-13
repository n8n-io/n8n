<script setup lang="ts">
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { computed, onMounted, ref, useCssModule } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useCanvasMapping } from '@/composables/useCanvasMapping';
import { createEventBus, N8nTooltip } from 'n8n-design-system';
import type { CanvasEventBusEvents, CanvasNodeData } from '@/types';

const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const route = useRoute();
const router = useRouter();
const { resetWorkspace, initializeWorkspace } = useCanvasOperations({ router });

const eventBus = createEventBus<CanvasEventBusEvents>();
const style = useCssModule();

const props = defineProps<{
	modelValue: Array<{ name: string }>;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: Array<{ name: string }>];
}>();

const isLoading = ref(true);

const workflowId = computed(() => route.params.name as string);
const workflow = computed(() => workflowsStore.getWorkflowById(workflowId.value));
const workflowObject = computed(() => workflowsStore.getCurrentWorkflow(true));

const nodes = computed(() => {
	return workflow.value.nodes ?? [];
});
const connections = computed(() => workflow.value.connections);

const { nodes: mappedNodes, connections: mappedConnections } = useCanvasMapping({
	nodes,
	connections,
	workflowObject,
});
async function loadData() {
	const loadingPromise = Promise.all([
		nodeTypesStore.getNodeTypes(),
		workflowsStore.fetchWorkflow(workflowId.value),
	]);
	await loadingPromise;
	resetWorkspace();
	disableAllNodes();
	initializeWorkspace(workflow.value);
	isLoading.value = false;
	eventBus.emit('fitView');
}
function getNodeNameById(id: string) {
	return mappedNodes.value.find((node) => node.id === id)?.data?.name;
}
function disableAllNodes() {
	const ids = mappedNodes.value.map((node) => node.id);
	// @ts-expect-error: TODO: fix this
	eventBus.emit('nodes:action', {
		ids,
		action: 'update:node:class',
		payload: { className: style.notPinnedNode },
	});

	console.log('🚀 ~ pinnedNodes ~ pinnedNodes:', props.modelValue);
	const pinnedNodes = props.modelValue
		.map((node) => {
			const matchedNode = mappedNodes.value.find(
				(mappedNode) => mappedNode?.data?.name === node.name,
			);
			if (matchedNode) {
				return matchedNode.id;
			}
			return null;
		})
		.filter(Boolean);

	if (pinnedNodes.length > 0) {
		// @ts-expect-error: TODO: fix this
		eventBus.emit('nodes:action', {
			ids: pinnedNodes,
			action: 'update:node:class',
			payload: { className: style.pinnedNode },
		});
		// @ts-expect-error: TODO: fix this
		eventBus.emit('nodes:action', {
			ids: pinnedNodes,
			action: 'update:node:class',
			payload: { className: style.notPinnedNode, add: false },
		});
	}
}
function onPinButtonClick(data: CanvasNodeData) {
	const nodeName = getNodeNameById(data.id);
	if (!nodeName) return;

	if (props.modelValue.some((node) => node.name === nodeName)) {
		const updatedNodes = props.modelValue.filter((node) => node.name !== nodeName);
		emit('update:modelValue', updatedNodes);
		// @ts-expect-error: TODO: fix this
		eventBus.emit('nodes:action', {
			ids: [data.id],
			action: 'update:node:class',
			payload: { className: style.notPinnedNode },
		});
		// @ts-expect-error: TODO: fix this
		eventBus.emit('nodes:action', {
			ids: [data.id],
			action: 'update:node:class',
			payload: { className: style.pinnedNode, add: false },
		});
	} else {
		const updatedNodes = [...props.modelValue, { name: nodeName }];
		emit('update:modelValue', updatedNodes);
		// @ts-expect-error: TODO: fix this
		eventBus.emit('nodes:action', {
			ids: [data.id],
			action: 'update:node:class',
			payload: { className: style.pinnedNode },
		});
		// @ts-expect-error: TODO: fix this
		eventBus.emit('nodes:action', {
			ids: [data.id],
			action: 'update:node:class',
			payload: { className: style.notPinnedNode, add: false },
		});
	}
}

onMounted(loadData);
</script>

<template>
	<div :class="$style.container">
		<Canvas
			v-if="workflow"
			:id="workflowId"
			:nodes="mappedNodes"
			:connections="mappedConnections"
			:show-bug-reporting-button="false"
			:read-only="true"
			:event-bus="eventBus"
		>
			<template #nodeToolbar="{ data }">
				<div :class="$style.pinButtonContainer">
					<N8nTooltip placement="left">
						<template #content> Pin execution data of this node during test run </template>
						<n8n-icon-button
							type="tertiary"
							size="large"
							icon="thumbtack"
							:class="$style.pinButton"
							@click="onPinButtonClick(data)"
						/>
					</N8nTooltip>
				</div>
			</template>
		</Canvas>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	max-height: 100vh;
}

.pinButtonContainer {
	position: absolute;
	right: 0;
	display: flex;
	justify-content: flex-end;
	bottom: 100%;
}

.pinButton {
	cursor: pointer;
	color: var(--canvas-node--border-color);
	border: none;
}
.notPinnedNode,
.pinnedNode {
	:global(.n8n-node-icon) > div {
		filter: contrast(40%) brightness(1.5) grayscale(100%);
	}
}
.pinnedNode {
	--canvas-node--border-color: hsla(247, 49%, 55%, 1);

	:global(.n8n-node-icon) > div {
		filter: contrast(40%) brightness(1.5) grayscale(100%);
	}
}
</style>
