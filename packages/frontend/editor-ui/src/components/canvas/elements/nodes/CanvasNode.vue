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
import { CanvasConnectionMode, CanvasNodeRenderType } from '@/types';
import CanvasNodeToolbar from '@/components/canvas/elements/nodes/CanvasNodeToolbar.vue';
import CanvasNodeRenderer from '@/components/canvas/elements/nodes/CanvasNodeRenderer.vue';
import CanvasHandleRenderer from '@/components/canvas/elements/handles/CanvasHandleRenderer.vue';
import { useNodeConnections } from '@/composables/useNodeConnections';
import { CanvasNodeKey } from '@/constants';
import { useContextMenu } from '@/composables/useContextMenu';
import type { NodeProps, XYPosition } from '@vue-flow/core';
import { Position } from '@vue-flow/core';
import { useCanvas } from '@/composables/useCanvas';
import {
	createCanvasConnectionHandleString,
	insertSpacersBetweenEndpoints,
} from '@/utils/canvasUtils';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import isEqual from 'lodash/isEqual';
import CanvasNodeTrigger from '@/components/canvas/elements/nodes/render-types/parts/CanvasNodeTrigger.vue';
import { CONFIGURATION_NODE_RADIUS, GRID_SIZE } from '@/utils/nodeViewUtils';

type Props = NodeProps<CanvasNodeData> & {
	readOnly?: boolean;
	eventBus?: EventBus<CanvasEventBusEvents>;
	hovered?: boolean;
	nearbyHovered?: boolean;
};

const slots = defineSlots<{
	toolbar?: (props: {
		inputs: (typeof mainInputs)['value'];
		outputs: (typeof mainOutputs)['value'];
		data: CanvasNodeData;
	}) => void;
}>();

const emit = defineEmits<{
	add: [id: string, handle: string];
	delete: [id: string];
	run: [id: string];
	select: [id: string, selected: boolean];
	toggle: [id: string];
	activate: [id: string, event: MouseEvent];
	deactivate: [id: string];
	'open:contextmenu': [id: string, event: MouseEvent, source: 'node-button' | 'node-right-click'];
	update: [id: string, parameters: Record<string, unknown>];
	'update:inputs': [id: string];
	'update:outputs': [id: string];
	move: [id: string, position: XYPosition];
	focus: [id: string];
}>();

const style = useCssModule();

const props = defineProps<Props>();

const contextMenu = useContextMenu();

const { connectingHandle, isExperimentalNdvActive } = useCanvas();

/*
  Toolbar slot classes
*/
const nodeClasses = ref<string[]>([]);
const inputs = computed(() => props.data.inputs);
const outputs = computed(() => props.data.outputs);
const connections = computed(() => props.data.connections);
const {
	mainInputs,
	nonMainInputs,
	requiredNonMainInputs,
	mainOutputs,
	nonMainOutputs,
	isValidConnection,
} = useNodeConnections({
	inputs,
	outputs,
	connections,
});

const isDisabled = computed(() => props.data.disabled);

const classes = computed(() => ({
	[style.canvasNode]: true,
	[style.showToolbar]: showToolbar.value,
	hovered: props.hovered,
	selected: props.selected,
	...Object.fromEntries([...nodeClasses.value].map((c) => [c, true])),
}));

const renderType = computed<CanvasNodeRenderType>(() => props.data.render.type);

const dataTestId = computed(() =>
	[
		CanvasNodeRenderType.StickyNote,
		CanvasNodeRenderType.AddNodes,
		CanvasNodeRenderType.AIPrompt,
	].includes(renderType.value)
		? undefined
		: 'canvas-node',
);

/**
 * Event bus
 */

const canvasNodeEventBus = ref(createEventBus<CanvasNodeEventBusEvents>());

function emitCanvasNodeEvent(event: CanvasEventBusEvents['nodes:action']) {
	if (event.ids.includes(props.id) && canvasNodeEventBus.value) {
		canvasNodeEventBus.value.emit(event.action, event.payload);
	}
}

/**
 * Inputs
 */

const nonMainInputsWithSpacer = computed(() =>
	insertSpacersBetweenEndpoints(nonMainInputs.value, requiredNonMainInputs.value.length),
);

const mappedInputs = computed(() => {
	return [
		...mainInputs.value.map(mainInputsMappingFn),
		...nonMainInputsWithSpacer.value.map(nonMainInputsMappingFn),
	].filter((endpoint) => !!endpoint);
});

/**
 * Outputs
 */

const mappedOutputs = computed(() => {
	return [
		...mainOutputs.value.map(mainOutputsMappingFn),
		...nonMainOutputs.value.map(nonMainOutputsMappingFn),
	].filter((endpoint) => !!endpoint);
});

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
		endpoint: CanvasConnectionPort | null,
		index: number,
		endpoints: Array<CanvasConnectionPort | null>,
	): CanvasElementPortWithRenderData | undefined => {
		if (!endpoint) {
			return;
		}

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
		const offsetValue =
			position === Position.Bottom
				? `${CONFIGURATION_NODE_RADIUS + GRID_SIZE * (3 * index)}px`
				: isExperimentalNdvActive.value && endpoints.length === 1
					? `${(1 + index) * (GRID_SIZE * 1.5)}px`
					: `${(100 / (endpoints.length + 1)) * (index + 1)}%`;

		return {
			...endpoint,
			handleId,
			connectionsCount,
			isConnecting,
			position,
			offset: {
				[offsetAxis]: offsetValue,
			},
		};
	};

