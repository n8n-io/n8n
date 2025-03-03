<script setup lang="ts">
import { useCanvasMapping } from '@/composables/useCanvasMapping';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { CanvasConnectionPort, CanvasEventBusEvents, CanvasNodeData } from '@/types';
import { useVueFlow } from '@vue-flow/core';
import { N8nTooltip } from '@n8n/design-system';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, onMounted, ref, useCssModule } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const route = useRoute();
const router = useRouter();
const locale = useI18n();
const telemetry = useTelemetry();

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

	if (!isPinned) {
		telemetry.track('User selected node to be mocked', {
			node_id: data.id,
			test_id: testId.value,
		});
	}
}
function isPinButtonVisible(outputs: CanvasConnectionPort[], inputs: CanvasConnectionPort[]) {
	return outputs.length === 1 && inputs.length >= 1;
}

const isPinned = (data: CanvasNodeData) => props.modelValue.some((node) => node.id === data.id);

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
			<template #nodeToolbar="{ data, outputs, inputs }">
				<div
					v-if="isPinButtonVisible(outputs, inputs)"
					:class="{
						[$style.pinButtonContainer]: true,
						[$style.pinButtonContainerPinned]: isPinned(data),
					}"
				>
					<N8nTooltip placement="left">
						<template #content>
							{{ locale.baseText('testDefinition.edit.nodesPinning.pinButtonTooltip') }}
						</template>
						<N8nButton
							v-if="isPinned(data)"
							icon="thumbtack"
							block
							type="secondary"
							:class="$style.customSecondary"
							data-test-id="node-pin-button"
							@click="onPinButtonClick(data)"
						>
							Un Mock
						</N8nButton>
						<N8nButton
							v-else
							icon="thumbtack"
							block
							type="secondary"
							data-test-id="node-pin-button"
							@click="onPinButtonClick(data)"
						>
							Mock
						</N8nButton>
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
	right: 50%;
	bottom: -5px;
	height: calc(100% + 47px);
	border: 1px solid transparent;
	padding: 5px 5px;
	border-radius: 8px;
	width: calc(100% + 10px);
	transform: translateX(50%);

	&.pinButtonContainerPinned {
		background-color: hsla(247, 49%, 55%, 1);
	}
}

.customSecondary {
	--button-background-color: hsla(247, 49%, 55%, 1);
	--button-font-color: var(--color-button-primary-font);
	--button-border-color: hsla(247, 49%, 55%, 1);

	--button-hover-background-color: hsla(247, 49%, 55%, 1);
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
