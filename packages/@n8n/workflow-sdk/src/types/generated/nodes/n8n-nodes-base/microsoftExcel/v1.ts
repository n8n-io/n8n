/**
 * Microsoft Excel Node - Version 1
 * Consume Microsoft Excel API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Represents an Excel table */
export type MicrosoftExcelV1TableAddRowConfig = {
	resource: 'table';
	operation: 'addRow';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["addRow"], resource: ["table"] }
 */
		workbook?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["addRow"], resource: ["table"] }
 */
		worksheet: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["addRow"], resource: ["table"] }
 */
		table: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Represents an Excel table */
export type MicrosoftExcelV1TableGetColumnsConfig = {
	resource: 'table';
	operation: 'getColumns';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getColumns"], resource: ["table"] }
 */
		workbook?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getColumns"], resource: ["table"] }
 */
		worksheet: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getColumns"], resource: ["table"] }
 */
		table: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getColumns"], resource: ["table"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getColumns"], resource: ["table"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether the data should be returned RAW instead of parsed into keys according to their header
 * @displayOptions.show { operation: ["getColumns"], resource: ["table"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
/**
 * The name of the property into which to write the RAW data
 * @displayOptions.show { operation: ["getColumns"], resource: ["table"], rawData: [true] }
 * @default data
 */
		dataProperty?: string | Expression<string>;
	filters?: Record<string, unknown>;
};

/** Represents an Excel table */
export type MicrosoftExcelV1TableGetRowsConfig = {
	resource: 'table';
	operation: 'getRows';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getRows"], resource: ["table"] }
 */
		workbook?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getRows"], resource: ["table"] }
 */
		worksheet: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getRows"], resource: ["table"] }
 */
		table: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getRows"], resource: ["table"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getRows"], resource: ["table"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether the data should be returned RAW instead of parsed into keys according to their header
 * @displayOptions.show { operation: ["getRows"], resource: ["table"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
/**
 * The name of the property into which to write the RAW data
 * @displayOptions.show { operation: ["getRows"], resource: ["table"], rawData: [true] }
 * @default data
 */
		dataProperty?: string | Expression<string>;
	filters?: Record<string, unknown>;
};

/** Represents an Excel table */
export type MicrosoftExcelV1TableLookupConfig = {
	resource: 'table';
	operation: 'lookup';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["lookup"], resource: ["table"] }
 */
		workbook: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["lookup"], resource: ["table"] }
 */
		worksheet: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["lookup"], resource: ["table"] }
 */
		table: string | Expression<string>;
/**
 * The name of the column in which to look for value
 * @displayOptions.show { resource: ["table"], operation: ["lookup"] }
 */
		lookupColumn: string | Expression<string>;
/**
 * The value to look for in column
 * @displayOptions.show { resource: ["table"], operation: ["lookup"] }
 */
		lookupValue: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Workbook is the top level object which contains related workbook objects such as worksheets, tables, ranges, etc */
export type MicrosoftExcelV1WorkbookAddWorksheetConfig = {
	resource: 'workbook';
	operation: 'addWorksheet';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["addWorksheet"], resource: ["workbook"] }
 */
		workbook: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Workbook is the top level object which contains related workbook objects such as worksheets, tables, ranges, etc */
export type MicrosoftExcelV1WorkbookGetAllConfig = {
	resource: 'workbook';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["workbook"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["workbook"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** An Excel worksheet is a grid of cells. It can contain data, tables, charts, etc. */
export type MicrosoftExcelV1WorksheetGetAllConfig = {
	resource: 'worksheet';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getAll"], resource: ["worksheet"] }
 */
		workbook?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["worksheet"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["worksheet"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** An Excel worksheet is a grid of cells. It can contain data, tables, charts, etc. */
export type MicrosoftExcelV1WorksheetGetContentConfig = {
	resource: 'worksheet';
	operation: 'getContent';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getContent"], resource: ["worksheet"] }
 */
		workbook: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getContent"], resource: ["worksheet"] }
 */
		worksheet: string | Expression<string>;
/**
 * The address or the name of the range. If not specified, the entire worksheet range is returned.
 * @displayOptions.show { operation: ["getContent"], resource: ["worksheet"] }
 * @default A1:C3
 */
		range: string | Expression<string>;
/**
 * Whether the data should be returned RAW instead of parsed into keys according to their header
 * @displayOptions.show { operation: ["getContent"], resource: ["worksheet"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
/**
 * The name of the property into which to write the RAW data
 * @displayOptions.show { operation: ["getContent"], resource: ["worksheet"], rawData: [true] }
 * @default data
 */
		dataProperty?: string | Expression<string>;
/**
 * Index of the first row which contains the actual data and not the keys. Starts with 0.
 * @displayOptions.show { operation: ["getContent"], resource: ["worksheet"] }
 * @displayOptions.hide { rawData: [true] }
 * @default 1
 */
		dataStartRow?: number | Expression<number>;
/**
 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitve.
 * @displayOptions.show { operation: ["getContent"], resource: ["worksheet"] }
 * @displayOptions.hide { rawData: [true] }
 * @default 0
 */
		keyRow?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type MicrosoftExcelV1Params =
	| MicrosoftExcelV1TableAddRowConfig
	| MicrosoftExcelV1TableGetColumnsConfig
	| MicrosoftExcelV1TableGetRowsConfig
	| MicrosoftExcelV1TableLookupConfig
	| MicrosoftExcelV1WorkbookAddWorksheetConfig
	| MicrosoftExcelV1WorkbookGetAllConfig
	| MicrosoftExcelV1WorksheetGetAllConfig
	| MicrosoftExcelV1WorksheetGetContentConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftExcelV1Credentials {
	microsoftExcelOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MicrosoftExcelV1Node = {
	type: 'n8n-nodes-base.microsoftExcel';
	version: 1;
	config: NodeConfig<MicrosoftExcelV1Params>;
	credentials?: MicrosoftExcelV1Credentials;
};