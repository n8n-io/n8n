<script setup lang="ts">
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { computed, onMounted, ref, useCssModule } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useCanvasMapping } from '@/composables/useCanvasMapping';
import { createEventBus, N8nTooltip } from 'n8n-design-system';
import type { CanvasConnectionPort, CanvasEventBusEvents, CanvasNodeData } from '@/types';
import { useVueFlow } from '@vue-flow/core';
import { useI18n } from '@/composables/useI18n';

const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const route = useRoute();
const router = useRouter();
const locale = useI18n();

const { resetWorkspace, initializeWorkspace } = useCanvasOperations({ router });

const eventBus = createEventBus<CanvasEventBusEvents>();
const style = useCssModule();
const uuid = crypto.randomUUID();
const props = defineProps<{
	modelValue: Array<{ name: string; id: string }>;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: Array<{ name: string; id: string }>];
}>();

const isLoading = ref(true);

const workflowId = computed(() => route.params.name as string);
const testId = computed(() => route.params.testId as string);
const workflow = computed(() => workflowsStore.getWorkflowById(workflowId.value));
const workflowObject = computed(() => workflowsStore.getCurrentWorkflow(true));
const canvasId = computed(() => `${uuid}-${testId.value}`);

const { onNodesInitialized, fitView, zoomTo } = useVueFlow({ id: canvasId.value });
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
	workflowsStore.resetState();
	resetWorkspace();
	const loadingPromise = Promise.all([
		nodeTypesStore.getNodeTypes(),
		workflowsStore.fetchWorkflow(workflowId.value),
	]);
	await loadingPromise;
	initializeWorkspace(workflow.value);
	disableAllNodes();
}
function getNodeNameById(id: string) {
	return mappedNodes.value.find((node) => node.id === id)?.data?.name;
}
function updateNodeClasses(nodeIds: string[], isPinned: boolean) {
	eventBus.emit('nodes:action', {
		ids: nodeIds,
		action: 'update:node:class',
		payload: {
			className: style.pinnedNode,
			add: isPinned,
		},
	});
	eventBus.emit('nodes:action', {
		ids: nodeIds,
		action: 'update:node:class',
		payload: {
			className: style.notPinnedNode,
			add: !isPinned,
		},
	});
}
function disableAllNodes() {
	const ids = mappedNodes.value.map((node) => node.id);
	updateNodeClasses(ids, false);

	const pinnedNodes = props.modelValue.map((node) => node.id).filter((id) => id !== null);

	if (pinnedNodes.length > 0) {
		updateNodeClasses(pinnedNodes, true);
	}
}
function onPinButtonClick(data: CanvasNodeData) {
	const nodeName = getNodeNameById(data.id);
	if (!nodeName) return;

	const isPinned = props.modelValue.some((node) => node.id === data.id);
	const updatedNodes = isPinned
		? props.modelValue.filter((node) => node.id !== data.id)
		: [...props.modelValue, { name: nodeName, id: data.id }];

	emit('update:modelValue', updatedNodes);
	updateNodeClasses([data.id], !isPinned);
}
function isPinButtonVisible(outputs: CanvasConnectionPort[]) {
	return outputs.length === 1;
}

onNodesInitialized(async () => {
	await fitView();
	isLoading.value = false;
	await zoomTo(0.7, { duration: 400 });
});
onMounted(loadData);
</script>

<template>
	<div v-if="mappedNodes.length === 0" :class="$style.noNodes">
		<N8nHeading size="large" :bold="true" :class="$style.noNodesTitle">{{
			locale.baseText('testDefinition.edit.pinNodes.noNodes.title')
		}}</N8nHeading>
		<N8nText>{{ locale.baseText('testDefinition.edit.pinNodes.noNodes.description') }}</N8nText>
	</div>
	<div v-else :class="$style.container">
		<N8nSpinner v-if="isLoading" size="xlarge" type="dots" :class="$style.spinner" />
		<Canvas
			:id="canvasId"
			:loading="isLoading"
			:class="{ [$style.canvas]: true }"
			:nodes="mappedNodes"
			:connections="mappedConnections"
			:show-bug-reporting-button="false"
			:read-only="true"
			:event-bus="eventBus"
		>
			<template #nodeToolbar="{ data, outputs }">
				<div :class="$style.pinButtonContainer">
					<N8nTooltip v-if="isPinButtonVisible(outputs)" placement="left">
						<template #content>
							{{ locale.baseText('testDefinition.edit.nodesPinning.pinButtonTooltip') }}
						</template>
						<n8n-icon-button
							type="tertiary"
							size="large"
							icon="thumbtack"
							:class="$style.pinButton"
							data-test-id="node-pin-button"
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
	width: 100vw;
	height: 100%;
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
.spinner {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}
.noNodes {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
}
</style>
