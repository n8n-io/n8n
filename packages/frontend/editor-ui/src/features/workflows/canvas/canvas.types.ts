import type {
	ExecutionStatus,
	IConnections,
	INodeConnections,
	INodeParameterResourceLocator,
	IWorkflowGroup,
	NodeConnectionType,
} from 'n8n-workflow';
import type {
	Connection,
	DefaultEdge,
	Node,
	NodeProps,
	Position,
	OnConnectStartParams,
	ViewportTransform,
} from '@vue-flow/core';
import type { INodeUi } from '@/Interface';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { ComputedRef, Ref } from 'vue';
import type { EventBus } from '@n8n/utils/event-bus';
import type { CanvasLayoutSource } from '@/features/workflows/canvas/composables/useCanvasLayout';
import type { NodeIconSource } from '@/app/utils/nodeIcon';
import type { ExecutionOutputMap, ExecutionOutputMapData } from '@/app/types/executionData';

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
	ChoicePrompt = 'n8n-nodes-internal.choicePrompt',
	Agent = 'n8n-nodes-base.messageAnAgent',
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
		tooltip?: string;
		dirtiness?: CanvasNodeDirtinessType;
		icon?: NodeIconSource;
		placeholder?: boolean;
	}>;
};

export type CanvasNodeAddNodesRender = {
	type: CanvasNodeRenderType.AddNodes;
	options: Record<string, never>;
};

export type CanvasNodeChoicePromptRender = {
	type: CanvasNodeRenderType.ChoicePrompt;
	options: Record<string, never>;
};

export type CanvasNodeStickyNoteRender = {
	type: CanvasNodeRenderType.StickyNote;
	options: Partial<{
		width: number;
		height: number;
		color: number | string; // 1-7 for presets, hex string for custom colors
		content: string;
	}>;
};

export type CanvasNodeAgentRender = {
	type: CanvasNodeRenderType.Agent;
	options: Partial<{
		// The node's `agentId` resource-locator. Empty `value` => unconfigured
		// card (shows the agent picker); set => rich card keyed by this agent.
		agentId: INodeParameterResourceLocator;
	}>;
};

export interface CanvasNodeData {
	id: INodeUi['id'];
	name: INodeUi['name'];
	subtitle: string;
	type: INodeUi['type'];
	typeVersion: INodeUi['typeVersion'];
	disabled: INodeUi['disabled'];
	connections: {
		[CanvasConnectionMode.Input]: INodeConnections;
		[CanvasConnectionMode.Output]: INodeConnections;
	};
	issues: {
		validation: string[];
		visible: boolean;
	};
	execution: {
		status?: ExecutionStatus;
		waiting?: string;
		running: boolean;
		waitingForNext?: boolean;
	};
	runData: {
		outputMap?: ExecutionOutputMap;
		iterations: number;
		visible: boolean;
	};
	render:
		| CanvasNodeDefaultRender
		| CanvasNodeStickyNoteRender
		| CanvasNodeAddNodesRender
		| CanvasNodeChoicePromptRender
		| CanvasNodeAgentRender;
}

export type CanvasNode = Node<CanvasNodeData>;

export const CANVAS_NODE_GROUP_TYPE = 'canvas-node-group';
export const CANVAS_NODE_GROUP_ID_PREFIX = 'group:';
export const CANVAS_NODE_GROUP_HANDLE_LEFT = 'left';
export const CANVAS_NODE_GROUP_HANDLE_RIGHT = 'right';

// Host override for group expansion; leaves persisted view state untouched.
export type GroupExpansionMode = 'all' | 'errored';

export function createCanvasGroupNodeId(groupId: string): string {
	return `${CANVAS_NODE_GROUP_ID_PREFIX}${groupId}`;
}

export function parseCanvasGroupNodeId(id: string): string | undefined {
	return id.startsWith(CANVAS_NODE_GROUP_ID_PREFIX)
		? id.slice(CANVAS_NODE_GROUP_ID_PREFIX.length)
		: undefined;
}

/**
 * The only execution states a group can surface — node-level statuses like
 * `crashed` are folded into these during aggregation.
 */
export type GroupExecutionStatus =
	| 'waiting'
	| 'running'
	| 'error'
	| 'issues'
	| 'warning'
	| 'success';

/** Per-node execution state used to roll a group up into one status. */
export interface NodeExecutionSnapshot {
	running: boolean;
	waitingForNext: boolean;
	waiting: string | undefined;
	hasExecutionError: boolean;
	hasValidationError: boolean;
	status: ExecutionStatus | undefined;
	/** Parameters changed since the last run — the single-node "dirty" warning. */
	dirty: boolean;
	iterations: number;
}

export interface CanvasGroupNodeData {
	group: IWorkflowGroup;
	nodesRect: { x: number; y: number; width: number; height: number };
	isCollapsed: boolean;
	executionStatus?: GroupExecutionStatus;
	allNodesDisabled?: boolean;
}

export type CanvasGroupNode = Node<CanvasGroupNodeData>;

export type CanvasNodeOrGroup = CanvasNode | CanvasGroupNode;

export function isCanvasGroupNode(node: CanvasNodeOrGroup): node is CanvasGroupNode;
export function isCanvasGroupNode(node: { type?: string }): boolean;
export function isCanvasGroupNode(node: { type?: string }): boolean {
	return node.type === CANVAS_NODE_GROUP_TYPE;
}

export interface CanvasConnectionData {
	source: CanvasConnectionPort;
	target: CanvasConnectionPort;
	status?: 'success' | 'error' | 'pinned' | 'running';
	maxConnections?: number;
	// Real workflow endpoints behind this collapsed-group edge, one per merged connection.
	canonicals?: Connection[];
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
	/** Deferred fitView — waits for VueFlow's onNodesInitialized before fitting. */
	'fitView:onNodesInit': never;
	/** Deferred setConnections — waits for VueFlow's onNodesInitialized so handles exist. */
	'setConnections:onNodesInit': IConnections;
	'saved:workflow': { isFirstSave: boolean };
	'open:execution': IExecutionResponse;
	'nodes:select': { ids: string[]; panIntoView?: boolean };
	'nodes:selectAll': never;
	'nodes:action': {
		ids: string[];
		action: keyof CanvasNodeEventBusEvents;
		payload?: CanvasNodeEventBusEvents[keyof CanvasNodeEventBusEvents];
	};
	tidyUp: {
		source: CanvasLayoutSource;
		nodeIdsFilter?: string[];
		trackEvents?: boolean;
		trackHistory?: boolean;
		trackBulk?: boolean;
	};
	'create:sticky': never;
	'deprecated:tab-shortcut': never;
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

export type SearchShortcut = '/' | 'ctrl+f';
