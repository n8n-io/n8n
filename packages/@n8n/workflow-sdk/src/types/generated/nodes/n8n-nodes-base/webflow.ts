/**
 * Webflow Node Types
 *
 * Consume the Webflow API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/webflow/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type WebflowV2ItemCreateConfig = {
	resource: 'item';
	operation: 'create';
	/**
	 * ID of the site containing the collection whose items to add to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	siteId: string | Expression<string>;
	/**
	 * ID of the collection to add an item to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	collectionId: string | Expression<string>;
	/**
	 * Whether the item should be published on the live site
	 * @default false
	 */
	live: boolean | Expression<boolean>;
	fieldsUi?: Record<string, unknown>;
};

export type WebflowV2ItemDeleteItemConfig = {
	resource: 'item';
	operation: 'deleteItem';
	/**
	 * ID of the site containing the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	siteId: string | Expression<string>;
	/**
	 * ID of the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	collectionId: string | Expression<string>;
	/**
	 * ID of the item to operate on
	 */
	itemId: string | Expression<string>;
};

export type WebflowV2ItemGetConfig = {
	resource: 'item';
	operation: 'get';
	/**
	 * ID of the site containing the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	siteId: string | Expression<string>;
	/**
	 * ID of the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	collectionId: string | Expression<string>;
	/**
	 * ID of the item to operate on
	 */
	itemId: string | Expression<string>;
};

export type WebflowV2ItemGetAllConfig = {
	resource: 'item';
	operation: 'getAll';
	/**
	 * ID of the site containing the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	siteId: string | Expression<string>;
	/**
	 * ID of the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	collectionId: string | Expression<string>;
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
};

export type WebflowV2ItemUpdateConfig = {
	resource: 'item';
	operation: 'update';
	/**
	 * ID of the site containing the collection whose items to add to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	siteId: string | Expression<string>;
	/**
	 * ID of the collection to add an item to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	collectionId: string | Expression<string>;
	/**
	 * ID of the item to update
	 */
	itemId: string | Expression<string>;
	/**
	 * Whether the item should be published on the live site
	 * @default false
	 */
	live: boolean | Expression<boolean>;
	fieldsUi?: Record<string, unknown>;
};

export type WebflowV2Params =
	| WebflowV2ItemCreateConfig
	| WebflowV2ItemDeleteItemConfig
	| WebflowV2ItemGetConfig
	| WebflowV2ItemGetAllConfig
	| WebflowV2ItemUpdateConfig;

export type WebflowV1ItemCreateConfig = {
	resource: 'item';
	operation: 'create';
	/**
	 * ID of the site containing the collection whose items to add to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	siteId: string | Expression<string>;
	/**
	 * ID of the collection to add an item to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	collectionId: string | Expression<string>;
	/**
	 * Whether the item should be published on the live site
	 * @default false
	 */
	live: boolean | Expression<boolean>;
	fieldsUi?: Record<string, unknown>;
};

export type WebflowV1ItemDeleteConfig = {
	resource: 'item';
	operation: 'delete';
	/**
	 * ID of the site containing the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	siteId: string | Expression<string>;
	/**
	 * ID of the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	collectionId: string | Expression<string>;
	/**
	 * ID of the item to operate on
	 */
	itemId: string | Expression<string>;
};

export type WebflowV1ItemGetConfig = {
	resource: 'item';
	operation: 'get';
	/**
	 * ID of the site containing the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	siteId: string | Expression<string>;
	/**
	 * ID of the collection whose items to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	collectionId: string | Expression<string>;
	/**
	 * ID of the item to operate on
	 */
	itemId: string | Expression<string>;
};

export type WebflowV1ItemGetAllConfig = {
	resource: 'item';
	operation: 'getAll';
	/**
	 * ID of the site containing the collection whose items to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	siteId: string | Expression<string>;
	/**
	 * ID of the collection whose items to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	collectionId: string | Expression<string>;
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
};

export type WebflowV1ItemUpdateConfig = {
	resource: 'item';
	operation: 'update';
	/**
	 * ID of the site containing the collection whose items to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	siteId: string | Expression<string>;
	/**
	 * ID of the collection whose items to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	collectionId: string | Expression<string>;
	/**
	 * ID of the item to update
	 */
	itemId: string | Expression<string>;
	/**
	 * Whether the item should be published on the live site
	 * @default false
	 */
	live: boolean | Expression<boolean>;
	fieldsUi?: Record<string, unknown>;
};

export type WebflowV1Params =
	| WebflowV1ItemCreateConfig
	| WebflowV1ItemDeleteConfig
	| WebflowV1ItemGetConfig
	| WebflowV1ItemGetAllConfig
	| WebflowV1ItemUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface WebflowV2Credentials {
	webflowOAuth2Api: CredentialReference;
}

export interface WebflowV1Credentials {
	webflowApi: CredentialReference;
	webflowOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type WebflowV2Node = {
	type: 'n8n-nodes-base.webflow';
	version: 2;
	config: NodeConfig<WebflowV2Params>;
	credentials?: WebflowV2Credentials;
};

export type WebflowV1Node = {
	type: 'n8n-nodes-base.webflow';
	version: 1;
	config: NodeConfig<WebflowV1Params>;
	credentials?: WebflowV1Credentials;
};

export type WebflowNode = WebflowV2Node | WebflowV1Node;
