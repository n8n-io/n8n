/**
 * Webflow Node - Version 2
 * Consume the Webflow API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type WebflowV2ItemCreateConfig = {
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

export type WebflowV2ItemDeleteItemConfig = {
	resource: 'item';
	operation: 'deleteItem';
/**
 * ID of the site containing the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["deleteItem"] }
 */
		siteId: string | Expression<string>;
/**
 * ID of the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["deleteItem"] }
 */
		collectionId: string | Expression<string>;
/**
 * ID of the item to operate on
 * @displayOptions.show { resource: ["item"], operation: ["deleteItem"] }
 */
		itemId: string | Expression<string>;
};

export type WebflowV2ItemGetConfig = {
	resource: 'item';
	operation: 'get';
/**
 * ID of the site containing the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["get"] }
 */
		siteId: string | Expression<string>;
/**
 * ID of the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["get"] }
 */
		collectionId: string | Expression<string>;
/**
 * ID of the item to operate on
 * @displayOptions.show { resource: ["item"], operation: ["get"] }
 */
		itemId: string | Expression<string>;
};

export type WebflowV2ItemGetAllConfig = {
	resource: 'item';
	operation: 'getAll';
/**
 * ID of the site containing the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["getAll"] }
 */
		siteId: string | Expression<string>;
/**
 * ID of the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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
 * @displayOptions.show { returnAll: [false], resource: ["item"], operation: ["getAll"] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

export type WebflowV2ItemUpdateConfig = {
	resource: 'item';
	operation: 'update';
/**
 * ID of the site containing the collection whose items to add to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["update"] }
 */
		siteId: string | Expression<string>;
/**
 * ID of the collection to add an item to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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
			/** Field to set for the item to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			fieldId?: string | Expression<string>;
			/** Value to set for the item to create
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
};

export type WebflowV2Params =
	| WebflowV2ItemCreateConfig
	| WebflowV2ItemDeleteItemConfig
	| WebflowV2ItemGetConfig
	| WebflowV2ItemGetAllConfig
	| WebflowV2ItemUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface WebflowV2Credentials {
	webflowOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type WebflowV2Node = {
	type: 'n8n-nodes-base.webflow';
	version: 2;
	config: NodeConfig<WebflowV2Params>;
	credentials?: WebflowV2Credentials;
};