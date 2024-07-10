/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import type {
	ConnectionTypes,
	ExecutionStatus,
	INodeConnections,
	INodeTypeDescription,
} from 'n8n-workflow';
import type { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import type { DefaultEdge, Node, NodeProps, Position } from '@vue-flow/core';
import type { INodeUi } from '@/Interface';
import type { ComputedRef, Ref } from 'vue';

export type CanvasElementType = 'node' | 'note';

export type CanvasConnectionPortType = ConnectionTypes;

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
	index: number;
	label?: string;
};

export interface CanvasElementPortWithPosition extends CanvasConnectionPort {
	position: Position;
	offset?: { top?: string; left?: string };
}

export interface CanvasElementData {
	id: INodeUi['id'];
	type: INodeUi['type'];
	typeVersion: INodeUi['typeVersion'];
	disabled: INodeUi['disabled'];
	inputs: CanvasConnectionPort[];
	outputs: CanvasConnectionPort[];
	connections: {
		input: INodeConnections;
		output: INodeConnections;
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
		count: number;
		visible: boolean;
	};
	render: {
		type: 'default';
		options: Record<string, unknown>;
	};
}

export type CanvasElement = Node<CanvasElementData>;

export interface CanvasConnectionData {
	source: CanvasConnectionPort;
	target: CanvasConnectionPort;
	fromNodeName?: string;
	status?: 'success' | 'error' | 'pinned' | 'running';
}

export type CanvasConnection = DefaultEdge<CanvasConnectionData>;

export interface CanvasPluginContext {
	instance: BrowserJsPlumbInstance;
}

export interface CanvasPlugin {
	(ctx: CanvasPluginContext): void;
}

export interface CanvasNodeInjectionData {
	id: Ref<string>;
	data: Ref<CanvasElementData>;
	label: Ref<NodeProps['label']>;
	selected: Ref<NodeProps['selected']>;
	nodeType: ComputedRef<INodeTypeDescription | null>;
}

export interface CanvasNodeHandleInjectionData {
	label: Ref<string | undefined>;
}

export type ConnectStartEvent = { handleId: string; handleType: string; nodeId: string };
