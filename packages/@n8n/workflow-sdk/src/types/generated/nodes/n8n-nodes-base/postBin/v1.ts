/**
 * PostBin Node - Version 1
 * Consume PostBin API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create bin */
export type PostBinV1BinCreateConfig = {
	resource: 'bin';
	operation: 'create';
	requestOptions?: Record<string, unknown>;
};

/** Get a bin */
export type PostBinV1BinGetConfig = {
	resource: 'bin';
	operation: 'get';
/**
 * Unique identifier for each bin
 * @displayOptions.show { resource: ["bin"], operation: ["get", "delete"] }
 */
		binId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Delete a bin */
export type PostBinV1BinDeleteConfig = {
	resource: 'bin';
	operation: 'delete';
/**
 * Unique identifier for each bin
 * @displayOptions.show { resource: ["bin"], operation: ["get", "delete"] }
 */
		binId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Get a bin */
export type PostBinV1RequestGetConfig = {
	resource: 'request';
	operation: 'get';
/**
 * Unique identifier for each bin
 * @displayOptions.show { resource: ["request"], operation: ["get", "removeFirst", "send"] }
 */
		binId: string | Expression<string>;
/**
 * Unique identifier for each request
 * @displayOptions.show { resource: ["request"], operation: ["get"] }
 */
		requestId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Remove the first request from bin */
export type PostBinV1RequestRemoveFirstConfig = {
	resource: 'request';
	operation: 'removeFirst';
/**
 * Unique identifier for each bin
 * @displayOptions.show { resource: ["request"], operation: ["get", "removeFirst", "send"] }
 */
		binId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Send a test request to the bin */
export type PostBinV1RequestSendConfig = {
	resource: 'request';
	operation: 'send';
/**
 * Unique identifier for each bin
 * @displayOptions.show { resource: ["request"], operation: ["get", "removeFirst", "send"] }
 */
		binId: string | Expression<string>;
	binContent?: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type PostBinV1Params =
	| PostBinV1BinCreateConfig
	| PostBinV1BinGetConfig
	| PostBinV1BinDeleteConfig
	| PostBinV1RequestGetConfig
	| PostBinV1RequestRemoveFirstConfig
	| PostBinV1RequestSendConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type PostBinV1BinCreateOutput = {
	binId?: string;
	expiresIso?: string;
	expiresTimestamp?: number;
	nowIso?: string;
	nowTimestamp?: number;
	requestUrl?: string;
	viewUrl?: string;
};

export type PostBinV1BinGetOutput = {
	binId?: string;
	expiresIso?: string;
	expiresTimestamp?: number;
	nowIso?: string;
	nowTimestamp?: number;
	requestUrl?: string;
	viewUrl?: string;
};

export type PostBinV1RequestSendOutput = {
	requestId?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface PostBinV1NodeBase {
	type: 'n8n-nodes-base.postBin';
	version: 1;
}

export type PostBinV1BinCreateNode = PostBinV1NodeBase & {
	config: NodeConfig<PostBinV1BinCreateConfig>;
	output?: PostBinV1BinCreateOutput;
};

export type PostBinV1BinGetNode = PostBinV1NodeBase & {
	config: NodeConfig<PostBinV1BinGetConfig>;
	output?: PostBinV1BinGetOutput;
};

export type PostBinV1BinDeleteNode = PostBinV1NodeBase & {
	config: NodeConfig<PostBinV1BinDeleteConfig>;
};

export type PostBinV1RequestGetNode = PostBinV1NodeBase & {
	config: NodeConfig<PostBinV1RequestGetConfig>;
};

export type PostBinV1RequestRemoveFirstNode = PostBinV1NodeBase & {
	config: NodeConfig<PostBinV1RequestRemoveFirstConfig>;
};

export type PostBinV1RequestSendNode = PostBinV1NodeBase & {
	config: NodeConfig<PostBinV1RequestSendConfig>;
	output?: PostBinV1RequestSendOutput;
};

export type PostBinV1Node =
	| PostBinV1BinCreateNode
	| PostBinV1BinGetNode
	| PostBinV1BinDeleteNode
	| PostBinV1RequestGetNode
	| PostBinV1RequestRemoveFirstNode
	| PostBinV1RequestSendNode
	;