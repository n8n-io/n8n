<script lang="ts" setup>
import { computed, provide, toRef, watch } from 'vue';
import type { CanvasNodeData, CanvasConnectionPort, CanvasElementPortWithPosition } from '@/types';
import NodeIcon from '@/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import CanvasNodeToolbar from '@/components/canvas/elements/nodes/CanvasNodeToolbar.vue';
import CanvasNodeRenderer from '@/components/canvas/elements/nodes/CanvasNodeRenderer.vue';
import HandleRenderer from '@/components/canvas/elements/handles/HandleRenderer.vue';
import { useNodeConnections } from '@/composables/useNodeConnections';
import { CanvasNodeKey } from '@/constants';
import { Position } from '@vue-flow/core';
import type { XYPosition, NodeProps } from '@vue-flow/core';

const emit = defineEmits<{
	delete: [id: string];
	run: [id: string];
	select: [id: string, selected: boolean];
	toggle: [id: string];
	activate: [id: string];
	update: [id: string, parameters: Record<string, unknown>];
	move: [id: string, position: XYPosition];
}>();
const props = defineProps<NodeProps<CanvasNodeData>>();

const nodeTypesStore = useNodeTypesStore();

const inputs = computed(() => props.data.inputs);
const outputs = computed(() => props.data.outputs);
const connections = computed(() => props.data.connections);
const { mainInputs, nonMainInputs, mainOutputs, nonMainOutputs, isValidConnection } =
	useNodeConnections({
		inputs,
		outputs,
		connections,
	});

const isDisabled = computed(() => props.data.disabled);

const nodeType = computed(() => {
	return nodeTypesStore.getNodeType(props.data.type, props.data.typeVersion);
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
 * Node icon
 */

const nodeIconSize = computed(() =>
	'configuration' in data.value.render.options && data.value.render.options.configuration ? 30 : 40,
);

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
 * Events
 */

function onDelete() {
	emit('delete', props.id);
}

function onRun() {
	emit('run', props.id);
}

function onDisabledToggle() {
	emit('toggle', props.id);
}

function onActivate() {
	emit('activate', props.id);
}

function onUpdate(parameters: Record<string, unknown>) {
	emit('update', props.id, parameters);
}

function onMove(position: XYPosition) {
	emit('move', props.id, position);
}

/**
 * Provide
 */

const id = toRef(props, 'id');
const data = toRef(props, 'data');
const label = toRef(props, 'label');
const selected = toRef(props, 'selected');

provide(CanvasNodeKey, {
	id,
	data,
	label,
	selected,
	nodeType,
});

/**
 * Lifecycle
 */

watch(
	() => props.selected,
	(selected) => {
		emit('select', props.id, selected);
	},
);
</script>

<template>
	<div :class="$style.canvasNode" data-test-id="canvas-node">
		<template v-for="source in outputsWithPosition" :key="`${source.type}/${source.index}`">
			<HandleRenderer
				mode="output"
				data-test-id="canvas-node-output-handle"
				:type="source.type"
				:label="source.label"
				:index="source.index"
				:position="source.position"
				:offset="source.offset"
				:is-valid-connection="isValidConnection"
			/>
		</template>

		<template v-for="target in inputsWithPosition" :key="`${target.type}/${target.index}`">
			<HandleRenderer
				mode="input"
				data-test-id="canvas-node-input-handle"
				:type="target.type"
				:label="target.label"
				:index="target.index"
				:position="target.position"
				:offset="target.offset"
				:is-valid-connection="isValidConnection"
			/>
		</template>

		<CanvasNodeToolbar
			v-if="nodeType"
			data-test-id="canvas-node-toolbar"
			:class="$style.canvasNodeToolbar"
			@delete="onDelete"
			@toggle="onDisabledToggle"
			@run="onRun"
		/>

		<CanvasNodeRenderer @dblclick="onActivate" @move="onMove" @update="onUpdate">
			<NodeIcon
				v-if="nodeType"
				:node-type="nodeType"
				:size="nodeIconSize"
				:shrink="false"
				:disabled="isDisabled"
			/>
			<!-- @TODO :color-default="iconColorDefault"-->
		</CanvasNodeRenderer>
	</div>
</template>

<style lang="scss" module>
.canvasNode {
	&:hover {
		.canvasNodeToolbar {
			opacity: 1;
		}
	}
}

.canvasNodeToolbar {
	transition: opacity 0.1s ease-in;
	position: absolute;
	top: 0;
	left: 50%;
	transform: translate(-50%, -100%);
	opacity: 0;
}

.canvasNodeToolbar:focus-within {
	opacity: 1;
}
</style>
