/**
 * FileMaker Node Types
 *
 * Retrieve data from the FileMaker data API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/filemaker/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FilemakerV1Params {
	action?:
		| 'create'
		| 'delete'
		| 'duplicate'
		| 'edit'
		| 'find'
		| 'records'
		| 'record'
		| 'performscript'
		| Expression<string>;
	/**
	 * FileMaker Layout Name. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	layout: string | Expression<string>;
	/**
	 * Internal Record ID returned by get (recordid)
	 */
	recid: number | Expression<number>;
	/**
	 * The record number of the first record in the range of records
	 * @default 1
	 */
	offset?: number | Expression<number>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to get portal data as well
	 * @default false
	 */
	getPortals?: boolean | Expression<boolean>;
	/**
	 * The portal result set to return. Use the portal object name or portal table name. If this parameter is omitted, the API will return all portal objects and records in the layout. For best performance, pass the portal object name or portal table name. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	portals?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	responseLayout?: string | Expression<string>;
	queries?: {
		query?: Array<{
			fields?: {
				field?: Array<{ name?: string | Expression<string>; value?: string | Expression<string> }>;
			};
			omit?: boolean | Expression<boolean>;
		}>;
	};
	/**
	 * Whether to sort data
	 * @default false
	 */
	setSort?: boolean | Expression<boolean>;
	/**
	 * Sort rules
	 * @default {}
	 */
	sortParametersUi?: {
		rules?: Array<{
			name?: string | Expression<string>;
			value?: 'ascend' | 'descend' | Expression<string>;
		}>;
	};
	/**
	 * Whether to define a script to be run before the action specified by the API call and after the subsequent sort
	 * @default false
	 */
	setScriptBefore?: boolean | Expression<boolean>;
	/**
	 * The name of the FileMaker script to be run after the action specified by the API call and after the subsequent sort. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	scriptBefore: string | Expression<string>;
	/**
	 * A parameter for the FileMaker script
	 */
	scriptBeforeParam?: string | Expression<string>;
	/**
	 * Whether to define a script to be run after the action specified by the API call but before the subsequent sort
	 * @default false
	 */
	setScriptSort?: boolean | Expression<boolean>;
	/**
	 * The name of the FileMaker script to be run after the action specified by the API call but before the subsequent sort. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	scriptSort: string | Expression<string>;
	/**
	 * A parameter for the FileMaker script
	 */
	scriptSortParam?: string | Expression<string>;
	/**
	 * Whether to define a script to be run after the action specified by the API call but before the subsequent sort
	 * @default false
	 */
	setScriptAfter?: boolean | Expression<boolean>;
	/**
	 * The name of the FileMaker script to be run after the action specified by the API call and after the subsequent sort. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	scriptAfter: string | Expression<string>;
	/**
	 * A parameter for the FileMaker script
	 */
	scriptAfterParam?: string | Expression<string>;
	/**
	 * The last modification ID. When you use modId, a record is edited only when the modId matches.
	 */
	modId?: number | Expression<number>;
	/**
	 * Fields to define
	 * @default {}
	 */
	fieldsParametersUi?: {
		fields?: Array<{ name?: string | Expression<string>; value?: string | Expression<string> }>;
	};
	/**
	 * The name of the FileMaker script to be run. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	script: string | Expression<string>;
	/**
	 * A parameter for the FileMaker script
	 */
	scriptParam?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface FilemakerV1Credentials {
	fileMaker: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type FilemakerV1Node = {
	type: 'n8n-nodes-base.filemaker';
	version: 1;
	config: NodeConfig<FilemakerV1Params>;
	credentials?: FilemakerV1Credentials;
};

export type FilemakerNode = FilemakerV1Node;
