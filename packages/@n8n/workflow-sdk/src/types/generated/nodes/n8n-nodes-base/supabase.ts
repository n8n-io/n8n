/**
 * Supabase Node Types
 *
 * Add, get, delete and update data in a table
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/supabase/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new row */
export type SupabaseV1RowCreateConfig = {
	resource: 'row';
	operation: 'create';
	/**
	 * Whether to use a database schema different from the default "public" schema (requires schema exposure in the &lt;a href="https://supabase.com/docs/guides/api/using-custom-schemas?queryGroups=language&language=curl#exposing-custom-schemas"&gt;Supabase API&lt;/a&gt;)
	 * @default false
	 */
	useCustomSchema?: boolean | Expression<boolean>;
	/**
	 * Name of database schema to use for table
	 * @default public
	 */
	schema?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	tableId: string | Expression<string>;
	dataToSend?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
	/**
	 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
	 */
	inputsToIgnore?: string | Expression<string>;
	fieldsUi?: {
		fieldValues?: Array<{
			fieldId?: string | Expression<string>;
			fieldValue?: string | Expression<string>;
		}>;
	};
};

/** Delete a row */
export type SupabaseV1RowDeleteConfig = {
	resource: 'row';
	operation: 'delete';
	/**
	 * Whether to use a database schema different from the default "public" schema (requires schema exposure in the &lt;a href="https://supabase.com/docs/guides/api/using-custom-schemas?queryGroups=language&language=curl#exposing-custom-schemas"&gt;Supabase API&lt;/a&gt;)
	 * @default false
	 */
	useCustomSchema?: boolean | Expression<boolean>;
	/**
	 * Name of database schema to use for table
	 * @default public
	 */
	schema?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	tableId: string | Expression<string>;
	filterType?: 'manual' | 'string' | Expression<string>;
	matchType?: 'anyFilter' | 'allFilters' | Expression<string>;
	/**
	 * Filter to decide which rows get deleted
	 * @default {}
	 */
	filters?: {
		conditions?: Array<{
			keyName?: string | Expression<string>;
			condition?:
				| 'eq'
				| 'fullText'
				| 'gt'
				| 'gte'
				| 'ilike'
				| 'is'
				| 'lt'
				| 'lte'
				| 'like'
				| 'neq'
				| Expression<string>;
			searchFunction?: 'fts' | 'plfts' | 'phfts' | 'wfts' | Expression<string>;
			keyValue?: string | Expression<string>;
		}>;
	};
	filterString?: string | Expression<string>;
};

/** Get a row */
export type SupabaseV1RowGetConfig = {
	resource: 'row';
	operation: 'get';
	/**
	 * Whether to use a database schema different from the default "public" schema (requires schema exposure in the &lt;a href="https://supabase.com/docs/guides/api/using-custom-schemas?queryGroups=language&language=curl#exposing-custom-schemas"&gt;Supabase API&lt;/a&gt;)
	 * @default false
	 */
	useCustomSchema?: boolean | Expression<boolean>;
	/**
	 * Name of database schema to use for table
	 * @default public
	 */
	schema?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	tableId: string | Expression<string>;
	filters?: {
		conditions?: Array<{
			keyName?: string | Expression<string>;
			keyValue?: string | Expression<string>;
		}>;
	};
};

/** Get many rows */
export type SupabaseV1RowGetAllConfig = {
	resource: 'row';
	operation: 'getAll';
	/**
	 * Whether to use a database schema different from the default "public" schema (requires schema exposure in the &lt;a href="https://supabase.com/docs/guides/api/using-custom-schemas?queryGroups=language&language=curl#exposing-custom-schemas"&gt;Supabase API&lt;/a&gt;)
	 * @default false
	 */
	useCustomSchema?: boolean | Expression<boolean>;
	/**
	 * Name of database schema to use for table
	 * @default public
	 */
	schema?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	tableId: string | Expression<string>;
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
	filterType?: 'none' | 'manual' | 'string' | Expression<string>;
	matchType?: 'anyFilter' | 'allFilters' | Expression<string>;
	/**
	 * Filter to decide which rows get retrieved
	 * @default {}
	 */
	filters?: {
		conditions?: Array<{
			keyName?: string | Expression<string>;
			condition?:
				| 'eq'
				| 'fullText'
				| 'gt'
				| 'gte'
				| 'ilike'
				| 'is'
				| 'lt'
				| 'lte'
				| 'like'
				| 'neq'
				| Expression<string>;
			searchFunction?: 'fts' | 'plfts' | 'phfts' | 'wfts' | Expression<string>;
			keyValue?: string | Expression<string>;
		}>;
	};
	filterString?: string | Expression<string>;
};

/** Update a row */
export type SupabaseV1RowUpdateConfig = {
	resource: 'row';
	operation: 'update';
	/**
	 * Whether to use a database schema different from the default "public" schema (requires schema exposure in the &lt;a href="https://supabase.com/docs/guides/api/using-custom-schemas?queryGroups=language&language=curl#exposing-custom-schemas"&gt;Supabase API&lt;/a&gt;)
	 * @default false
	 */
	useCustomSchema?: boolean | Expression<boolean>;
	/**
	 * Name of database schema to use for table
	 * @default public
	 */
	schema?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	tableId: string | Expression<string>;
	filterType?: 'manual' | 'string' | Expression<string>;
	matchType?: 'anyFilter' | 'allFilters' | Expression<string>;
	/**
	 * Filter to decide which rows get updated
	 * @default {}
	 */
	filters?: {
		conditions?: Array<{
			keyName?: string | Expression<string>;
			condition?:
				| 'eq'
				| 'fullText'
				| 'gt'
				| 'gte'
				| 'ilike'
				| 'is'
				| 'lt'
				| 'lte'
				| 'like'
				| 'neq'
				| Expression<string>;
			searchFunction?: 'fts' | 'plfts' | 'phfts' | 'wfts' | Expression<string>;
			keyValue?: string | Expression<string>;
		}>;
	};
	filterString?: string | Expression<string>;
	dataToSend?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
	/**
	 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
	 */
	inputsToIgnore?: string | Expression<string>;
	fieldsUi?: {
		fieldValues?: Array<{
			fieldId?: string | Expression<string>;
			fieldValue?: string | Expression<string>;
		}>;
	};
};

export type SupabaseV1Params =
	| SupabaseV1RowCreateConfig
	| SupabaseV1RowDeleteConfig
	| SupabaseV1RowGetConfig
	| SupabaseV1RowGetAllConfig
	| SupabaseV1RowUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SupabaseV1Credentials {
	supabaseApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type SupabaseV1Node = {
	type: 'n8n-nodes-base.supabase';
	version: 1;
	config: NodeConfig<SupabaseV1Params>;
	credentials?: SupabaseV1Credentials;
};

export type SupabaseNode = SupabaseV1Node;
