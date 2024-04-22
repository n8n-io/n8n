<script lang="ts" setup>
import { Handle, Position } from '@vue-flow/core';
import { NodeToolbar } from '@vue-flow/node-toolbar';
import { computed, useCssModule } from 'vue';
import type {
	CanvasElementData,
	CanvasConnectionPort,
	CanvasElementPortWithPosition,
} from '@/types';
import NodeIcon from '@/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import CanvasNodeToolbar from '@/components/canvas/elements/nodes/CanvasNodeToolbar.vue';
import CanvasNodeRenderer from '@/components/canvas/elements/nodes/CanvasNodeRenderer.vue';
import HandleRenderer from '@/components/canvas/elements/handles/HandleRenderer.vue';
import { useNodeConnections } from '@/composables/useNodeConnections';

const $style = useCssModule();

const props = defineProps<{
	data: CanvasElementData;
}>();

const inputs = computed(() => props.data.inputs);
const outputs = computed(() => props.data.outputs);

const nodeTypesStore = useNodeTypesStore();

const nodeType = computed(() => {
	return nodeTypesStore.getNodeType(props.data.type, props.data.typeVersion);
});

const { mainInputs, nonMainInputs, mainOutputs, nonMainOutputs, requiredNonMainInputs } =
	useNodeConnections({
		inputs,
		outputs,
	});

/**
 * Inputs
 */

const inputsWithPosition = computed(() => {
	return [
		...mainInputs.value.map(mapEndpointWithPosition(Position.Left, 'top')),
		...nonMainInputs.value.map(mapEndpointWithPosition(Position.Bottom, 'left')),
	];
});

/**
 * Outputs
 */

const outputsWithPosition = computed(() => {
	return [
		...mainOutputs.value.map(mapEndpointWithPosition(Position.Right, 'top')),
		...nonMainOutputs.value.map(mapEndpointWithPosition(Position.Top, 'left')),
	];
});

/**
 * Endpoints
 */

const mapEndpointWithPosition =
	(position: Position, offsetAxis: 'top' | 'left') =>
	(
		endpoint: CanvasConnectionPort,
		index: number,
		endpoints: CanvasConnectionPort[],
	): CanvasElementPortWithPosition => {
		return {
			...endpoint,
			position,
			offset: {
				[offsetAxis]: `${(100 / (endpoints.length + 1)) * (index + 1)}%`,
			},
		};
	};
</script>

<template>
	<div :class="$style.canvasNode">
		<template v-for="source in outputsWithPosition" :key="`${source.type}/${source.index}`">
			<HandleRenderer
				mode="output"
				:source="true"
				:type="source.type"
				:label="source.label"
				:index="source.index"
				:position="source.position"
				:offset="source.offset"
			/>
		</template>

		<template v-for="target in inputsWithPosition" :key="`${target.type}/${target.index}`">
			<HandleRenderer
				mode="input"
				:source="false"
				:type="target.type"
				:label="target.label"
				:index="target.index"
				:position="target.position"
				:offset="target.offset"
			/>
		</template>

		<CanvasNodeToolbar
			v-if="nodeType"
			:class="$style.canvasNodeToolbar"
			:node-type="nodeType"
			:data="data"
		/>

		<CanvasNodeRenderer v-if="nodeType" :node-type="nodeType" :data="data">
			<NodeIcon :node-type="nodeType" :size="40" :shrink="false" />
			<!--			:color-default="iconColorDefault"-->
			<!--			:disabled="data.disabled"-->
		</CanvasNodeRenderer>
	</div>
</template>

<style lang="scss" module>
.canvasNode {
	&:hover {
		.canvasNodeToolbar {
			display: flex;
			opacity: 1;
		}
	}
}

.canvasNodeToolbar {
	display: none;
	position: absolute;
	top: 0;
	left: 50%;
	transform: translate(-50%, -100%);
	opacity: 0;
	transition: opacity 0.3s ease;
}
</style>
