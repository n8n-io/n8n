/**
 * Bubble Node - Version 1
 * Consume the Bubble Data API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type BubbleV1ObjectCreateConfig = {
	resource: 'object';
	operation: 'create';
/**
 * Name of data type of the object to create
 * @displayOptions.show { resource: ["object"], operation: ["create"] }
 */
		typeName: string | Expression<string>;
	properties?: {
		property?: Array<{
			/** Field to set for the object to create
			 */
			key?: string | Expression<string>;
			/** Value to set for the object to create
			 */
			value?: string | Expression<string>;
		}>;
	};
};

export type BubbleV1ObjectDeleteConfig = {
	resource: 'object';
	operation: 'delete';
/**
 * Name of data type of the object to retrieve
 * @displayOptions.show { resource: ["object"], operation: ["get", "delete"] }
 */
		typeName: string | Expression<string>;
/**
 * ID of the object to retrieve
 * @displayOptions.show { resource: ["object"], operation: ["get", "delete"] }
 */
		objectId: string | Expression<string>;
};

export type BubbleV1ObjectGetConfig = {
	resource: 'object';
	operation: 'get';
/**
 * Name of data type of the object to retrieve
 * @displayOptions.show { resource: ["object"], operation: ["get", "delete"] }
 */
		typeName: string | Expression<string>;
/**
 * ID of the object to retrieve
 * @displayOptions.show { resource: ["object"], operation: ["get", "delete"] }
 */
		objectId: string | Expression<string>;
};

export type BubbleV1ObjectGetAllConfig = {
	resource: 'object';
	operation: 'getAll';
/**
 * Name of data type of the object to create
 * @displayOptions.show { resource: ["object"], operation: ["getAll"] }
 */
		typeName: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["object"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["object"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type BubbleV1ObjectUpdateConfig = {
	resource: 'object';
	operation: 'update';
/**
 * Name of data type of the object to update
 * @displayOptions.show { resource: ["object"], operation: ["update"] }
 */
		typeName: string | Expression<string>;
/**
 * ID of the object to update
 * @displayOptions.show { resource: ["object"], operation: ["update"] }
 */
		objectId: string | Expression<string>;
	properties?: {
		property?: Array<{
			/** Field to set for the object to create
			 */
			key?: string | Expression<string>;
			/** Value to set for the object to create
			 */
			value?: string | Expression<string>;
		}>;
	};
};

export type BubbleV1Params =
	| BubbleV1ObjectCreateConfig
	| BubbleV1ObjectDeleteConfig
	| BubbleV1ObjectGetConfig
	| BubbleV1ObjectGetAllConfig
	| BubbleV1ObjectUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type BubbleV1ObjectCreateOutput = {
	id?: string;
	status?: string;
};

export type BubbleV1ObjectDeleteOutput = {
	success?: boolean;
};

export type BubbleV1ObjectGetOutput = {
	_id?: string;
	'Created By'?: string;
	'Created Date'?: string;
	'Modified Date'?: string;
};

export type BubbleV1ObjectGetAllOutput = {
	_id?: string;
	'Created By'?: string;
	'Created Date'?: string;
	'Modified Date'?: string;
};

export type BubbleV1ObjectUpdateOutput = {
	success?: boolean;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface BubbleV1Credentials {
	bubbleApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface BubbleV1NodeBase {
	type: 'n8n-nodes-base.bubble';
	version: 1;
	credentials?: BubbleV1Credentials;
}

export type BubbleV1ObjectCreateNode = BubbleV1NodeBase & {
	config: NodeConfig<BubbleV1ObjectCreateConfig>;
	output?: BubbleV1ObjectCreateOutput;
};

export type BubbleV1ObjectDeleteNode = BubbleV1NodeBase & {
	config: NodeConfig<BubbleV1ObjectDeleteConfig>;
	output?: BubbleV1ObjectDeleteOutput;
};

export type BubbleV1ObjectGetNode = BubbleV1NodeBase & {
	config: NodeConfig<BubbleV1ObjectGetConfig>;
	output?: BubbleV1ObjectGetOutput;
};

export type BubbleV1ObjectGetAllNode = BubbleV1NodeBase & {
	config: NodeConfig<BubbleV1ObjectGetAllConfig>;
	output?: BubbleV1ObjectGetAllOutput;
};

export type BubbleV1ObjectUpdateNode = BubbleV1NodeBase & {
	config: NodeConfig<BubbleV1ObjectUpdateConfig>;
	output?: BubbleV1ObjectUpdateOutput;
};

export type BubbleV1Node =
	| BubbleV1ObjectCreateNode
	| BubbleV1ObjectDeleteNode
	| BubbleV1ObjectGetNode
	| BubbleV1ObjectGetAllNode
	| BubbleV1ObjectUpdateNode
	;