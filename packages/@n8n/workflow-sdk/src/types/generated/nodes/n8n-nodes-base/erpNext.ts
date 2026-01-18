/**
 * ERPNext Node Types
 *
 * Consume ERPNext API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/erpnext/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a document */
export type ErpNextV1DocumentCreateConfig = {
	resource: 'document';
	operation: 'create';
	/**
	 * DocType you would like to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docType: string | Expression<string>;
	properties: Record<string, unknown>;
};

/** Delete a document */
export type ErpNextV1DocumentDeleteConfig = {
	resource: 'document';
	operation: 'delete';
	/**
	 * The type of document you would like to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docType: string | Expression<string>;
	/**
	 * The name (ID) of document you would like to get
	 */
	documentName: string | Expression<string>;
};

/** Retrieve a document */
export type ErpNextV1DocumentGetConfig = {
	resource: 'document';
	operation: 'get';
	/**
	 * The type of document you would like to get. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docType: string | Expression<string>;
	/**
	 * The name (ID) of document you would like to get
	 */
	documentName: string | Expression<string>;
};

/** Retrieve many documents */
export type ErpNextV1DocumentGetAllConfig = {
	resource: 'document';
	operation: 'getAll';
	/**
	 * DocType whose documents to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docType?: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a document */
export type ErpNextV1DocumentUpdateConfig = {
	resource: 'document';
	operation: 'update';
	/**
	 * The type of document you would like to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docType: string | Expression<string>;
	/**
	 * The name (ID) of document you would like to get
	 */
	documentName: string | Expression<string>;
	/**
	 * Properties of request body
	 * @default {}
	 */
	properties?: Record<string, unknown>;
};

export type ErpNextV1Params =
	| ErpNextV1DocumentCreateConfig
	| ErpNextV1DocumentDeleteConfig
	| ErpNextV1DocumentGetConfig
	| ErpNextV1DocumentGetAllConfig
	| ErpNextV1DocumentUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ErpNextV1Credentials {
	erpNextApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ErpNextNode = {
	type: 'n8n-nodes-base.erpNext';
	version: 1;
	config: NodeConfig<ErpNextV1Params>;
	credentials?: ErpNextV1Credentials;
};
