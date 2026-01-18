/**
 * Google Sheets Node Types
 *
 * Read, update and write data to Google Sheets
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googlesheets/
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

/** Create a new sheet */
export type GoogleSheetsV47SpreadsheetCreateConfig = {
	resource: 'spreadsheet';
	operation: 'create';
	/**
	 * The title of the spreadsheet
	 */
	title?: string | Expression<string>;
	sheetsUi?: {
		sheetValues?: Array<{
			title?: string | Expression<string>;
			hidden?: boolean | Expression<boolean>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Delete a spreadsheet */
export type GoogleSheetsV47SpreadsheetDeleteSpreadsheetConfig = {
	resource: 'spreadsheet';
	operation: 'deleteSpreadsheet';
	documentId: ResourceLocatorValue;
};

/** Append a new row or update an existing one (upsert) */
export type GoogleSheetsV47SheetAppendOrUpdateConfig = {
	resource: 'sheet';
	operation: 'appendOrUpdate';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
	/**
	 * Whether to insert the input data this node receives in the new row
	 * @default defineBelow
	 */
	dataMode?: 'autoMapInputData' | 'defineBelow' | 'nothing' | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @hint Used to find the correct row to update. Doesn't get changed.
	 */
	columnToMatchOn?: string | Expression<string>;
	valueToMatchOn?: string | Expression<string>;
	fieldsUi?: {
		values?: Array<{
			column?: string | Expression<string>;
			columnName?: string | Expression<string>;
			fieldValue?: string | Expression<string>;
		}>;
	};
	columns: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create a new row in a sheet */
export type GoogleSheetsV47SheetAppendConfig = {
	resource: 'sheet';
	operation: 'append';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
	/**
	 * Whether to insert the input data this node receives in the new row
	 * @default defineBelow
	 */
	dataMode?: 'autoMapInputData' | 'defineBelow' | 'nothing' | Expression<string>;
	fieldsUi?: {
		fieldValues?: Array<{
			fieldId?: string | Expression<string>;
			fieldValue?: string | Expression<string>;
		}>;
	};
	columns: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete all the contents or a part of a sheet */
export type GoogleSheetsV47SheetClearConfig = {
	resource: 'sheet';
	operation: 'clear';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
	/**
	 * What to clear
	 * @default wholeSheet
	 */
	clear?: 'wholeSheet' | 'specificRows' | 'specificColumns' | 'specificRange' | Expression<string>;
	keepFirstRow?: boolean | Expression<boolean>;
	/**
	 * The row number to delete from, The first row is 1
	 * @default 1
	 */
	startIndex?: number | Expression<number>;
	rowsToDelete?: number | Expression<number>;
	columnsToDelete?: number | Expression<number>;
	/**
	 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
	 * @default A:F
	 */
	range: string | Expression<string>;
};

/** Create a new sheet */
export type GoogleSheetsV47SheetCreateConfig = {
	resource: 'sheet';
	operation: 'create';
	documentId: ResourceLocatorValue;
	/**
	 * The name of the sheet
	 * @default n8n-sheet
	 */
	title: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Permanently delete a sheet */
export type GoogleSheetsV47SheetRemoveConfig = {
	resource: 'sheet';
	operation: 'remove';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
};

/** Delete columns or rows from a sheet */
export type GoogleSheetsV47SheetDeleteConfig = {
	resource: 'sheet';
	operation: 'delete';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
	/**
	 * What to delete
	 * @default rows
	 */
	toDelete?: 'rows' | 'columns' | Expression<string>;
	/**
	 * The row number to delete from, The first row is 2
	 * @default 2
	 */
	startIndex?: number | Expression<number>;
	numberToDelete?: number | Expression<number>;
};

/** Retrieve one or more rows from a sheet */
export type GoogleSheetsV47SheetReadConfig = {
	resource: 'sheet';
	operation: 'read';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
	filtersUI?: {
		values?: Array<{
			lookupColumn?: string | Expression<string>;
			lookupValue?: string | Expression<string>;
		}>;
	};
	/**
	 * How to combine the conditions defined in "Filters": AND requires all conditions to be true, OR requires at least one condition to be true
	 * @default OR
	 */
	combineFilters?: 'AND' | 'OR' | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update an existing row in a sheet */
export type GoogleSheetsV47SheetUpdateConfig = {
	resource: 'sheet';
	operation: 'update';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
	/**
	 * Whether to insert the input data this node receives in the new row
	 * @default defineBelow
	 */
	dataMode?: 'autoMapInputData' | 'defineBelow' | 'nothing' | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @hint Used to find the correct row to update. Doesn't get changed.
	 */
	columnToMatchOn?: string | Expression<string>;
	valueToMatchOn?: string | Expression<string>;
	fieldsUi?: {
		values?: Array<{
			column?: string | Expression<string>;
			columnName?: string | Expression<string>;
			fieldValue?: string | Expression<string>;
		}>;
	};
	columns: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GoogleSheetsV47Params =
	| GoogleSheetsV47SpreadsheetCreateConfig
	| GoogleSheetsV47SpreadsheetDeleteSpreadsheetConfig
	| GoogleSheetsV47SheetAppendOrUpdateConfig
	| GoogleSheetsV47SheetAppendConfig
	| GoogleSheetsV47SheetClearConfig
	| GoogleSheetsV47SheetCreateConfig
	| GoogleSheetsV47SheetRemoveConfig
	| GoogleSheetsV47SheetDeleteConfig
	| GoogleSheetsV47SheetReadConfig
	| GoogleSheetsV47SheetUpdateConfig;

/** Create a new sheet */
export type GoogleSheetsV2SpreadsheetCreateConfig = {
	resource: 'spreadsheet';
	operation: 'create';
	/**
	 * The title of the spreadsheet
	 */
	title?: string | Expression<string>;
	sheetsUi?: { sheetValues?: Array<{ propertiesUi?: Record<string, unknown> }> };
	options?: Record<string, unknown>;
};

/** Append data to a sheet */
export type GoogleSheetsV2SheetAppendConfig = {
	resource: 'sheet';
	operation: 'append';
	/**
	 * The ID of the Google Spreadsheet. Found as part of the sheet URL https://docs.google.com/spreadsheets/d/{ID}/.
	 */
	sheetId: string | Expression<string>;
	/**
	 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
	 * @default A:F
	 */
	range: string | Expression<string>;
	/**
	 * Index of the first row which contains the actual data and not the keys. Starts with 0.
	 * @default 1
	 */
	dataStartRow?: number | Expression<number>;
	/**
	 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
	 * @default 0
	 */
	keyRow?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Clear data from a sheet */
export type GoogleSheetsV2SheetClearConfig = {
	resource: 'sheet';
	operation: 'clear';
	/**
	 * The ID of the Google Spreadsheet. Found as part of the sheet URL https://docs.google.com/spreadsheets/d/{ID}/.
	 */
	sheetId: string | Expression<string>;
	/**
	 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
	 * @default A:F
	 */
	range: string | Expression<string>;
	/**
	 * Index of the first row which contains the actual data and not the keys. Starts with 0.
	 * @default 1
	 */
	dataStartRow?: number | Expression<number>;
	/**
	 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
	 * @default 0
	 */
	keyRow?: number | Expression<number>;
};

/** Create a new sheet */
export type GoogleSheetsV2SheetCreateConfig = {
	resource: 'sheet';
	operation: 'create';
	/**
	 * The ID of the Google Spreadsheet. Found as part of the sheet URL https://docs.google.com/spreadsheets/d/{ID}/.
	 */
	sheetId: string | Expression<string>;
	/**
	 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
	 * @default A:F
	 */
	range: string | Expression<string>;
	/**
	 * Index of the first row which contains the actual data and not the keys. Starts with 0.
	 * @default 1
	 */
	dataStartRow?: number | Expression<number>;
	/**
	 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
	 * @default 0
	 */
	keyRow?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Create a new record, or update the current one if it already exists (upsert) */
export type GoogleSheetsV2SheetUpsertConfig = {
	resource: 'sheet';
	operation: 'upsert';
	/**
	 * The ID of the Google Spreadsheet. Found as part of the sheet URL https://docs.google.com/spreadsheets/d/{ID}/.
	 */
	sheetId: string | Expression<string>;
	/**
	 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
	 * @default A:F
	 */
	range: string | Expression<string>;
	/**
	 * Whether the data supplied is RAW instead of parsed into keys
	 * @default false
	 */
	rawData?: boolean | Expression<boolean>;
	/**
	 * The name of the property from which to read the RAW data
	 * @default data
	 */
	dataProperty?: string | Expression<string>;
	/**
	 * Index of the first row which contains the actual data and not the keys. Starts with 0.
	 * @default 1
	 */
	dataStartRow?: number | Expression<number>;
	/**
	 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
	 * @default 0
	 */
	keyRow?: number | Expression<number>;
	/**
	 * The name of the key to identify which data should be updated in the sheet
	 * @default id
	 */
	key?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete columns and rows from a sheet */
export type GoogleSheetsV2SheetDeleteConfig = {
	resource: 'sheet';
	operation: 'delete';
	/**
	 * The ID of the Google Spreadsheet. Found as part of the sheet URL https://docs.google.com/spreadsheets/d/{ID}/.
	 */
	sheetId: string | Expression<string>;
	/**
	 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
	 * @default A:F
	 */
	range: string | Expression<string>;
	/**
	 * Deletes columns and rows from a sheet
	 * @default {}
	 */
	toDelete?: {
		columns?: Array<{
			sheetId?: string | Expression<string>;
			startIndex?: number | Expression<number>;
			amount?: number | Expression<number>;
		}>;
		rows?: Array<{
			sheetId?: string | Expression<string>;
			startIndex?: number | Expression<number>;
			amount?: number | Expression<number>;
		}>;
	};
	/**
	 * Index of the first row which contains the actual data and not the keys. Starts with 0.
	 * @default 1
	 */
	dataStartRow?: number | Expression<number>;
	/**
	 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
	 * @default 0
	 */
	keyRow?: number | Expression<number>;
};

/** Look up a specific column value and return the matching row */
export type GoogleSheetsV2SheetLookupConfig = {
	resource: 'sheet';
	operation: 'lookup';
	/**
	 * The ID of the Google Spreadsheet. Found as part of the sheet URL https://docs.google.com/spreadsheets/d/{ID}/.
	 */
	sheetId: string | Expression<string>;
	/**
	 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
	 * @default A:F
	 */
	range: string | Expression<string>;
	/**
	 * Index of the first row which contains the actual data and not the keys. Starts with 0.
	 * @default 1
	 */
	dataStartRow?: number | Expression<number>;
	/**
	 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
	 * @default 0
	 */
	keyRow?: number | Expression<number>;
	/**
	 * The name of the column in which to look for value
	 */
	lookupColumn: string | Expression<string>;
	/**
	 * The value to look for in column
	 */
	lookupValue?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Read data from a sheet */
export type GoogleSheetsV2SheetReadConfig = {
	resource: 'sheet';
	operation: 'read';
	/**
	 * The ID of the Google Spreadsheet. Found as part of the sheet URL https://docs.google.com/spreadsheets/d/{ID}/.
	 */
	sheetId: string | Expression<string>;
	/**
	 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
	 * @default A:F
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
	 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
	 * @default 0
	 */
	keyRow?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Remove a sheet */
export type GoogleSheetsV2SheetRemoveConfig = {
	resource: 'sheet';
	operation: 'remove';
	/**
	 * The ID of the Google Spreadsheet. Found as part of the sheet URL https://docs.google.com/spreadsheets/d/{ID}/.
	 */
	sheetId: string | Expression<string>;
	/**
	 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
	 * @default A:F
	 */
	range: string | Expression<string>;
	/**
	 * Index of the first row which contains the actual data and not the keys. Starts with 0.
	 * @default 1
	 */
	dataStartRow?: number | Expression<number>;
	/**
	 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
	 * @default 0
	 */
	keyRow?: number | Expression<number>;
	/**
	 * The ID of the sheet to delete
	 */
	id: string | Expression<string>;
};

/** Update rows in a sheet */
export type GoogleSheetsV2SheetUpdateConfig = {
	resource: 'sheet';
	operation: 'update';
	/**
	 * The ID of the Google Spreadsheet. Found as part of the sheet URL https://docs.google.com/spreadsheets/d/{ID}/.
	 */
	sheetId: string | Expression<string>;
	/**
	 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
	 * @default A:F
	 */
	range: string | Expression<string>;
	/**
	 * Whether the data supplied is RAW instead of parsed into keys
	 * @default false
	 */
	rawData?: boolean | Expression<boolean>;
	/**
	 * The name of the property from which to read the RAW data
	 * @default data
	 */
	dataProperty?: string | Expression<string>;
	/**
	 * Index of the first row which contains the actual data and not the keys. Starts with 0.
	 * @default 1
	 */
	dataStartRow?: number | Expression<number>;
	/**
	 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
	 * @default 0
	 */
	keyRow?: number | Expression<number>;
	/**
	 * The name of the key to identify which data should be updated in the sheet
	 * @default id
	 */
	key?: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GoogleSheetsV2Params =
	| GoogleSheetsV2SpreadsheetCreateConfig
	| GoogleSheetsV2SheetAppendConfig
	| GoogleSheetsV2SheetClearConfig
	| GoogleSheetsV2SheetCreateConfig
	| GoogleSheetsV2SheetUpsertConfig
	| GoogleSheetsV2SheetDeleteConfig
	| GoogleSheetsV2SheetLookupConfig
	| GoogleSheetsV2SheetReadConfig
	| GoogleSheetsV2SheetRemoveConfig
	| GoogleSheetsV2SheetUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleSheetsV47Credentials {
	googleApi: CredentialReference;
	googleSheetsOAuth2Api: CredentialReference;
}

export interface GoogleSheetsV2Credentials {
	googleApi: CredentialReference;
	googleSheetsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GoogleSheetsV47Node = {
	type: 'n8n-nodes-base.googleSheets';
	version: 3 | 4 | 4.1 | 4.2 | 4.3 | 4.4 | 4.5 | 4.6 | 4.7;
	config: NodeConfig<GoogleSheetsV47Params>;
	credentials?: GoogleSheetsV47Credentials;
};

export type GoogleSheetsV2Node = {
	type: 'n8n-nodes-base.googleSheets';
	version: 1 | 2;
	config: NodeConfig<GoogleSheetsV2Params>;
	credentials?: GoogleSheetsV2Credentials;
};

export type GoogleSheetsNode = GoogleSheetsV47Node | GoogleSheetsV2Node;
