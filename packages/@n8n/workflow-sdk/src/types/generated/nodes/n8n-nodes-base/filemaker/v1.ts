/**
 * FileMaker Node - Version 1
 * Retrieve data from the FileMaker data API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FilemakerV1Params {
	action?: 'create' | 'delete' | 'duplicate' | 'edit' | 'find' | 'records' | 'record' | 'performscript' | Expression<string>;
/**
 * FileMaker Layout Name. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		layout: string | Expression<string>;
/**
 * Internal Record ID returned by get (recordid)
 * @displayOptions.show { action: ["record", "edit", "delete", "duplicate"] }
 */
		recid: number | Expression<number>;
/**
 * The record number of the first record in the range of records
 * @displayOptions.show { action: ["find", "records"] }
 * @default 1
 */
		offset?: number | Expression<number>;
/**
 * Max number of results to return
 * @displayOptions.show { action: ["find", "records"] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to get portal data as well
 * @displayOptions.show { action: ["record", "records", "find"] }
 * @default false
 */
		getPortals?: boolean | Expression<boolean>;
/**
 * The portal result set to return. Use the portal object name or portal table name. If this parameter is omitted, the API will return all portal objects and records in the layout. For best performance, pass the portal object name or portal table name. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { action: ["record", "records", "find"], getPortals: [true] }
 * @default []
 */
		portals?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { action: ["find"] }
 */
		responseLayout?: string | Expression<string>;
	queries?: {
		query?: Array<{
			/** Field Name
			 * @default {}
			 */
			fields?: {
		field?: Array<{
			/** Search Field. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			name?: string | Expression<string>;
			/** Value to search
			 */
			value?: string | Expression<string>;
		}>;
	};
			/** Omit
			 * @default false
			 */
			omit?: boolean | Expression<boolean>;
		}>;
	};
/**
 * Whether to sort data
 * @displayOptions.show { action: ["find", "record", "records"] }
 * @default false
 */
		setSort?: boolean | Expression<boolean>;
/**
 * Sort rules
 * @displayOptions.show { setSort: [true], action: ["find", "records"] }
 * @default {}
 */
		sortParametersUi?: {
		rules?: Array<{
			/** Field Name. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			name?: string | Expression<string>;
			/** Sort order
			 * @default ascend
			 */
			value?: 'ascend' | 'descend' | Expression<string>;
		}>;
	};
/**
 * Whether to define a script to be run before the action specified by the API call and after the subsequent sort
 * @displayOptions.show { action: ["find", "record", "records"] }
 * @default false
 */
		setScriptBefore?: boolean | Expression<boolean>;
/**
 * The name of the FileMaker script to be run after the action specified by the API call and after the subsequent sort. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { action: ["find", "record", "records"], setScriptBefore: [true] }
 */
		scriptBefore: string | Expression<string>;
/**
 * A parameter for the FileMaker script
 * @displayOptions.show { action: ["find", "record", "records"], setScriptBefore: [true] }
 */
		scriptBeforeParam?: string | Expression<string>;
/**
 * Whether to define a script to be run after the action specified by the API call but before the subsequent sort
 * @displayOptions.show { action: ["find", "record", "records"] }
 * @default false
 */
		setScriptSort?: boolean | Expression<boolean>;
/**
 * The name of the FileMaker script to be run after the action specified by the API call but before the subsequent sort. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { action: ["find", "record", "records"], setScriptSort: [true] }
 */
		scriptSort: string | Expression<string>;
/**
 * A parameter for the FileMaker script
 * @displayOptions.show { action: ["find", "record", "records"], setScriptSort: [true] }
 */
		scriptSortParam?: string | Expression<string>;
/**
 * Whether to define a script to be run after the action specified by the API call but before the subsequent sort
 * @displayOptions.show { action: ["find", "record", "records"] }
 * @default false
 */
		setScriptAfter?: boolean | Expression<boolean>;
/**
 * The name of the FileMaker script to be run after the action specified by the API call and after the subsequent sort. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { action: ["find", "record", "records"], setScriptAfter: [true] }
 */
		scriptAfter: string | Expression<string>;
/**
 * A parameter for the FileMaker script
 * @displayOptions.show { action: ["find", "record", "records"], setScriptAfter: [true] }
 */
		scriptAfterParam?: string | Expression<string>;
/**
 * The last modification ID. When you use modId, a record is edited only when the modId matches.
 * @displayOptions.show { action: ["edit"] }
 */
		modId?: number | Expression<number>;
/**
 * Fields to define
 * @displayOptions.show { action: ["create", "edit"] }
 * @default {}
 */
		fieldsParametersUi?: {
		fields?: Array<{
			/** Field Name. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			name?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
/**
 * The name of the FileMaker script to be run. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { action: ["performscript"] }
 */
		script: string | Expression<string>;
/**
 * A parameter for the FileMaker script
 * @displayOptions.show { action: ["performscript"] }
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

interface FilemakerV1NodeBase {
	type: 'n8n-nodes-base.filemaker';
	version: 1;
	credentials?: FilemakerV1Credentials;
}

export type FilemakerV1ParamsNode = FilemakerV1NodeBase & {
	config: NodeConfig<FilemakerV1Params>;
};

export type FilemakerV1Node = FilemakerV1ParamsNode;