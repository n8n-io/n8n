<script lang="ts" setup>
import { Handle, Position } from '@vue-flow/core';
import { computed, useCssModule } from 'vue';
import type {
	CanvasElementData,
	CanvasConnectionPort,
	CanvasElementPortWithPosition,
} from '@/types';
import NodeIcon from '@/components/NodeIcon.vue';
import { NodeConnectionType } from 'n8n-workflow';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

const $style = useCssModule();

const props = defineProps<{
	data: CanvasElementData;
}>();

const nodeTypesStore = useNodeTypesStore();

const nodeType = computed(() => {
	return nodeTypesStore.getNodeType(props.data.type, props.data.typeVersion);
});

const inputsWithPosition = computed(() => {
	const mainInputs = props.data.inputs.filter((input) => input.type === NodeConnectionType.Main);
	const nonMainInputs = props.data.inputs.filter((input) => input.type !== NodeConnectionType.Main);

	return [
		...mainInputs.map(mapEndpointWithPosition(Position.Left, 'top')),
		...nonMainInputs.map(mapEndpointWithPosition(Position.Bottom, 'left')),
	];
});

const outputsWithPosition = computed(() => {
	const mainOutputs = props.data.outputs.filter(
		(output) => output.type === NodeConnectionType.Main,
	);
	const nonMainOutputs = props.data.outputs.filter(
		(output) => output.type !== NodeConnectionType.Main,
	);

	return [
		...mainOutputs.map(mapEndpointWithPosition(Position.Right, 'top')),
		...nonMainOutputs.map(mapEndpointWithPosition(Position.Top, 'left')),
	];
});

console.log(props);

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
			<Handle
				:id="`outputs/${source.type}/${source.index}`"
				type="source"
				:position="source.position"
				:style="source.offset"
			/>
		</template>

		<template v-for="target in inputsWithPosition" :key="`${target.type}/${target.index}`">
			<Handle
				:id="`inputs/${target.type}/${target.index}`"
				type="target"
				:position="target.position"
				:style="target.offset"
			/>
		</template>

		<NodeIcon class="node-icon" :node-type="nodeType" :size="40" :shrink="false" />
		<!--			:color-default="iconColorDefault"-->
		<!--			:disabled="data.disabled"-->
	</div>
</template>

<style lang="scss" module>
.canvasNode {
	height: 100px;
	width: 100px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: white;
	border: 1px solid black;
	border-radius: 4px;
}
</style>
