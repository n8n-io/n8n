/**
 * Webflow Node - Version 1
 * Consume the Webflow API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type WebflowV1ItemCreateConfig = {
	resource: 'item';
	operation: 'create';
/**
 * ID of the site containing the collection whose items to add to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["create"] }
 */
		siteId: string | Expression<string>;
/**
 * ID of the collection to add an item to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["create"] }
 */
		collectionId: string | Expression<string>;
/**
 * Whether the item should be published on the live site
 * @displayOptions.show { resource: ["item"], operation: ["create"] }
 * @default false
 */
		live: boolean | Expression<boolean>;
	fieldsUi?: {
		fieldValues?: Array<{
			/** Field to set for the item to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			fieldId?: string | Expression<string>;
			/** Value to set for the item to create
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
};

export type WebflowV1ItemDeleteConfig = {
	resource: 'item';
	operation: 'delete';
/**
 * ID of the site containing the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["delete", "get"] }
 */
		siteId: string | Expression<string>;
/**
 * ID of the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["delete", "get"] }
 */
		collectionId: string | Expression<string>;
/**
 * ID of the item to operate on
 * @displayOptions.show { resource: ["item"], operation: ["delete", "get"] }
 */
		itemId: string | Expression<string>;
};

export type WebflowV1ItemGetConfig = {
	resource: 'item';
	operation: 'get';
/**
 * ID of the site containing the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["delete", "get"] }
 */
		siteId: string | Expression<string>;
/**
 * ID of the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["delete", "get"] }
 */
		collectionId: string | Expression<string>;
/**
 * ID of the item to operate on
 * @displayOptions.show { resource: ["item"], operation: ["delete", "get"] }
 */
		itemId: string | Expression<string>;
};

export type WebflowV1ItemGetAllConfig = {
	resource: 'item';
	operation: 'getAll';
/**
 * ID of the site containing the collection whose items to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["getAll"] }
 */
		siteId: string | Expression<string>;
/**
 * ID of the collection whose items to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["getAll"] }
 */
		collectionId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["item"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["item"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

export type WebflowV1ItemUpdateConfig = {
	resource: 'item';
	operation: 'update';
/**
 * ID of the site containing the collection whose items to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["update"] }
 */
		siteId: string | Expression<string>;
/**
 * ID of the collection whose items to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["update"] }
 */
		collectionId: string | Expression<string>;
/**
 * ID of the item to update
 * @displayOptions.show { resource: ["item"], operation: ["update"] }
 */
		itemId: string | Expression<string>;
/**
 * Whether the item should be published on the live site
 * @displayOptions.show { resource: ["item"], operation: ["update"] }
 * @default false
 */
		live: boolean | Expression<boolean>;
	fieldsUi?: {
		fieldValues?: Array<{
			/** Field to set for the item to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			fieldId?: string | Expression<string>;
			/** Value to set for the item to update
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
};

export type WebflowV1Params =
	| WebflowV1ItemCreateConfig
	| WebflowV1ItemDeleteConfig
	| WebflowV1ItemGetConfig
	| WebflowV1ItemGetAllConfig
	| WebflowV1ItemUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface WebflowV1Credentials {
	webflowApi: CredentialReference;
	webflowOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface WebflowV1NodeBase {
	type: 'n8n-nodes-base.webflow';
	version: 1;
	credentials?: WebflowV1Credentials;
}

export type WebflowV1ItemCreateNode = WebflowV1NodeBase & {
	config: NodeConfig<WebflowV1ItemCreateConfig>;
};

export type WebflowV1ItemDeleteNode = WebflowV1NodeBase & {
	config: NodeConfig<WebflowV1ItemDeleteConfig>;
};

export type WebflowV1ItemGetNode = WebflowV1NodeBase & {
	config: NodeConfig<WebflowV1ItemGetConfig>;
};

export type WebflowV1ItemGetAllNode = WebflowV1NodeBase & {
	config: NodeConfig<WebflowV1ItemGetAllConfig>;
};

export type WebflowV1ItemUpdateNode = WebflowV1NodeBase & {
	config: NodeConfig<WebflowV1ItemUpdateConfig>;
};

export type WebflowV1Node =
	| WebflowV1ItemCreateNode
	| WebflowV1ItemDeleteNode
	| WebflowV1ItemGetNode
	| WebflowV1ItemGetAllNode
	| WebflowV1ItemUpdateNode
	;