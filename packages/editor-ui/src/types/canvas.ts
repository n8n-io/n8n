/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import type { ConnectionTypes } from 'n8n-workflow';
import type { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import type { DefaultEdge, Node, Position } from '@vue-flow/core';
import type { INodeUi } from '@/Interface';

export type CanvasElementType = 'node' | 'note';

export type CanvasConnectionPortType = ConnectionTypes;

export type CanvasConnectionPort = {
	type: CanvasConnectionPortType;
	required?: boolean;
	index: number;
};

export interface CanvasElementPortWithPosition extends CanvasConnectionPort {
	position: Position;
	offset?: { top?: string; left?: string };
}

export interface CanvasElementData {
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
