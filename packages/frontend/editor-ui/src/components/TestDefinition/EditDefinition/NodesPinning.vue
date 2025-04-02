<script setup lang="ts">
import Canvas from '@/components/canvas/Canvas.vue';
import CanvasNode from '@/components/canvas/elements/nodes/CanvasNode.vue';
import { useCanvasMapping } from '@/composables/useCanvasMapping';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { CanvasConnectionPort, CanvasNodeData } from '@/types';
import { N8nButton, N8nHeading, N8nSpinner, N8nText, N8nTooltip } from '@n8n/design-system';
import { useVueFlow } from '@vue-flow/core';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const route = useRoute();
const router = useRouter();
const locale = useI18n();
const telemetry = useTelemetry();

const { resetWorkspace, initializeWorkspace } = useCanvasOperations({ router });

const uuid = crypto.randomUUID();

type PinnedNode = { name: string; id: string };
const model = defineModel<PinnedNode[]>({ required: true });

const isLoading = ref(false);

const workflowId = computed(() => route.params.name as string);
const testId = computed(() => route.params.testId as string);
const workflow = computed(() => workflowsStore.getWorkflowById(workflowId.value));
const workflowObject = computed(() => workflowsStore.getCurrentWorkflow(true));
const canvasId = computed(() => `${uuid}-${testId.value}`);

const { onNodesInitialized, fitView, zoomTo, onNodeClick, viewport } = useVueFlow({
	id: canvasId.value,
});
const nodes = computed(() => workflow.value.nodes ?? []);
const connections = computed(() => workflow.value.connections);

const { nodes: mappedNodes, connections: mappedConnections } = useCanvasMapping({
	nodes,
	connections,
	workflowObject,
});

async function loadData() {
	isLoading.value = true;
	workflowsStore.resetState();
	resetWorkspace();
	await Promise.all([
		nodeTypesStore.getNodeTypes(),
		workflowsStore.fetchWorkflow(workflowId.value),
	]);

	// remove editor pinned data
	workflow.value.pinData = {};
	initializeWorkspace(workflow.value);
}

function getNodeNameById(id: string) {
	return mappedNodes.value.find((node) => node.id === id)?.data?.name;
}

function isMocked(data: CanvasNodeData) {
	return model.value.some((node) => node.id === data.id);
}

function canBeMocked(outputs: CanvasConnectionPort[], inputs: CanvasConnectionPort[]) {
	return outputs.length === 1 && inputs.length >= 1;
}

function handleNodeClick(data: CanvasNodeData) {
	const nodeName = getNodeNameById(data.id);
	if (!nodeName || !canBeMocked(data.outputs, data.inputs)) return;

	const mocked = isMocked(data);

	model.value = mocked
		? model.value.filter((node) => node.id !== data.id)
		: model.value.concat({ name: nodeName, id: data.id });

	if (!mocked) {
		telemetry.track('User selected node to be mocked', {
			node_id: data.id,
			test_id: testId.value,
		});
	}
}

function tooltipContent(data: CanvasNodeData) {
	if (nodeTypesStore.isTriggerNode(data.type)) {
		return locale.baseText('testDefinition.edit.nodesPinning.triggerTooltip');
	}

	if (!canBeMocked(data.outputs, data.inputs)) {
		return;
	}

	if (isMocked(data)) {
		return locale.baseText('testDefinition.edit.nodesPinning.pinButtonTooltip.pinned');
	} else {
		return locale.baseText('testDefinition.edit.nodesPinning.pinButtonTooltip');
	}
}

function tooltipOffset(data: CanvasNodeData) {
	if (nodeTypesStore.isTriggerNode(data.type)) return;

	return 45 * viewport.value.zoom;
}

function tooltipProps(data: CanvasNodeData) {
	const content = tooltipContent(data);
	return {
		disabled: !content,
		content,
		offset: tooltipOffset(data),
	};
}

onNodeClick(({ node }) => handleNodeClick(node.data));

onNodesInitialized(async () => {
	await fitView();
	await zoomTo(0.7);
	// Wait for the zoom to be applied and the canvas edges to recompute
	await new Promise((resolve) => setTimeout(resolve, 400));
	isLoading.value = false;
});
onMounted(loadData);
</script>

<template>
	<div v-if="mappedNodes.length === 0" :class="$style.noNodes">
		<N8nHeading size="large" :bold="true" :class="$style.noNodesTitle">
			{{ locale.baseText('testDefinition.edit.pinNodes.noNodes.title') }}
		</N8nHeading>
		<N8nText>{{ locale.baseText('testDefinition.edit.pinNodes.noNodes.description') }}</N8nText>
	</div>
	<div v-else :class="$style.container">
		<N8nSpinner v-if="isLoading" size="large" type="dots" :class="$style.spinner" />
		<Canvas
			:id="canvasId"
			:loading="isLoading"
			:nodes="mappedNodes"
			:connections="mappedConnections"
			:show-bug-reporting-button="false"
			:read-only="true"
		>
			<template #node="{ nodeProps }">
				<N8nTooltip placement="top" v-bind="tooltipProps(nodeProps.data)">
					<CanvasNode
						v-bind="nodeProps"
						:class="{
							[$style.isTrigger]: nodeTypesStore.isTriggerNode(nodeProps.data.type),
							[$style.mockNode]: true,
						}"
					>
						<template #toolbar="{ data, outputs, inputs }">
							<div
								v-if="canBeMocked(outputs, inputs)"
								:class="{
									[$style.pinButtonContainer]: true,
									[$style.pinButtonContainerPinned]: isMocked(data),
								}"
							>
								<N8nButton
									icon="thumbtack"
									block
									type="secondary"
									:class="{ [$style.customSecondary]: isMocked(data) }"
									data-test-id="node-pin-button"
								>
									<template v-if="isMocked(data)">
										{{ locale.baseText('contextMenu.unpin') }}
									</template>
									<template v-else> {{ locale.baseText('contextMenu.pin') }}</template>
								</N8nButton>
							</div>
						</template>
					</CanvasNode>
				</N8nTooltip>
			</template>
		</Canvas>
	</div>
</template>

<style lang="scss" module>
.mockNode {
	// remove selection outline
	--color-canvas-selected-transparent: transparent;
}

.isTrigger {
	--canvas-node--border-color: var(--color-secondary);
}

.container {
	width: 100%;
	height: 100%;
	border: 1px solid var(--color-foreground-light);
	border-radius: 8px;
}
.pinButtonContainer {
	position: absolute;
	right: 50%;
	bottom: -5px;
	height: calc(100% + 47px);
	border: 1px solid transparent;
	padding: 5px 5px;
	border-radius: 8px;
	width: calc(100% + 10px);
	transform: translateX(50%);

	&.pinButtonContainerPinned {
		background-color: var(--color-secondary);
	}
}

.customSecondary {
	--button-background-color: var(--color-secondary);
	--button-font-color: var(--color-button-primary-font);
	--button-border-color: var(--color-secondary);

	--button-hover-background-color: var(--color-secondary);
	--button-hover-border-color: var(--color-button-primary-font);
	--button-hover-font-color: var(--color-button-primary-font);
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
