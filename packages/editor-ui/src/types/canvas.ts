/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import type { ConnectionTypes } from 'n8n-workflow';
import { JsPlumbInstance } from '@jsplumb/core';
import type { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';

export type CanvasElementType = 'node' | 'note';

export type CanvasConnectionEndpointType = ConnectionTypes;

export type CanvasElementEndpoint = {
	type: CanvasConnectionEndpointType;
	port: number;
};

export interface CanvasElement {
	id: string;
	type: CanvasElementType;
	position: [number, number];
	metadata: unknown;
	inputs: CanvasElementEndpoint[];
	outputs: CanvasElementEndpoint[];
}

export interface CanvasConnectionEndpoint {
	id: string;
	type: CanvasConnectionEndpointType;
	port: number;
}

export interface CanvasConnection {
	source: CanvasConnectionEndpoint;
	target: CanvasConnectionEndpoint;
}

export interface CanvasPluginContext {
	instance: BrowserJsPlumbInstance;
}

export interface CanvasPlugin {
	(ctx: CanvasPluginContext): void;
}
