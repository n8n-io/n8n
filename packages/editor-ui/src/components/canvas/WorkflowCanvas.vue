<script setup lang="ts">
import Canvas from '@/components/canvas/Canvas.vue';
import { computed, useCssModule } from 'vue';
import type {
	CanvasConnection,
	CanvasConnectionPort,
	CanvasElement,
	CanvasElementData,
} from '@/types';
import { mapLegacyConnections, normalizeElementEndpoints } from '@/utils/canvasUtilsV2';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { Workflow } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { useI18n } from '@/composables/useI18n';
import type { IWorkflowDb } from '@/Interface';

const props = defineProps<{
	id?: string;
	workflow: IWorkflowDb;
	workflowObject: Workflow;
}>();

const $style = useCssModule();

const locale = useI18n();
const nodeTypesStore = useNodeTypesStore();

const renderTypeByNodeType = computed(
	() =>
		props.workflow.nodes.reduce<Record<string, CanvasElementData['renderType']>>((acc, node) => {
			let renderType: CanvasElementData['renderType'] = 'default';
			switch (true) {
				case nodeTypesStore.isTriggerNode(node.type):
					renderType = 'trigger';
					break;
				case nodeTypesStore.isConfigNode(props.workflowObject, node, node.type):
					renderType = 'configuration';
					break;
				case nodeTypesStore.isConfigurableNode(props.workflowObject, node, node.type):
					renderType = 'configurable';
					break;
			}

			acc[node.type] = renderType;
			return acc;
		}, {}) ?? {},
);

const nodeInputsById = computed(() =>
	props.workflow.nodes.reduce<Record<string, CanvasConnectionPort[]>>((acc, node) => {
		const nodeTypeDescription = nodeTypesStore.getNodeType(node.type);
		const workflowObjectNode = props.workflowObject.getNode(node.name);

		acc[node.id] =
			workflowObjectNode && nodeTypeDescription
				? normalizeElementEndpoints(
						NodeHelpers.getNodeInputs(
							props.workflowObject,
							workflowObjectNode,
							nodeTypeDescription,
						),
					)
				: [];

		return acc;
	}, {}),
);

const nodeOutputsById = computed(() =>
	props.workflow.nodes.reduce<Record<string, CanvasConnectionPort[]>>((acc, node) => {
		const nodeTypeDescription = nodeTypesStore.getNodeType(node.type);
		const workflowObjectNode = props.workflowObject.getNode(node.name);

		acc[node.id] =
			workflowObjectNode && nodeTypeDescription
				? normalizeElementEndpoints(
						NodeHelpers.getNodeOutputs(
							props.workflowObject,
							workflowObjectNode,
							nodeTypeDescription,
						),
					)
				: [];

		return acc;
	}, {}),
);

const elements = computed<CanvasElement[]>(() => [
	...props.workflow.nodes.map<CanvasElement>((node) => {
		const data: CanvasElementData = {
			type: node.type,
			typeVersion: node.typeVersion,
			inputs: nodeInputsById.value[node.id] ?? [],
			outputs: nodeOutputsById.value[node.id] ?? [],
			renderType: renderTypeByNodeType.value[node.type] ?? 'default',
		};

		return {
			id: node.id,
			label: node.name,
			type: 'canvas-node',
			position: { x: node.position[0], y: node.position[1] },
			data,
		};
	}),
]);

const connections = computed<CanvasConnection[]>(() => {
	const mappedConnections = mapLegacyConnections(
		props.workflow.connections ?? [],
		props.workflow.nodes ?? [],
	);

	return mappedConnections.map((connection) => {
		const type = getConnectionType(connection);
		const label = getConnectionLabel(connection);

		return {
			...connection,
			type,
			label,
		};
	});
});

function getConnectionType(_: CanvasConnection): string {
	return 'canvas-edge';
}

function getConnectionLabel(connection: CanvasConnection): string {
	const pinData = props.workflow.pinData?.[connection.data?.fromNodeName ?? ''];

	if (pinData?.length) {
		return locale.baseText('ndv.output.items', {
			adjustToNumber: pinData.length,
			interpolate: { count: String(pinData.length) },
		});
	}

	return '';
}
</script>

<template>
	<div :class="$style.wrapper">
		<div :class="$style.canvas">
			<Canvas v-if="workflow" :elements="elements" :connections="connections" v-bind="$attrs" />
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
