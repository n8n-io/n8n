/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import type { ConnectionTypes } from 'n8n-workflow';
import type { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import type { DefaultEdge, Node, Position } from '@vue-flow/core';
import type { INodeUi } from '@/Interface';

export type CanvasElementType = 'node' | 'note';

export type CanvasConnectionPortType = ConnectionTypes;

export type CanvasConnectionPort = {
	type: CanvasConnectionPortType;
	index: number;
};

export interface CanvasElementPortWithPosition extends CanvasConnectionPort {
	position: Position;
	offset?: { top?: number | string; left?: number | string };
}

export interface CanvasElementData {
	type: INodeUi['type'];
	typeVersion: INodeUi['typeVersion'];
	inputs: CanvasConnectionPort[];
	outputs: CanvasConnectionPort[];
}

export type CanvasElement = Node<CanvasElementData>;

export interface CanvasConnectionData {
	source: CanvasConnectionPort;
	target: CanvasConnectionPort;
}

export type CanvasConnection = DefaultEdge<CanvasConnectionData>;

export interface CanvasPluginContext {
	instance: BrowserJsPlumbInstance;
}

export interface CanvasPlugin {
	(ctx: CanvasPluginContext): void;
}