const mainInputsMappingFn = createEndpointMappingFn({
	mode: CanvasConnectionMode.Input,
	position: Position.Left,
	offsetAxis: 'top',
});

const nonMainInputsMappingFn = createEndpointMappingFn({
	mode: CanvasConnectionMode.Input,
	position: Position.Bottom,
	offsetAxis: 'left',
});

const mainOutputsMappingFn = createEndpointMappingFn({
	mode: CanvasConnectionMode.Output,
	position: Position.Right,
	offsetAxis: 'top',
});

const nonMainOutputsMappingFn = createEndpointMappingFn({
	mode: CanvasConnectionMode.Output,
	position: Position.Top,
	offsetAxis: 'left',
});

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

function onActivate(id: string, event: MouseEvent) {
	emit('activate', id, event);
}

function onDeactivate() {
	emit('deactivate', props.id);
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

function onFocus(id: string) {
	emit('focus', id);
}

function onUpdateClass({ className, add = true }: CanvasNodeEventBusEvents['update:node:class']) {
	nodeClasses.value = add
		? [...new Set([...nodeClasses.value, className])]
		: nodeClasses.value.filter((c) => c !== className);
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

const hasToolbar = computed(
	() => ![CanvasNodeRenderType.AddNodes, CanvasNodeRenderType.AIPrompt].includes(renderType.value),
);

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

watch(inputs, (newValue, oldValue) => {
	if (!isEqual(newValue, oldValue)) {
		emit('update:inputs', props.id);
	}
});

watch(outputs, (newValue, oldValue) => {
	if (!isEqual(newValue, oldValue)) {
		emit('update:outputs', props.id);
	}
});

onMounted(() => {
	props.eventBus?.on('nodes:action', emitCanvasNodeEvent);
	canvasNodeEventBus.value?.on('update:node:class', onUpdateClass);
});

onBeforeUnmount(() => {
	props.eventBus?.off('nodes:action', emitCanvasNodeEvent);
	canvasNodeEventBus.value?.off('update:node:class', onUpdateClass);
});
</script>

<template>
	<div
		:class="classes"
		:data-test-id="dataTestId"
		:data-node-name="data.name"
		:data-node-type="data.type"
	>
		<template
			v-for="source in mappedOutputs"
			:key="`${source.handleId}(${source.index + 1}/${mappedOutputs.length})`"
		>
			<CanvasHandleRenderer
				v-bind="source"
				:mode="CanvasConnectionMode.Output"
				:is-read-only="readOnly"
				:is-valid-connection="isValidConnection"
				:data-node-name="data.name"
				data-test-id="canvas-node-output-handle"
				:data-index="source.index"
				:data-connection-type="source.type"
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
				:data-index="target.index"
				:data-connection-type="target.type"
				:data-node-name="data.name"
				@add="onAdd"
			/>
		</template>

		<template v-if="slots.toolbar">
			<slot name="toolbar" :inputs="mainInputs" :outputs="mainOutputs" :data="data" />
		</template>

		<CanvasNodeToolbar
			v-else-if="hasToolbar"
			data-test-id="canvas-node-toolbar"
			:read-only="readOnly"
			:class="$style.canvasNodeToolbar"
			:show-status-icons="isExperimentalNdvActive"
			:items-class="$style.canvasNodeToolbarItems"
			@delete="onDelete"
			@toggle="onDisabledToggle"
			@run="onRun"
			@update="onUpdate"
			@open:contextmenu="onOpenContextMenuFromToolbar"
			@focus="onFocus"
		/>

		<CanvasNodeRenderer
			@activate="onActivate"
			@deactivate="onDeactivate"
			@move="onMove"
			@update="onUpdate"
			@open:contextmenu="onOpenContextMenuFromNode"
			@delete="onDelete"
		/>

		<CanvasNodeTrigger
			v-if="
				props.data.render.type === CanvasNodeRenderType.Default && props.data.render.options.trigger
			"
			:name="data.name"
			:type="data.type"
			:hovered="nearbyHovered"
			:disabled="isDisabled"
			:read-only="readOnly"
			:class="$style.trigger"
			:is-experimental-ndv-active="isExperimentalNdvActive"
		/>
	</div>
</template>

<style lang="scss" module>
.canvasNode {
	.canvasNodeToolbarItems {
		transition: opacity 0.1s ease-in;
		opacity: 0;
	}

	&:hover:not(:has(> .trigger:hover)), // exclude .trigger which has extended hit zone
	&:focus-within,
	&.showToolbar {
		.canvasNodeToolbarItems {
			opacity: 1;
		}
	}
}

.canvasNodeToolbar {
	position: absolute;
	bottom: 100%;
	left: 0;
	z-index: 1;
}
</style>
