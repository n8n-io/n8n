<script setup lang="ts">
import Canvas from '@/components/canvas/Canvas.vue';
import { computed, onMounted, useCssModule } from 'vue';
import { useRoute } from 'vue-router';
import { useWorkflowsStoreV2 } from '@/stores/workflows.store.v2';
import type { CanvasConnection, CanvasElement, CanvasElementData } from '@/types';
import { mapLegacyConnections, normalizeElementEndpoints } from '@/utils/canvasUtilsV2';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { NodeHelpers } from 'n8n-workflow';
import { useUIStore } from '@/stores/ui.store';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { useI18n } from '@/composables/useI18n';

const $style = useCssModule();

const route = useRoute();
const locale = useI18n();

const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const workflowsStoreV2 = useWorkflowsStoreV2();

const workflowId = computed<string>(() => route.params.workflowId as string);
const workflow = computed(() => workflowsStoreV2.workflowsById[workflowId.value]);
const workflowObject = computed(() => workflowsStoreV2.getWorkflowObject(workflowId.value));
const workflowRunning = computed(() => uiStore.isActionActive('workflowRunning'));
const runButtonText = computed(() => {
	if (!workflowRunning.value) {
		return locale.baseText('nodeView.runButtonText.executeWorkflow');
	}

	return locale.baseText('nodeView.runButtonText.executingWorkflow');
});

const connections = computed<CanvasConnection[]>(() => {
	const mappedConnections = mapLegacyConnections(
		workflow.value?.connections ?? [],
		workflow.value?.nodes ?? [],
	);

	return mappedConnections.map((connection) => {
		const pinDataLength = workflow.value.pinData?.[connection.data?.fromNodeName ?? '']?.length;
		return {
			...connection,
			type: 'canvas-edge',
			updatable: true,
			label: pinDataLength
				? locale.baseText('ndv.output.items', {
						adjustToNumber: pinDataLength,
						interpolate: { count: String(pinDataLength) },
					})
				: '',
		};
	});
});

const elements = computed<CanvasElement[]>(() => [
	...workflow.value?.nodes.map<CanvasElement>((node) => {
		const nodeTypeDescription = nodeTypesStore.getNodeType(node.type);
		const workflowObjectNode = workflowObject.value.getNode(node.name);

		const inputs =
			workflowObjectNode && nodeTypeDescription
				? normalizeElementEndpoints(
						NodeHelpers.getNodeInputs(
							workflowObject.value,
							workflowObjectNode,
							nodeTypeDescription,
						),
					)
				: [];

		const outputs =
			workflowObjectNode && nodeTypeDescription
				? normalizeElementEndpoints(
						NodeHelpers.getNodeOutputs(
							workflowObject.value,
							workflowObjectNode,
							nodeTypeDescription,
						),
					)
				: [];

		let renderType: CanvasElementData['renderType'] = 'default';
		switch (true) {
			case nodeTypesStore.isTriggerNode(node.type):
				renderType = 'trigger';
				break;
			case nodeTypesStore.isConfigNode(workflowObject.value, node, node.type):
				renderType = 'configuration';
				break;
			case nodeTypesStore.isConfigurableNode(workflowObject.value, node, node.type):
				renderType = 'configurable';
				break;
		}

		const data: CanvasElementData = {
			type: node.type,
			typeVersion: node.typeVersion,
			inputs,
			outputs,
			renderType,
		};

		return {
			id: node.id,
			label: 'node',
			type: 'canvas-node',
			position: { x: node.position[0], y: node.position[1] },
			data,
		};
	}),
]);

onMounted(() => {
	void initialize();
});

async function initialize() {
	await nodeTypesStore.getNodeTypes();
	await workflowsStoreV2.fetchWorkflow(workflowId.value);
	console.log(workflow.value);
}

async function onRunWorkflow() {
	await workflowsStoreV2.runWorkflow(workflowId.value, {});
}
</script>

<template>
	<div :class="$style.nodeView">
		<Canvas v-if="workflow" :elements="elements" :connections="connections" />
		<div :class="$style.executionButtons">
			<KeyboardShortcutTooltip :label="runButtonText" :shortcut="{ metaKey: true, keys: ['↵'] }">
				<n8n-button
					:loading="workflowRunning"
					:label="runButtonText"
					size="large"
					icon="flask"
					type="primary"
					data-test-id="execute-workflow-button"
					@click.stop="onRunWorkflow"
				/>
			</KeyboardShortcutTooltip>
		</div>
	</div>
</template>

<style lang="scss" module>
.nodeView {
	display: block;
	position: relative;
	width: 100%;
	height: 100%;
	background-color: var(--color-canvas-background);
	overflow: hidden;
}

.executionButtons {
	position: absolute;
	display: flex;
	justify-content: center;
	align-items: center;
	left: 50%;
	transform: translateX(-50%);
	bottom: var(--spacing-l);
	width: auto;

	@media (max-width: $breakpoint-2xs) {
		bottom: 150px;
	}

	button {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-left: 0.625rem;

		&:first-child {
			margin: 0;
		}
	}
}
</style>
