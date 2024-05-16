/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import type { ConnectionTypes, INodeTypeDescription } from 'n8n-workflow';
import type { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import type { DefaultEdge, Node, NodeProps, Position } from '@vue-flow/core';
import type { INodeUi } from '@/Interface';
import type { ComputedRef, Ref } from 'vue';

export type CanvasElementType = 'node' | 'note';

export type CanvasConnectionPortType = ConnectionTypes;

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
	inputs: CanvasConnectionPort[];
	outputs: CanvasConnectionPort[];
	renderType: 'default' | 'trigger' | 'configuration' | 'configurable';
}

export type CanvasElement = Node<CanvasElementData>;

export interface CanvasConnectionData {
	source: CanvasConnectionPort;
	target: CanvasConnectionPort;
	fromNodeName?: string;
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
