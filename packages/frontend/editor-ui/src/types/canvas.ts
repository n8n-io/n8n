import type { ExecutionStatus, INodeConnections, NodeConnectionType } from 'n8n-workflow';
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
import type { EventBus } from '@n8n/utils/event-bus';
import type { CanvasLayoutSource } from '@/composables/useCanvasLayout';
import type { NodeIconSource } from '../utils/nodeIcon';

export const enum CanvasConnectionMode {
	Input = 'inputs',
	Output = 'outputs',
}

export const canvasConnectionModes = [
	CanvasConnectionMode.Input,
	CanvasConnectionMode.Output,
] as const;

export type CanvasConnectionPort = {
	node?: string;
	type: NodeConnectionType;
	index: number;
	required?: boolean;
	maxConnections?: number;
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
	AIPrompt = 'n8n-nodes-base.aiPrompt',
}

export type CanvasNodeDefaultRenderLabelSize = 'small' | 'medium' | 'large';

export const CanvasNodeDirtiness = {
	PARAMETERS_UPDATED: 'parameters-updated',
	INCOMING_CONNECTIONS_UPDATED: 'incoming-connections-updated',
	PINNED_DATA_UPDATED: 'pinned-data-updated',
	UPSTREAM_DIRTY: 'upstream-dirty',
} as const;

export type CanvasNodeDirtinessType =
	(typeof CanvasNodeDirtiness)[keyof typeof CanvasNodeDirtiness];

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
		dirtiness?: CanvasNodeDirtinessType;
		icon?: NodeIconSource;
	}>;
};

export type CanvasNodeAddNodesRender = {
	type: CanvasNodeRenderType.AddNodes;
	options: Record<string, never>;
};

export type CanvasNodeAIPromptRender = {
	type: CanvasNodeRenderType.AIPrompt;
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
		waitingForNext?: boolean;
	};
	runData: {
		outputMap: ExecutionOutputMap;
		iterations: number;
		visible: boolean;
	};
	render:
		| CanvasNodeDefaultRender
		| CanvasNodeStickyNoteRender
		| CanvasNodeAddNodesRender
		| CanvasNodeAIPromptRender;
}

export type CanvasNode = Node<CanvasNodeData>;

export interface CanvasConnectionData {
	source: CanvasConnectionPort;
	target: CanvasConnectionPort;
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
		source: CanvasConnectionPort;
		target: CanvasConnectionPort;
	};
};

export interface CanvasInjectionData {
	initialized: Ref<boolean>;
	isExecuting: Ref<boolean | undefined>;
	connectingHandle: Ref<ConnectStartEvent | undefined>;
	viewport: Ref<ViewportTransform>;
	isExperimentalNdvActive: ComputedRef<boolean>;
	isPaneMoving: Ref<boolean>;
}

export type CanvasNodeEventBusEvents = {
	'update:sticky:color': never;
	'update:node:activated': never;
	'update:node:class': { className: string; add?: boolean };
};

export type CanvasEventBusEvents = {
	fitView: never;
	'saved:workflow': never;
	'open:execution': IExecutionResponse;
	'nodes:select': { ids: string[]; panIntoView?: boolean };
	'nodes:action': {
		ids: string[];
		action: keyof CanvasNodeEventBusEvents;
		payload?: CanvasNodeEventBusEvents[keyof CanvasNodeEventBusEvents];
	};
	tidyUp: { source: CanvasLayoutSource; nodeIdsFilter?: string[] };
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

export type ViewportBoundaries = {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
};
