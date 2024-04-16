<script lang="ts" setup>
import { Handle, Position, XYPosition } from '@vue-flow/core';
import { computed, useCssModule } from 'vue';
import type {
	CanvasElementData,
	CanvasConnectionPort,
	CanvasElementPortWithPosition,
} from '@/types';
import NodeIcon from '@/components/NodeIcon.vue';
import {
	type ConnectionTypes,
	type INodeInputConfiguration,
	type INodeOutputConfiguration,
	NodeConnectionType,
	NodeHelpers,
} from 'n8n-workflow';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS } from '@/constants';

const $style = useCssModule();

const props = defineProps<{
	data: CanvasElementData;
	position: XYPosition;
}>();

const nodeTypesStore = useNodeTypesStore();

const nodeType = computed(() => {
	return nodeTypesStore.getNodeType(props.data.type, props.data.typeVersion);
});

/**
 * Inputs
 */

const mainInputs = computed(() =>
	props.data.inputs.filter((input) => input.type === NodeConnectionType.Main),
);

const nonMainInputs = computed(() =>
	props.data.inputs.filter((input) => input.type !== NodeConnectionType.Main),
);

const requiredNonMainInputs = computed(() => nonMainInputs.value.filter((input) => input.required));

const inputsWithPosition = computed(() => {
	return [
		...mainInputs.value.map(mapEndpointWithPosition(Position.Left, 'top')),
		...nonMainInputs.value.map(mapEndpointWithPosition(Position.Bottom, 'left')),
	];
});

/**
 * Outputs
 */

const mainOutputs = computed(() =>
	props.data.outputs.filter((output) => output.type === NodeConnectionType.Main),
);
const nonMainOutputs = computed(() =>
	props.data.outputs.filter((output) => output.type !== NodeConnectionType.Main),
);

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

/**
 * Styles
 */

const canvasNodeStyles = computed(() => {
	const styles: {
		[key: string]: string | number;
	} = {
		'--node-main-output-count': mainOutputs.value.length,
	};

	if (requiredNonMainInputs.value.length > 0) {
		let spacerCount = 0;
		if (NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS) {
			const requiredNonMainInputsCount = requiredNonMainInputs.value.length;
			const optionalNonMainInputsCount = nonMainInputs.value.length - requiredNonMainInputsCount;
			spacerCount = requiredNonMainInputsCount > 0 && optionalNonMainInputsCount > 0 ? 1 : 0;
		}

		styles['--configurable-node-input-count'] = nonMainInputs.value.length + spacerCount;
	}

	return styles;
});
</script>

<template>
	<div :class="$style.canvasNode" :style="canvasNodeStyles">
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
	--node-width: 100px;
	--node-height: calc(100px + max(0, var(--node-main-output-count, 1) - 4) * 20px);

	--configurable-node-min-input-count: 4;
	--configurable-node-input-width: 65px;

	width: var(--node-width);
	height: var(--node-height);
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color-canvas-node-background);
	border: 2px solid var(--color-foreground-xdark);
	border-radius: var(--border-radius-large);
}
</style>
