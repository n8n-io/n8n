/**
 * Microsoft Excel 365 Node Types
 *
 * Consume Microsoft Excel API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/microsoftexcel/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Represents an Excel table */
export type MicrosoftExcelV22TableAppendConfig = {
	resource: 'table';
	operation: 'append';
	workbook: ResourceLocatorValue;
	worksheet: ResourceLocatorValue;
	table: ResourceLocatorValue;
	dataMode?: 'autoMap' | 'define' | 'raw' | Expression<string>;
	/**
	 * Raw values for the specified range as array of string arrays in JSON format
	 */
	data: IDataObject | string | Expression<string>;
	fieldsUi?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Represents an Excel table */
export type MicrosoftExcelV22TableConvertToRangeConfig = {
	resource: 'table';
	operation: 'convertToRange';
	workbook: ResourceLocatorValue;
	worksheet: ResourceLocatorValue;
	table: ResourceLocatorValue;
};

/** Represents an Excel table */
export type MicrosoftExcelV22TableAddTableConfig = {
	resource: 'table';
	operation: 'addTable';
	workbook: ResourceLocatorValue;
	worksheet: ResourceLocatorValue;
	selectRange?: 'auto' | 'manual' | Expression<string>;
	/**
	 * The range of cells that will be converted to a table
	 */
	range?: string | Expression<string>;
	/**
	 * Whether the range has column labels. When this property set to false Excel will automatically generate header shifting the data down by one row.
	 * @default true
	 */
	hasHeaders?: boolean | Expression<boolean>;
};

/** Represents an Excel table */
export type MicrosoftExcelV22TableDeleteTableConfig = {
	resource: 'table';
	operation: 'deleteTable';
	workbook: ResourceLocatorValue;
	worksheet: ResourceLocatorValue;
	table: ResourceLocatorValue;
};

/** Represents an Excel table */
export type MicrosoftExcelV22TableGetColumnsConfig = {
	resource: 'table';
	operation: 'getColumns';
	workbook: ResourceLocatorValue;
	worksheet: ResourceLocatorValue;
	table: ResourceLocatorValue;
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
	/**
	 * Whether the data should be returned RAW instead of parsed into keys according to their header
	 * @default false
	 */
	rawData?: boolean | Expression<boolean>;
	/**
	 * The name of the property into which to write the RAW data
	 * @default data
	 */
	dataProperty?: string | Expression<string>;
	filters?: Record<string, unknown>;
};

/** Represents an Excel table */
export type MicrosoftExcelV22TableGetRowsConfig = {
	resource: 'table';
	operation: 'getRows';
	workbook: ResourceLocatorValue;
	worksheet: ResourceLocatorValue;
	table: ResourceLocatorValue;
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
	/**
	 * Whether the data should be returned RAW instead of parsed into keys according to their header
	 * @default false
	 */
	rawData?: boolean | Expression<boolean>;
	/**
	 * The name of the property into which to write the RAW data
	 * @default data
	 */
	dataProperty?: string | Expression<string>;
	filters?: Record<string, unknown>;
};

/** Represents an Excel table */
export type MicrosoftExcelV22TableLookupConfig = {
	resource: 'table';
	operation: 'lookup';
	workbook: ResourceLocatorValue;
	worksheet: ResourceLocatorValue;
	table: ResourceLocatorValue;
	/**
	 * The name of the column in which to look for value
	 */
	lookupColumn: string | Expression<string>;
	/**
	 * The value to look for in column
	 */
	lookupValue: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** A workbook is the top level object which contains one or more worksheets */
export type MicrosoftExcelV22WorkbookAddWorksheetConfig = {
	resource: 'workbook';
	operation: 'addWorksheet';
	workbook: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
};

/** A workbook is the top level object which contains one or more worksheets */
export type MicrosoftExcelV22WorkbookDeleteWorkbookConfig = {
	resource: 'workbook';
	operation: 'deleteWorkbook';
	workbook: ResourceLocatorValue;
};

/** A workbook is the top level object which contains one or more worksheets */
export type MicrosoftExcelV22WorkbookGetAllConfig = {
	resource: 'workbook';
	operation: 'getAll';
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
	filters?: Record<string, unknown>;
};

/** A sheet is a grid of cells which can contain data, tables, charts, etc */
export type MicrosoftExcelV22WorksheetAppendConfig = {
	resource: 'worksheet';
	operation: 'append';
	workbook: ResourceLocatorValue;
	worksheet: ResourceLocatorValue;
	dataMode?: 'autoMap' | 'define' | 'raw' | Expression<string>;
	/**
	 * Raw values for the specified range as array of string arrays in JSON format
	 */
	data: IDataObject | string | Expression<string>;
	fieldsUi?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** A sheet is a grid of cells which can contain data, tables, charts, etc */
export type MicrosoftExcelV22WorksheetUpsertConfig = {
	resource: 'worksheet';
	operation: 'upsert';
	workbook: ResourceLocatorValue;
	worksheet: ResourceLocatorValue;
	useRange?: boolean | Expression<boolean>;
	/**
	 * The sheet range to read the data from specified using a A1-style notation, has to be specific e.g A1:B5, generic ranges like A:B are not supported. Leave blank to use whole used range in the sheet.
	 * @hint First row must contain column names
	 */
	range?: string | Expression<string>;
	dataMode?: 'autoMap' | 'define' | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @hint Used to find the correct row to update. Doesn't get changed.
	 */
	columnToMatchOn?: string | Expression<string>;
	valueToMatchOn?: string | Expression<string>;
	fieldsUi?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** A sheet is a grid of cells which can contain data, tables, charts, etc */
export type MicrosoftExcelV22WorksheetClearConfig = {
	resource: 'worksheet';
	operation: 'clear';
	workbook: ResourceLocatorValue;
	worksheet: ResourceLocatorValue;
	applyTo?: 'All' | 'Formats' | 'Contents' | Expression<string>;
	useRange?: boolean | Expression<boolean>;
	/**
	 * The sheet range that would be cleared, specified using a A1-style notation
	 * @hint Leave blank for entire worksheet
	 */
	range?: string | Expression<string>;
};

/** A sheet is a grid of cells which can contain data, tables, charts, etc */
export type MicrosoftExcelV22WorksheetDeleteWorksheetConfig = {
	resource: 'worksheet';
	operation: 'deleteWorksheet';
	workbook: ResourceLocatorValue;
	worksheet: ResourceLocatorValue;
};

/** A sheet is a grid of cells which can contain data, tables, charts, etc */
export type MicrosoftExcelV22WorksheetGetAllConfig = {
	resource: 'worksheet';
	operation: 'getAll';
	workbook: ResourceLocatorValue;
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
	filters?: Record<string, unknown>;
};

/** A sheet is a grid of cells which can contain data, tables, charts, etc */
export type MicrosoftExcelV22WorksheetReadRowsConfig = {
	resource: 'worksheet';
	operation: 'readRows';
	workbook: ResourceLocatorValue;
	worksheet: ResourceLocatorValue;
	useRange?: boolean | Expression<boolean>;
	/**
	 * The sheet range to read the data from specified using a A1-style notation, has to be specific e.g A1:B5, generic ranges like A:B are not supported
	 * @hint Leave blank to return entire sheet
	 */
	range?: string | Expression<string>;
	/**
	 * Relative to selected 'Range', first row index is 0
	 * @hint Index of the row which contains the column names
	 * @default 0
	 */
	keyRow?: number | Expression<number>;
	/**
	 * Relative to selected 'Range', first row index is 0
	 * @hint Index of first row which contains the actual data
	 * @default 1
	 */
	dataStartRow?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** A sheet is a grid of cells which can contain data, tables, charts, etc */
export type MicrosoftExcelV22WorksheetUpdateConfig = {
	resource: 'worksheet';
	operation: 'update';
	workbook: ResourceLocatorValue;
	worksheet: ResourceLocatorValue;
	useRange?: boolean | Expression<boolean>;
	/**
	 * The sheet range to read the data from specified using a A1-style notation, has to be specific e.g A1:B5, generic ranges like A:B are not supported. Leave blank to use whole used range in the sheet.
	 * @hint First row must contain column names
	 */
	range?: string | Expression<string>;
	dataMode?: 'autoMap' | 'define' | 'raw' | Expression<string>;
	/**
	 * Raw values for the specified range as array of string arrays in JSON format. Should match the specified range: one array item for each row.
	 */
	data: IDataObject | string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @hint Used to find the correct row to update. Doesn't get changed.
	 */
	columnToMatchOn?: string | Expression<string>;
	valueToMatchOn?: string | Expression<string>;
	fieldsUi?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type MicrosoftExcelV22Params =
	| MicrosoftExcelV22TableAppendConfig
	| MicrosoftExcelV22TableConvertToRangeConfig
	| MicrosoftExcelV22TableAddTableConfig
	| MicrosoftExcelV22TableDeleteTableConfig
	| MicrosoftExcelV22TableGetColumnsConfig
	| MicrosoftExcelV22TableGetRowsConfig
	| MicrosoftExcelV22TableLookupConfig
	| MicrosoftExcelV22WorkbookAddWorksheetConfig
	| MicrosoftExcelV22WorkbookDeleteWorkbookConfig
	| MicrosoftExcelV22WorkbookGetAllConfig
	| MicrosoftExcelV22WorksheetAppendConfig
	| MicrosoftExcelV22WorksheetUpsertConfig
	| MicrosoftExcelV22WorksheetClearConfig
	| MicrosoftExcelV22WorksheetDeleteWorksheetConfig
	| MicrosoftExcelV22WorksheetGetAllConfig
	| MicrosoftExcelV22WorksheetReadRowsConfig
	| MicrosoftExcelV22WorksheetUpdateConfig;

/** Represents an Excel table */
export type MicrosoftExcelV1TableAddRowConfig = {
	resource: 'table';
	operation: 'addRow';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	workbook?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	worksheet: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	workbook?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	worksheet: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	table: string | Expression<string>;
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
	/**
	 * Whether the data should be returned RAW instead of parsed into keys according to their header
	 * @default false
	 */
	rawData?: boolean | Expression<boolean>;
	/**
	 * The name of the property into which to write the RAW data
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
	 */
	workbook?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	worksheet: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	table: string | Expression<string>;
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
	/**
	 * Whether the data should be returned RAW instead of parsed into keys according to their header
	 * @default false
	 */
	rawData?: boolean | Expression<boolean>;
	/**
	 * The name of the property into which to write the RAW data
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
	 */
	workbook: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	worksheet: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	table: string | Expression<string>;
	/**
	 * The name of the column in which to look for value
	 */
	lookupColumn: string | Expression<string>;
	/**
	 * The value to look for in column
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	workbook?: string | Expression<string>;
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
	filters?: Record<string, unknown>;
};

/** An Excel worksheet is a grid of cells. It can contain data, tables, charts, etc. */
export type MicrosoftExcelV1WorksheetGetContentConfig = {
	resource: 'worksheet';
	operation: 'getContent';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	workbook: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	worksheet: string | Expression<string>;
	/**
	 * The address or the name of the range. If not specified, the entire worksheet range is returned.
	 * @default A1:C3
	 */
	range: string | Expression<string>;
	/**
	 * Whether the data should be returned RAW instead of parsed into keys according to their header
	 * @default false
	 */
	rawData?: boolean | Expression<boolean>;
	/**
	 * The name of the property into which to write the RAW data
	 * @default data
	 */
	dataProperty?: string | Expression<string>;
	/**
	 * Index of the first row which contains the actual data and not the keys. Starts with 0.
	 * @default 1
	 */
	dataStartRow?: number | Expression<number>;
	/**
	 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitve.
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
	| MicrosoftExcelV1WorksheetGetContentConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftExcelV22Credentials {
	microsoftExcelOAuth2Api: CredentialReference;
}

export interface MicrosoftExcelV1Credentials {
	microsoftExcelOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MicrosoftExcelV22Node = {
	type: 'n8n-nodes-base.microsoftExcel';
	version: 2 | 2.1 | 2.2;
	config: NodeConfig<MicrosoftExcelV22Params>;
	credentials?: MicrosoftExcelV22Credentials;
};

export type MicrosoftExcelV1Node = {
	type: 'n8n-nodes-base.microsoftExcel';
	version: 1;
	config: NodeConfig<MicrosoftExcelV1Params>;
	credentials?: MicrosoftExcelV1Credentials;
};

export type MicrosoftExcelNode = MicrosoftExcelV22Node | MicrosoftExcelV1Node;
