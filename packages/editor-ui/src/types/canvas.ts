/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import type {
	ExecutionStatus,
	INodeConnections,
	IConnection,
	NodeConnectionType,
} from 'n8n-workflow';
import type {
	DefaultEdge,
	Node,
	NodeProps,
	Position,
	OnConnectStartParams,
	ViewportTransform,
} from '@vue-flow/core';
import type { IExecutionResponse, INodeUi } from '@/Interface';
import type { ComputedRef, Ref } from 'vue';
import type { PartialBy } from '@/utils/typeHelpers';
import type { EventBus } from 'n8n-design-system';

export type CanvasConnectionPortType = NodeConnectionType;

export const enum CanvasConnectionMode {
	Input = 'inputs',
	Output = 'outputs',
}

export const canvasConnectionModes = [
	CanvasConnectionMode.Input,
	CanvasConnectionMode.Output,
] as const;

export type CanvasConnectionPort = {
	type: CanvasConnectionPortType;
	required?: boolean;
	maxConnections?: number;
	index: number;
	label?: string;
};

export interface CanvasElementPortWithRenderData extends CanvasConnectionPort {
	handleId: string;
	connectionsCount: number;
	isConnecting: boolean;
	position: Position;
	offset?: { top?: string; left?: string };
}

export const enum CanvasNodeRenderType {
	Default = 'default',
	StickyNote = 'n8n-nodes-base.stickyNote',
	AddNodes = 'n8n-nodes-internal.addNodes',
}

export type CanvasNodeDefaultRenderLabelSize = 'small' | 'medium' | 'large';

export type CanvasNodeDefaultRender = {
	type: CanvasNodeRenderType.Default;
	options: Partial<{
		configurable: boolean;
		configuration: boolean;
		trigger: boolean;
		inputs: {
			labelSize: CanvasNodeDefaultRenderLabelSize;
		};
		outputs: {
			labelSize: CanvasNodeDefaultRenderLabelSize;
		};
		tooltip?: string;
	}>;
};

export type CanvasNodeAddNodesRender = {
	type: CanvasNodeRenderType.AddNodes;
	options: Record<string, never>;
};

export type CanvasNodeStickyNoteRender = {
	type: CanvasNodeRenderType.StickyNote;
	options: Partial<{
		width: number;
		height: number;
		color: number;
		content: string;
	}>;
};

export interface CanvasNodeData {
	id: INodeUi['id'];
	name: INodeUi['name'];
	subtitle: string;
	type: INodeUi['type'];
	typeVersion: INodeUi['typeVersion'];
	disabled: INodeUi['disabled'];
	inputs: CanvasConnectionPort[];
	outputs: CanvasConnectionPort[];
	connections: {
		[CanvasConnectionMode.Input]: INodeConnections;
		[CanvasConnectionMode.Output]: INodeConnections;
	};
	issues: {
		items: string[];
		visible: boolean;
	};
	pinnedData: {
		count: number;
		visible: boolean;
	};
	execution: {
		status?: ExecutionStatus;
		waiting?: string;
		running: boolean;
	};
	runData: {
		outputMap: ExecutionOutputMap;
		iterations: number;
		visible: boolean;
	};
	render: CanvasNodeDefaultRender | CanvasNodeStickyNoteRender | CanvasNodeAddNodesRender;
}

export type CanvasNode = Node<CanvasNodeData>;

export interface CanvasConnectionData {
	source: CanvasConnectionPort;
	target: CanvasConnectionPort;
	fromNodeName?: string;
	status?: 'success' | 'error' | 'pinned' | 'running';
	maxConnections?: number;
}

export type CanvasConnection = DefaultEdge<CanvasConnectionData>;

export type CanvasConnectionCreateData = {
	source: string;
	sourceHandle: string;
	target: string;
	targetHandle: string;
	data: {
		source: PartialBy<IConnection, 'node'>;
		target: PartialBy<IConnection, 'node'>;
	};
};

export interface CanvasInjectionData {
	initialized: Ref<boolean>;
	isExecuting: Ref<boolean | undefined>;
	connectingHandle: Ref<ConnectStartEvent | undefined>;
	viewport: Ref<ViewportTransform>;
}

export type CanvasNodeEventBusEvents = {
	'update:sticky:color': never;
	'update:node:active': never;
};

export type CanvasEventBusEvents = {
	fitView: never;
	'saved:workflow': never;
	'open:execution': IExecutionResponse;
	'nodes:select': { ids: string[] };
	'nodes:action': {
		ids: string[];
		action: keyof CanvasNodeEventBusEvents;
		payload?: CanvasNodeEventBusEvents[keyof CanvasNodeEventBusEvents];
	};
};

export interface CanvasNodeInjectionData {
	id: Ref<string>;
	data: Ref<CanvasNodeData>;
	label: Ref<NodeProps['label']>;
	selected: Ref<NodeProps['selected']>;
	readOnly: Ref<boolean>;
	eventBus: Ref<EventBus<CanvasNodeEventBusEvents>>;
}

export interface CanvasNodeHandleInjectionData {
	label: Ref<string | undefined>;
	mode: Ref<CanvasConnectionMode>;
	type: Ref<NodeConnectionType>;
	index: Ref<number>;
	isRequired: Ref<boolean | undefined>;
	isConnected: ComputedRef<boolean | undefined>;
	isConnecting: Ref<boolean | undefined>;
	isReadOnly: Ref<boolean | undefined>;
	maxConnections: Ref<number | undefined>;
	runData: Ref<ExecutionOutputMapData | undefined>;
}

export type ConnectStartEvent = {
	event?: MouseEvent | undefined;
} & OnConnectStartParams;

export type CanvasNodeMoveEvent = { id: string; position: CanvasNode['position'] };

export type ExecutionOutputMapData = {
	total: number;
	iterations: number;
};

export type ExecutionOutputMap = {
	[connectionType: string]: {
		[outputIndex: string]: ExecutionOutputMapData;
	};
};

export type BoundingBox = {
	x: number;
	y: number;
	width: number;
	height: number;
};
