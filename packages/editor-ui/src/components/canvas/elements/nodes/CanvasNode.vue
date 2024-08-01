<script lang="ts" setup>
import { computed, provide, toRef, watch } from 'vue';
import type {
	CanvasNodeData,
	CanvasConnectionPort,
	CanvasElementPortWithRenderData,
} from '@/types';
import { CanvasConnectionMode } from '@/types';
import NodeIcon from '@/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import CanvasNodeToolbar from '@/components/canvas/elements/nodes/CanvasNodeToolbar.vue';
import CanvasNodeRenderer from '@/components/canvas/elements/nodes/CanvasNodeRenderer.vue';
import CanvasHandleRenderer from '@/components/canvas/elements/handles/CanvasHandleRenderer.vue';
import { useNodeConnections } from '@/composables/useNodeConnections';
import { CanvasNodeKey } from '@/constants';
import { useContextMenu } from '@/composables/useContextMenu';
import { Position } from '@vue-flow/core';
import type { XYPosition, NodeProps } from '@vue-flow/core';

type Props = NodeProps<CanvasNodeData> & {
	readOnly?: boolean;
};

const emit = defineEmits<{
	add: [id: string, handle: string];
	delete: [id: string];
	run: [id: string];
	select: [id: string, selected: boolean];
	toggle: [id: string];
	activate: [id: string];
	'open:contextmenu': [id: string, event: MouseEvent, source: 'node-button' | 'node-right-click'];
	update: [id: string, parameters: Record<string, unknown>];
	move: [id: string, position: XYPosition];
}>();

const props = defineProps<Props>();

const nodeTypesStore = useNodeTypesStore();
const contextMenu = useContextMenu();

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

const nodeTypeDescription = computed(() => {
	return nodeTypesStore.getNodeType(props.data.type, props.data.typeVersion);
});

/**
 * Inputs
 */

const mappedInputs = computed(() => {
	return [
		...mainInputs.value.map(
			createEndpointMappingFn({
				mode: CanvasConnectionMode.Input,
				position: Position.Left,
				offsetAxis: 'top',
			}),
		),
		...nonMainInputs.value.map(
			createEndpointMappingFn({
				mode: CanvasConnectionMode.Input,
				position: Position.Bottom,
				offsetAxis: 'left',
			}),
		),
	];
});

/**
 * Outputs
 */

const mappedOutputs = computed(() => {
	return [
		...mainOutputs.value.map(
			createEndpointMappingFn({
				mode: CanvasConnectionMode.Output,
				position: Position.Right,
				offsetAxis: 'top',
			}),
		),
		...nonMainOutputs.value.map(
			createEndpointMappingFn({
				mode: CanvasConnectionMode.Output,
				position: Position.Top,
				offsetAxis: 'left',
			}),
		),
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

const createEndpointMappingFn =
	({
		mode,
		position,
		offsetAxis,
	}: {
		mode: CanvasConnectionMode;
		position: Position;
		offsetAxis: 'top' | 'left';
	}) =>
	(
		endpoint: CanvasConnectionPort,
		index: number,
		endpoints: CanvasConnectionPort[],
	): CanvasElementPortWithRenderData => {
		return {
			...endpoint,
			connected: !!connections.value[mode][endpoint.type]?.[endpoint.index]?.length,
			position,
			offset: {
				[offsetAxis]: `${(100 / (endpoints.length + 1)) * (index + 1)}%`,
			},
		};
	};

/**
 * Events
 */

function onAdd(handle: string) {
	emit('add', props.id, handle);
}

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

function onOpenContextMenuFromToolbar(event: MouseEvent) {
	emit('open:contextmenu', props.id, event, 'node-button');
}

function onOpenContextMenuFromNode(event: MouseEvent) {
	emit('open:contextmenu', props.id, event, 'node-right-click');
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
});

const showToolbar = computed(() => {
	const target = contextMenu.target.value;
	return contextMenu.isOpen && target?.source === 'node-button' && target.nodeId === id.value;
});

/**
 * Lifecycle
 */

watch(
	() => props.selected,
	(value) => {
		emit('select', props.id, value);
	},
);
</script>

<template>
	<div
		:class="[$style.canvasNode, { [$style.showToolbar]: showToolbar }]"
		data-test-id="canvas-node"
	>
		<template
			v-for="source in mappedOutputs"
			:key="`${CanvasConnectionMode.Output}/${source.type}/${source.index}`"
		>
			<CanvasHandleRenderer
				data-test-id="canvas-node-output-handle"
				:connected="source.connected"
				:mode="CanvasConnectionMode.Output"
				:type="source.type"
				:label="source.label"
				:index="source.index"
				:position="source.position"
				:offset="source.offset"
				:is-valid-connection="isValidConnection"
				@add="onAdd"
			/>
		</template>

		<template
			v-for="target in mappedInputs"
			:key="`${CanvasConnectionMode.Input}/${target.type}/${target.index}`"
		>
			<CanvasHandleRenderer
				data-test-id="canvas-node-input-handle"
				:connected="!!connections[CanvasConnectionMode.Input][target.type]?.[target.index]?.length"
				:mode="CanvasConnectionMode.Input"
				:type="target.type"
				:label="target.label"
				:index="target.index"
				:position="target.position"
				:offset="target.offset"
				:is-valid-connection="isValidConnection"
				@add="onAdd"
			/>
		</template>

		<CanvasNodeToolbar
			v-if="nodeTypeDescription"
			data-test-id="canvas-node-toolbar"
			:read-only="readOnly"
			:class="$style.canvasNodeToolbar"
			@delete="onDelete"
			@toggle="onDisabledToggle"
			@run="onRun"
			@open:contextmenu="onOpenContextMenuFromToolbar"
		/>

		<CanvasNodeRenderer
			@dblclick.stop="onActivate"
			@move="onMove"
			@update="onUpdate"
			@open:contextmenu="onOpenContextMenuFromNode"
		>
			<NodeIcon
				v-if="nodeTypeDescription"
				:node-type="nodeTypeDescription"
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
	&:hover,
	&.showToolbar {
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
</style>
