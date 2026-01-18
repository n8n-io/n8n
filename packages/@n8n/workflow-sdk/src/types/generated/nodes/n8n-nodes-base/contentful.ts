/**
 * Contentful Node Types
 *
 * Consume Contentful API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/contentful/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	 * @default master
	 */
	environmentId?: string | Expression<string>;
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
	 * @default master
	 */
	environmentId?: string | Expression<string>;
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
	 * @default master
	 */
	environmentId?: string | Expression<string>;
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
	| ContentfulV1SpaceGetConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ContentfulV1Credentials {
	contentfulApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ContentfulNode = {
	type: 'n8n-nodes-base.contentful';
	version: 1;
	config: NodeConfig<ContentfulV1Params>;
	credentials?: ContentfulV1Credentials;
};
