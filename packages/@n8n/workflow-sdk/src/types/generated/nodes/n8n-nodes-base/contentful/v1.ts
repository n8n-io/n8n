/**
 * Contentful Node - Version 1
 * Consume Contentful API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type ContentfulV1AssetGetConfig = {
	resource: 'asset';
	operation: 'get';
/**
 * Pick where your data comes from, delivery or preview API
 * @default deliveryApi
 */
		source?: 'deliveryApi' | 'previewApi' | Expression<string>;
/**
 * The ID for the Contentful environment (e.g. master, staging, etc.). Depending on your plan, you might not have environments. In that case use "master".
 * @displayOptions.show { resource: ["asset"], operation: ["get", "getAll"] }
 * @default master
 */
		environmentId?: string | Expression<string>;
	assetId: string | Expression<string>;
};

export type ContentfulV1AssetGetAllConfig = {
	resource: 'asset';
	operation: 'getAll';
/**
 * Pick where your data comes from, delivery or preview API
 * @default deliveryApi
 */
		source?: 'deliveryApi' | 'previewApi' | Expression<string>;
/**
 * The ID for the Contentful environment (e.g. master, staging, etc.). Depending on your plan, you might not have environments. In that case use "master".
 * @displayOptions.show { resource: ["asset"], operation: ["get", "getAll"] }
 * @default master
 */
		environmentId?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["asset"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["asset"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type ContentfulV1ContentTypeGetConfig = {
	resource: 'contentType';
	operation: 'get';
/**
 * Pick where your data comes from, delivery or preview API
 * @default deliveryApi
 */
		source?: 'deliveryApi' | 'previewApi' | Expression<string>;
/**
 * The ID for the Contentful environment (e.g. master, staging, etc.). Depending on your plan, you might not have environments. In that case use "master".
 * @displayOptions.show { resource: ["contentType"], operation: ["get"] }
 * @default master
 */
		environmentId?: string | Expression<string>;
	contentTypeId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type ContentfulV1EntryGetConfig = {
	resource: 'entry';
	operation: 'get';
/**
 * Pick where your data comes from, delivery or preview API
 * @default deliveryApi
 */
		source?: 'deliveryApi' | 'previewApi' | Expression<string>;
/**
 * The ID for the Contentful environment (e.g. master, staging, etc.). Depending on your plan, you might not have environments. In that case use "master".
 * @displayOptions.show { resource: ["entry"], operation: ["get", "getAll"] }
 * @default master
 */
		environmentId?: string | Expression<string>;
	entryId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type ContentfulV1EntryGetAllConfig = {
	resource: 'entry';
	operation: 'getAll';
/**
 * Pick where your data comes from, delivery or preview API
 * @default deliveryApi
 */
		source?: 'deliveryApi' | 'previewApi' | Expression<string>;
/**
 * The ID for the Contentful environment (e.g. master, staging, etc.). Depending on your plan, you might not have environments. In that case use "master".
 * @displayOptions.show { resource: ["entry"], operation: ["get", "getAll"] }
 * @default master
 */
		environmentId?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["entry"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["entry"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type ContentfulV1LocaleGetAllConfig = {
	resource: 'locale';
	operation: 'getAll';
/**
 * Pick where your data comes from, delivery or preview API
 * @default deliveryApi
 */
		source?: 'deliveryApi' | 'previewApi' | Expression<string>;
/**
 * The ID for the Contentful environment (e.g. master, staging, etc.). Depending on your plan, you might not have environments. In that case use "master".
 * @displayOptions.show { resource: ["locale"], operation: ["get", "getAll"] }
 * @default master
 */
		environmentId?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["locale"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["locale"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

export type ContentfulV1SpaceGetConfig = {
	resource: 'space';
	operation: 'get';
/**
 * Pick where your data comes from, delivery or preview API
 * @default deliveryApi
 */
		source?: 'deliveryApi' | 'previewApi' | Expression<string>;
};

export type ContentfulV1Params =
	| ContentfulV1AssetGetConfig
	| ContentfulV1AssetGetAllConfig
	| ContentfulV1ContentTypeGetConfig
	| ContentfulV1EntryGetConfig
	| ContentfulV1EntryGetAllConfig
	| ContentfulV1LocaleGetAllConfig
	| ContentfulV1SpaceGetConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type ContentfulV1ContentTypeGetOutput = {
	disabled?: boolean;
	id?: string;
	localized?: boolean;
	name?: string;
	omitted?: boolean;
	required?: boolean;
	type?: string;
};

export type ContentfulV1EntryGetAllOutput = {
	name?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface ContentfulV1Credentials {
	contentfulApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ContentfulV1NodeBase {
	type: 'n8n-nodes-base.contentful';
	version: 1;
	credentials?: ContentfulV1Credentials;
}

export type ContentfulV1AssetGetNode = ContentfulV1NodeBase & {
	config: NodeConfig<ContentfulV1AssetGetConfig>;
};

export type ContentfulV1AssetGetAllNode = ContentfulV1NodeBase & {
	config: NodeConfig<ContentfulV1AssetGetAllConfig>;
};

export type ContentfulV1ContentTypeGetNode = ContentfulV1NodeBase & {
	config: NodeConfig<ContentfulV1ContentTypeGetConfig>;
	output?: ContentfulV1ContentTypeGetOutput;
};

export type ContentfulV1EntryGetNode = ContentfulV1NodeBase & {
	config: NodeConfig<ContentfulV1EntryGetConfig>;
};

export type ContentfulV1EntryGetAllNode = ContentfulV1NodeBase & {
	config: NodeConfig<ContentfulV1EntryGetAllConfig>;
	output?: ContentfulV1EntryGetAllOutput;
};

export type ContentfulV1LocaleGetAllNode = ContentfulV1NodeBase & {
	config: NodeConfig<ContentfulV1LocaleGetAllConfig>;
};

export type ContentfulV1SpaceGetNode = ContentfulV1NodeBase & {
	config: NodeConfig<ContentfulV1SpaceGetConfig>;
};

export type ContentfulV1Node =
	| ContentfulV1AssetGetNode
	| ContentfulV1AssetGetAllNode
	| ContentfulV1ContentTypeGetNode
	| ContentfulV1EntryGetNode
	| ContentfulV1EntryGetAllNode
	| ContentfulV1LocaleGetAllNode
	| ContentfulV1SpaceGetNode
	;