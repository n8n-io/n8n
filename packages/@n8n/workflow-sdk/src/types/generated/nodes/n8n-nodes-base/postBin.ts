/**
 * PostBin Node Types
 *
 * Consume PostBin API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/postbin/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

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
	| PostBinV1RequestSendConfig;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type PostBinV1Node = {
	type: 'n8n-nodes-base.postBin';
	version: 1;
	config: NodeConfig<PostBinV1Params>;
	credentials?: Record<string, never>;
};

export type PostBinNode = PostBinV1Node;
