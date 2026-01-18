/**
 * Microsoft Excel 365 Node - Version 2.2
 * Consume Microsoft Excel API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

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
 * @displayOptions.show { dataMode: ["raw"], resource: ["table"], operation: ["append"] }
 */
		data: IDataObject | string | Expression<string>;
	fieldsUi?: {
		values?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			column?: string | Expression<string>;
			/** Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
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
 * @displayOptions.show { selectRange: ["manual"], resource: ["table"], operation: ["addTable"] }
 */
		range?: string | Expression<string>;
/**
 * Whether the range has column labels. When this property set to false Excel will automatically generate header shifting the data down by one row.
 * @displayOptions.show { resource: ["table"], operation: ["addTable"] }
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
 * @displayOptions.show { resource: ["table"], operation: ["getColumns"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["table"], operation: ["getColumns"] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether the data should be returned RAW instead of parsed into keys according to their header
 * @displayOptions.show { resource: ["table"], operation: ["getColumns"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
/**
 * The name of the property into which to write the RAW data
 * @displayOptions.show { rawData: [true], resource: ["table"], operation: ["getColumns"] }
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
 * @displayOptions.show { resource: ["table"], operation: ["getRows"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["table"], operation: ["getRows"] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether the data should be returned RAW instead of parsed into keys according to their header
 * @displayOptions.show { resource: ["table"], operation: ["getRows"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
/**
 * The name of the property into which to write the RAW data
 * @displayOptions.show { rawData: [true], resource: ["table"], operation: ["getRows"] }
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
 * @displayOptions.show { resource: ["workbook"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["workbook"], operation: ["getAll"] }
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
 * @displayOptions.show { dataMode: ["raw"], resource: ["worksheet"], operation: ["append"] }
 */
		data: IDataObject | string | Expression<string>;
	fieldsUi?: {
		values?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			column?: string | Expression<string>;
			/** Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
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
 * @displayOptions.show { dataMode: ["autoMap", "define"], useRange: [true], resource: ["worksheet"], operation: ["upsert"] }
 */
		range?: string | Expression<string>;
	dataMode?: 'autoMap' | 'define' | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @hint Used to find the correct row to update. Doesn't get changed.
 * @displayOptions.show { dataMode: ["autoMap", "define"], resource: ["worksheet"], operation: ["upsert"] }
 */
		columnToMatchOn?: string | Expression<string>;
	valueToMatchOn?: string | Expression<string>;
	fieldsUi?: {
		values?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			column?: string | Expression<string>;
			/** Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
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
 * @displayOptions.show { useRange: [true], resource: ["worksheet"], operation: ["clear"] }
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
 * @displayOptions.show { resource: ["worksheet"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["worksheet"], operation: ["getAll"] }
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
 * @displayOptions.show { useRange: [true], resource: ["worksheet"], operation: ["readRows"] }
 */
		range?: string | Expression<string>;
/**
 * Relative to selected 'Range', first row index is 0
 * @hint Index of the row which contains the column names
 * @displayOptions.show { useRange: [true], resource: ["worksheet"], operation: ["readRows"] }
 * @default 0
 */
		keyRow?: number | Expression<number>;
/**
 * Relative to selected 'Range', first row index is 0
 * @hint Index of first row which contains the actual data
 * @displayOptions.show { useRange: [true], resource: ["worksheet"], operation: ["readRows"] }
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
 * @displayOptions.show { dataMode: ["autoMap", "define"], useRange: [true], resource: ["worksheet"], operation: ["update"] }
 */
		range?: string | Expression<string>;
	dataMode?: 'autoMap' | 'define' | 'raw' | Expression<string>;
/**
 * Raw values for the specified range as array of string arrays in JSON format. Should match the specified range: one array item for each row.
 * @displayOptions.show { dataMode: ["raw"], resource: ["worksheet"], operation: ["update"] }
 */
		data: IDataObject | string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @hint Used to find the correct row to update. Doesn't get changed.
 * @displayOptions.show { dataMode: ["autoMap", "define"], resource: ["worksheet"], operation: ["update"] }
 */
		columnToMatchOn?: string | Expression<string>;
	valueToMatchOn?: string | Expression<string>;
	fieldsUi?: {
		values?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			column?: string | Expression<string>;
			/** Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
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
	| MicrosoftExcelV22WorksheetUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftExcelV22Credentials {
	microsoftExcelOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MicrosoftExcelV22Node = {
	type: 'n8n-nodes-base.microsoftExcel';
	version: 2.2;
	config: NodeConfig<MicrosoftExcelV22Params>;
	credentials?: MicrosoftExcelV22Credentials;
};