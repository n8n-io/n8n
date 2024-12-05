<script lang="ts" setup>
import {
	computed,
	onBeforeUnmount,
	onMounted,
	provide,
	ref,
	toRef,
	useCssModule,
	watch,
} from 'vue';
import type {
	CanvasConnectionPort,
	CanvasElementPortWithRenderData,
	CanvasNodeData,
	CanvasNodeEventBusEvents,
	CanvasEventBusEvents,
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
import type { NodeProps, XYPosition } from '@vue-flow/core';
import { Position } from '@vue-flow/core';
import { useCanvas } from '@/composables/useCanvas';
import { createCanvasConnectionHandleString } from '@/utils/canvasUtilsV2';
import type { EventBus } from 'n8n-design-system';
import { createEventBus } from 'n8n-design-system';

type Props = NodeProps<CanvasNodeData> & {
	readOnly?: boolean;
	eventBus?: EventBus<CanvasEventBusEvents>;
	hovered?: boolean;
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

const style = useCssModule();

const props = defineProps<Props>();

const nodeTypesStore = useNodeTypesStore();
const contextMenu = useContextMenu();

const { connectingHandle } = useCanvas();

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

const classes = computed(() => ({
	[style.canvasNode]: true,
	[style.showToolbar]: showToolbar.value,
	hovered: props.hovered,
	selected: props.selected,
}));

/**
 * Event bus
 */

const canvasNodeEventBus = ref(createEventBus<CanvasNodeEventBusEvents>());

function emitCanvasNodeEvent(event: CanvasEventBusEvents['nodes:action']) {
	if (event.ids.includes(props.id)) {
		canvasNodeEventBus.value.emit(event.action, event.payload);
	}
}

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
		const handleId = createCanvasConnectionHandleString({
			mode,
			type: endpoint.type,
			index: endpoint.index,
		});
		const handleType = mode === CanvasConnectionMode.Input ? 'target' : 'source';
		const connectionsCount = connections.value[mode][endpoint.type]?.[endpoint.index]?.length ?? 0;
		const isConnecting =
			connectingHandle.value?.nodeId === props.id &&
			connectingHandle.value?.handleType === handleType &&
			connectingHandle.value?.handleId === handleId;

		return {
			...endpoint,
			handleId,
			connectionsCount,
			isConnecting,
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
const readOnly = toRef(props, 'readOnly');

provide(CanvasNodeKey, {
	id,
	data,
	label,
	selected,
	readOnly,
	eventBus: canvasNodeEventBus,
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

onMounted(() => {
	props.eventBus?.on('nodes:action', emitCanvasNodeEvent);
});

onBeforeUnmount(() => {
	props.eventBus?.off('nodes:action', emitCanvasNodeEvent);
});
</script>

<template>
	<div :class="classes" data-test-id="canvas-node" :data-node-type="data.type">
		<template
			v-for="source in mappedOutputs"
			:key="`${source.handleId}(${source.index + 1}/${mappedOutputs.length})`"
		>
			<CanvasHandleRenderer
				v-bind="source"
				:mode="CanvasConnectionMode.Output"
				:is-read-only="readOnly"
				:is-valid-connection="isValidConnection"
				:data-node-name="label"
				data-test-id="canvas-node-output-handle"
				:data-handle-index="source.index"
				@add="onAdd"
			/>
		</template>

		<template
			v-for="target in mappedInputs"
			:key="`${target.handleId}(${target.index + 1}/${mappedInputs.length})`"
		>
			<CanvasHandleRenderer
				v-bind="target"
				:mode="CanvasConnectionMode.Input"
				:is-read-only="readOnly"
				:is-valid-connection="isValidConnection"
				data-test-id="canvas-node-input-handle"
				:data-handle-index="target.index"
				:data-node-name="label"
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
			@update="onUpdate"
			@open:contextmenu="onOpenContextMenuFromToolbar"
		/>

		<CanvasNodeRenderer
			@dblclick.stop="onActivate"
			@move="onMove"
			@update="onUpdate"
			@open:contextmenu="onOpenContextMenuFromNode"
		>
			<NodeIcon
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
	&:focus-within,
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
	z-index: 1;

	&:focus-within,
	&:hover {
		opacity: 1;
	}
}
</style>
