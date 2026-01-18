/**
 * Bubble Node Types
 *
 * Consume the Bubble Data API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/bubble/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type BubbleV1ObjectCreateConfig = {
	resource: 'object';
	operation: 'create';
	/**
	 * Name of data type of the object to create
	 */
	typeName: string | Expression<string>;
	properties?: {
		property?: Array<{ key?: string | Expression<string>; value?: string | Expression<string> }>;
	};
};

export type BubbleV1ObjectDeleteConfig = {
	resource: 'object';
	operation: 'delete';
	/**
	 * Name of data type of the object to retrieve
	 */
	typeName: string | Expression<string>;
	/**
	 * ID of the object to retrieve
	 */
	objectId: string | Expression<string>;
};

export type BubbleV1ObjectGetConfig = {
	resource: 'object';
	operation: 'get';
	/**
	 * Name of data type of the object to retrieve
	 */
	typeName: string | Expression<string>;
	/**
	 * ID of the object to retrieve
	 */
	objectId: string | Expression<string>;
};

export type BubbleV1ObjectGetAllConfig = {
	resource: 'object';
	operation: 'getAll';
	/**
	 * Name of data type of the object to create
	 */
	typeName: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	typeName: string | Expression<string>;
	/**
	 * ID of the object to update
	 */
	objectId: string | Expression<string>;
	properties?: {
		property?: Array<{ key?: string | Expression<string>; value?: string | Expression<string> }>;
	};
};

export type BubbleV1Params =
	| BubbleV1ObjectCreateConfig
	| BubbleV1ObjectDeleteConfig
	| BubbleV1ObjectGetConfig
	| BubbleV1ObjectGetAllConfig
	| BubbleV1ObjectUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface BubbleV1Credentials {
	bubbleApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type BubbleV1Node = {
	type: 'n8n-nodes-base.bubble';
	version: 1;
	config: NodeConfig<BubbleV1Params>;
	credentials?: BubbleV1Credentials;
};

export type BubbleNode = BubbleV1Node;
