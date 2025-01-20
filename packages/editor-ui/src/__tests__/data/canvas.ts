import { CanvasKey, CanvasNodeHandleKey, CanvasNodeKey } from '@/constants';
import { computed, ref } from 'vue';
import type {
	CanvasInjectionData,
	CanvasNode,
	CanvasNodeData,
	CanvasNodeEventBusEvents,
	CanvasNodeHandleInjectionData,
	CanvasNodeInjectionData,
	ConnectStartEvent,
	ExecutionOutputMapData,
} from '@/types';
import { CanvasConnectionMode, CanvasNodeRenderType } from '@/types';
import { NodeConnectionType } from 'n8n-workflow';
import type { EventBus } from 'n8n-design-system';
import { createEventBus } from 'n8n-design-system';
import type { ViewportTransform } from '@vue-flow/core';

export function createCanvasNodeData({
	id = 'node',
	name = 'Test Node',
	subtitle = 'Test Node Subtitle',
	type = 'test',
	typeVersion = 1,
	disabled = false,
	inputs = [],
	outputs = [],
	connections = { [CanvasConnectionMode.Input]: {}, [CanvasConnectionMode.Output]: {} },
	execution = { running: false },
	issues = { items: [], visible: false },
	pinnedData = { count: 0, visible: false },
	runData = { outputMap: {}, iterations: 0, visible: false },
	render = {
		type: CanvasNodeRenderType.Default,
		options: { configurable: false, configuration: false, trigger: false },
	},
}: Partial<CanvasNodeData> = {}): CanvasNodeData {
	return {
		id,
		name,
		subtitle,
		type,
		typeVersion,
		execution,
		issues,
		pinnedData,
		runData,
		disabled,
		inputs,
		outputs,
		connections,
		render,
	};
}

export function createCanvasNodeElement({
	id = '1',
	type = 'node',
	label = 'Node',
	position = { x: 100, y: 100 },
	data,
}: Partial<Omit<CanvasNode, 'data'> & { data: Partial<CanvasNodeData> }> = {}): CanvasNode {
	return {
		id,
		type,
		label,
		position,
		data: createCanvasNodeData({ id, type, ...data }),
	};
}

export function createCanvasNodeProps({
	id = 'node',
	label = 'Test Node',
	selected = false,
	readOnly = false,
	data = {},
}: {
	id?: string;
	label?: string;
	selected?: boolean;
	readOnly?: boolean;
	data?: Partial<CanvasNodeData>;
} = {}) {
	return {
		id,
		label,
		selected,
		readOnly,
		data: createCanvasNodeData(data),
	};
}

export function createCanvasProvide({
	initialized = true,
	isExecuting = false,
	connectingHandle = undefined,
	viewport = { x: 0, y: 0, zoom: 1 },
}: {
	initialized?: boolean;
	isExecuting?: boolean;
	connectingHandle?: ConnectStartEvent;
	viewport?: ViewportTransform;
} = {}) {
	return {
		[String(CanvasKey)]: {
			initialized: ref(initialized),
			isExecuting: ref(isExecuting),
			connectingHandle: ref(connectingHandle),
			viewport: ref(viewport),
		} satisfies CanvasInjectionData,
	};
}

export function createCanvasNodeProvide({
	id = 'node',
	label = 'Test Node',
	selected = false,
	readOnly = false,
	data = {},
	eventBus = createEventBus<CanvasNodeEventBusEvents>(),
}: {
	id?: string;
	label?: string;
	selected?: boolean;
	readOnly?: boolean;
	data?: Partial<CanvasNodeData>;
	eventBus?: EventBus<CanvasNodeEventBusEvents>;
} = {}) {
	const props = createCanvasNodeProps({ id, label, selected, readOnly, data });
	return {
		[String(CanvasNodeKey)]: {
			id: ref(props.id),
			label: ref(props.label),
			selected: ref(props.selected),
			readOnly: ref(props.readOnly),
			data: ref(props.data),
			eventBus: ref(eventBus),
		} satisfies CanvasNodeInjectionData,
	};
}

export function createCanvasHandleProvide({
	label = 'Handle',
	mode = CanvasConnectionMode.Input,
	type = NodeConnectionType.Main,
	index = 0,
	runData,
	isConnected = false,
	isConnecting = false,
	isReadOnly = false,
	isRequired = false,
}: {
	label?: string;
	mode?: CanvasConnectionMode;
	type?: NodeConnectionType;
	index?: number;
	runData?: ExecutionOutputMapData;
	isConnected?: boolean;
	isConnecting?: boolean;
	isReadOnly?: boolean;
	isRequired?: boolean;
} = {}) {
	const maxConnections = [NodeConnectionType.Main, NodeConnectionType.AiTool].includes(type)
		? Infinity
		: 1;
	return {
		[String(CanvasNodeHandleKey)]: {
			label: ref(label),
			mode: ref(mode),
			type: ref(type),
			index: ref(index),
			isConnected: computed(() => isConnected),
			isConnecting: ref(isConnecting),
			isReadOnly: ref(isReadOnly),
			isRequired: ref(isRequired),
			maxConnections: ref(maxConnections),
			runData: ref(runData),
		} satisfies CanvasNodeHandleInjectionData,
	};
}

export function createCanvasConnection(
	nodeA: CanvasNode,
	nodeB: CanvasNode,
	{ sourceIndex = 0, targetIndex = 0 } = {},
) {
	const nodeAOutput = nodeA.data?.outputs[sourceIndex];
	const nodeBInput = nodeA.data?.inputs[targetIndex];

	return {
		id: `${nodeA.id}-${nodeB.id}`,
		source: nodeA.id,
		target: nodeB.id,
		...(nodeAOutput ? { sourceHandle: `outputs/${nodeAOutput.type}/${nodeAOutput.index}` } : {}),
		...(nodeBInput ? { targetHandle: `inputs/${nodeBInput.type}/${nodeBInput.index}` } : {}),
	};
}
