/**
 * Microsoft SharePoint Node Types
 *
 * Interact with Microsoft SharePoint API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/microsoftsharepoint/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Download a file */
export type MicrosoftSharePointV1FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
	/**
	 * Select the site to retrieve folders from
	 * @default {"mode":"list","value":""}
	 */
	site: ResourceLocatorValue;
	/**
	 * Select the folder to download the file from
	 * @default {"mode":"list","value":""}
	 */
	folder: ResourceLocatorValue;
	/**
	 * Select the file to download
	 * @default {"mode":"list","value":""}
	 */
	file: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Update a file */
export type MicrosoftSharePointV1FileUpdateConfig = {
	resource: 'file';
	operation: 'update';
	/**
	 * Select the site to retrieve folders from
	 * @default {"mode":"list","value":""}
	 */
	site: ResourceLocatorValue;
	/**
	 * Select the folder to update the file in
	 * @default {"mode":"list","value":""}
	 */
	folder: ResourceLocatorValue;
	/**
	 * Select the file to update
	 * @default {"mode":"list","value":""}
	 */
	file: ResourceLocatorValue;
	/**
	 * If not specified, the original file name will be used
	 */
	fileName?: string | Expression<string>;
	/**
	 * Whether to update the file contents
	 * @default false
	 */
	changeFileContent: boolean | Expression<boolean>;
	/**
	 * Find the name of input field containing the binary data to update the file with in the Input panel on the left, in the Binary tab
	 * @hint The name of the input field containing the binary file data to update the file with
	 */
	fileContents: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Upload an existing file */
export type MicrosoftSharePointV1FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
	/**
	 * Select the site to retrieve folders from
	 * @default {"mode":"list","value":""}
	 */
	site: ResourceLocatorValue;
	/**
	 * Select the folder to upload the file to
	 * @default {"mode":"list","value":""}
	 */
	folder: ResourceLocatorValue;
	/**
	 * The name of the file being uploaded
	 */
	fileName: string | Expression<string>;
	/**
	 * Find the name of input field containing the binary data to upload in the Input panel on the left, in the Binary tab
	 * @hint The name of the input field containing the binary file data to upload
	 */
	fileContents: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Create an item in an existing list */
export type MicrosoftSharePointV1ItemCreateConfig = {
	resource: 'item';
	operation: 'create';
	/**
	 * Select the site to retrieve lists from
	 * @default {"mode":"list","value":""}
	 */
	site: ResourceLocatorValue;
	/**
	 * Select the list you want to create an item in
	 * @default {"mode":"list","value":""}
	 */
	list: ResourceLocatorValue;
	columns: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Create a new item, or update the current one if it already exists (upsert) */
export type MicrosoftSharePointV1ItemUpsertConfig = {
	resource: 'item';
	operation: 'upsert';
	/**
	 * Select the site to retrieve lists from
	 * @default {"mode":"list","value":""}
	 */
	site: ResourceLocatorValue;
	/**
	 * Select the list you want to create or update an item in
	 * @default {"mode":"list","value":""}
	 */
	list: ResourceLocatorValue;
	columns: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Delete an item from a list */
export type MicrosoftSharePointV1ItemDeleteConfig = {
	resource: 'item';
	operation: 'delete';
	/**
	 * Select the site to retrieve lists from
	 * @default {"mode":"list","value":""}
	 */
	site: ResourceLocatorValue;
	/**
	 * Select the list you want to delete an item in
	 * @default {"mode":"list","value":""}
	 */
	list: ResourceLocatorValue;
	/**
	 * Select the item you want to delete
	 * @default {"mode":"list","value":""}
	 */
	item: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve an item from a list */
export type MicrosoftSharePointV1ItemGetConfig = {
	resource: 'item';
	operation: 'get';
	/**
	 * Select the site to retrieve lists from
	 * @default {"mode":"list","value":""}
	 */
	site: ResourceLocatorValue;
	/**
	 * Select the list you want to retrieve an item from
	 * @default {"mode":"list","value":""}
	 */
	list: ResourceLocatorValue;
	/**
	 * Select the item you want to get
	 * @default {"mode":"list","value":""}
	 */
	item: ResourceLocatorValue;
	simplify?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Get specific items in a list or list many items */
export type MicrosoftSharePointV1ItemGetAllConfig = {
	resource: 'item';
	operation: 'getAll';
	/**
	 * Select the site to retrieve lists from
	 * @default {"mode":"list","value":""}
	 */
	site: ResourceLocatorValue;
	/**
	 * Select the list you want to search for items in
	 * @default {"mode":"list","value":""}
	 */
	list: ResourceLocatorValue;
	/**
	 * The formula will be evaluated for each record. &lt;a href="https://learn.microsoft.com/en-us/graph/filter-query-parameter"&gt;More info&lt;/a&gt;.
	 * @hint If empty, all the items will be returned
	 */
	filter?: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
	simplify?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Update a file */
export type MicrosoftSharePointV1ItemUpdateConfig = {
	resource: 'item';
	operation: 'update';
	/**
	 * Select the site to retrieve lists from
	 * @default {"mode":"list","value":""}
	 */
	site: ResourceLocatorValue;
	/**
	 * Select the list you want to update an item in
	 * @default {"mode":"list","value":""}
	 */
	list: ResourceLocatorValue;
	columns: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve an item from a list */
export type MicrosoftSharePointV1ListGetConfig = {
	resource: 'list';
	operation: 'get';
	/**
	 * Select the site to retrieve lists from
	 * @default {"mode":"list","value":""}
	 */
	site: ResourceLocatorValue;
	/**
	 * Select the list you want to retrieve
	 * @default {"mode":"list","value":""}
	 */
	list: ResourceLocatorValue;
	simplify?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Get specific items in a list or list many items */
export type MicrosoftSharePointV1ListGetAllConfig = {
	resource: 'list';
	operation: 'getAll';
	/**
	 * Select the site to retrieve lists from
	 * @default {"mode":"list","value":""}
	 */
	site: ResourceLocatorValue;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	simplify?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

export type MicrosoftSharePointV1Params =
	| MicrosoftSharePointV1FileDownloadConfig
	| MicrosoftSharePointV1FileUpdateConfig
	| MicrosoftSharePointV1FileUploadConfig
	| MicrosoftSharePointV1ItemCreateConfig
	| MicrosoftSharePointV1ItemUpsertConfig
	| MicrosoftSharePointV1ItemDeleteConfig
	| MicrosoftSharePointV1ItemGetConfig
	| MicrosoftSharePointV1ItemGetAllConfig
	| MicrosoftSharePointV1ItemUpdateConfig
	| MicrosoftSharePointV1ListGetConfig
	| MicrosoftSharePointV1ListGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftSharePointV1Credentials {
	microsoftSharePointOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MicrosoftSharePointV1Node = {
	type: 'n8n-nodes-base.microsoftSharePoint';
	version: 1;
	config: NodeConfig<MicrosoftSharePointV1Params>;
	credentials?: MicrosoftSharePointV1Credentials;
};

export type MicrosoftSharePointNode = MicrosoftSharePointV1Node;
