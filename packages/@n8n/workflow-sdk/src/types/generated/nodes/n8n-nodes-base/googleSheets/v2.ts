/**
 * Google Sheets  Node - Version 2
 * Read, update and write data to Google Sheets
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new sheet */
export type GoogleSheetsV2SpreadsheetCreateConfig = {
	resource: 'spreadsheet';
	operation: 'create';
/**
 * The title of the spreadsheet
 * @displayOptions.show { resource: ["spreadsheet"], operation: ["create"] }
 */
		title?: string | Expression<string>;
	sheetsUi?: {
		sheetValues?: Array<{
			/** Sheet Properties
			 * @default {}
			 */
			propertiesUi?: Record<string, unknown>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Append data to a sheet */
export type GoogleSheetsV2SheetAppendConfig = {
	resource: 'sheet';
	operation: 'append';
/**
 * The ID of the Google Spreadsheet. Found as part of the sheet URL https://docs.google.com/spreadsheets/d/{ID}/.
 * @displayOptions.show { resource: ["sheet"] }
 */
		sheetId: string | Expression<string>;
/**
 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["create", "delete", "remove"] }
 * @default A:F
 */
		range: string | Expression<string>;
/**
 * Index of the first row which contains the actual data and not the keys. Starts with 0.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["append", "create", "clear", "delete", "remove"], rawData: [true] }
 * @default 1
 */
		dataStartRow?: number | Expression<number>;
/**
 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["clear", "create", "delete", "remove"], rawData: [true] }
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
 * @displayOptions.show { resource: ["sheet"] }
 */
		sheetId: string | Expression<string>;
/**
 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["create", "delete", "remove"] }
 * @default A:F
 */
		range: string | Expression<string>;
/**
 * Index of the first row which contains the actual data and not the keys. Starts with 0.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["append", "create", "clear", "delete", "remove"], rawData: [true] }
 * @default 1
 */
		dataStartRow?: number | Expression<number>;
/**
 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["clear", "create", "delete", "remove"], rawData: [true] }
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
 * @displayOptions.show { resource: ["sheet"] }
 */
		sheetId: string | Expression<string>;
/**
 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["create", "delete", "remove"] }
 * @default A:F
 */
		range: string | Expression<string>;
/**
 * Index of the first row which contains the actual data and not the keys. Starts with 0.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["append", "create", "clear", "delete", "remove"], rawData: [true] }
 * @default 1
 */
		dataStartRow?: number | Expression<number>;
/**
 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["clear", "create", "delete", "remove"], rawData: [true] }
 * @default 0
 */
		keyRow?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["sheet"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["sheet"] }
 */
		sheetId: string | Expression<string>;
/**
 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["create", "delete", "remove"] }
 * @default A:F
 */
		range: string | Expression<string>;
/**
 * Whether the data supplied is RAW instead of parsed into keys
 * @displayOptions.show { resource: ["sheet"], operation: ["update", "upsert"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
/**
 * The name of the property from which to read the RAW data
 * @displayOptions.show { resource: ["sheet"], operation: ["update", "upsert"], rawData: [true] }
 * @default data
 */
		dataProperty?: string | Expression<string>;
/**
 * Index of the first row which contains the actual data and not the keys. Starts with 0.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["append", "create", "clear", "delete", "remove"], rawData: [true] }
 * @default 1
 */
		dataStartRow?: number | Expression<number>;
/**
 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["clear", "create", "delete", "remove"], rawData: [true] }
 * @default 0
 */
		keyRow?: number | Expression<number>;
/**
 * The name of the key to identify which data should be updated in the sheet
 * @displayOptions.show { resource: ["sheet"], operation: ["update", "upsert"], rawData: [false] }
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
 * @displayOptions.show { resource: ["sheet"] }
 */
		sheetId: string | Expression<string>;
/**
 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["create", "delete", "remove"] }
 * @default A:F
 */
		range: string | Expression<string>;
/**
 * Deletes columns and rows from a sheet
 * @displayOptions.show { resource: ["sheet"], operation: ["delete"] }
 * @default {}
 */
		toDelete?: {
		columns?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			sheetId?: string | Expression<string>;
			/** The start index (0 based and inclusive) of column to delete
			 * @default 0
			 */
			startIndex?: number | Expression<number>;
			/** Number of columns to delete
			 * @default 1
			 */
			amount?: number | Expression<number>;
		}>;
		rows?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			sheetId?: string | Expression<string>;
			/** The start index (0 based and inclusive) of row to delete
			 * @default 0
			 */
			startIndex?: number | Expression<number>;
			/** Number of rows to delete
			 * @default 1
			 */
			amount?: number | Expression<number>;
		}>;
	};
/**
 * Index of the first row which contains the actual data and not the keys. Starts with 0.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["append", "create", "clear", "delete", "remove"], rawData: [true] }
 * @default 1
 */
		dataStartRow?: number | Expression<number>;
/**
 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["clear", "create", "delete", "remove"], rawData: [true] }
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
 * @displayOptions.show { resource: ["sheet"] }
 */
		sheetId: string | Expression<string>;
/**
 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["create", "delete", "remove"] }
 * @default A:F
 */
		range: string | Expression<string>;
/**
 * Index of the first row which contains the actual data and not the keys. Starts with 0.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["append", "create", "clear", "delete", "remove"], rawData: [true] }
 * @default 1
 */
		dataStartRow?: number | Expression<number>;
/**
 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["clear", "create", "delete", "remove"], rawData: [true] }
 * @default 0
 */
		keyRow?: number | Expression<number>;
/**
 * The name of the column in which to look for value
 * @displayOptions.show { resource: ["sheet"], operation: ["lookup"] }
 */
		lookupColumn: string | Expression<string>;
/**
 * The value to look for in column
 * @displayOptions.show { resource: ["sheet"], operation: ["lookup"] }
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
 * @displayOptions.show { resource: ["sheet"] }
 */
		sheetId: string | Expression<string>;
/**
 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["create", "delete", "remove"] }
 * @default A:F
 */
		range: string | Expression<string>;
/**
 * Whether the data should be returned RAW instead of parsed into keys according to their header
 * @displayOptions.show { resource: ["sheet"], operation: ["read"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
/**
 * The name of the property into which to write the RAW data
 * @displayOptions.show { resource: ["sheet"], operation: ["read"], rawData: [true] }
 * @default data
 */
		dataProperty?: string | Expression<string>;
/**
 * Index of the first row which contains the actual data and not the keys. Starts with 0.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["append", "create", "clear", "delete", "remove"], rawData: [true] }
 * @default 1
 */
		dataStartRow?: number | Expression<number>;
/**
 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["clear", "create", "delete", "remove"], rawData: [true] }
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
 * @displayOptions.show { resource: ["sheet"] }
 */
		sheetId: string | Expression<string>;
/**
 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["create", "delete", "remove"] }
 * @default A:F
 */
		range: string | Expression<string>;
/**
 * Index of the first row which contains the actual data and not the keys. Starts with 0.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["append", "create", "clear", "delete", "remove"], rawData: [true] }
 * @default 1
 */
		dataStartRow?: number | Expression<number>;
/**
 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["clear", "create", "delete", "remove"], rawData: [true] }
 * @default 0
 */
		keyRow?: number | Expression<number>;
/**
 * The ID of the sheet to delete
 * @displayOptions.show { resource: ["sheet"], operation: ["remove"] }
 */
		id: string | Expression<string>;
};

/** Update rows in a sheet */
export type GoogleSheetsV2SheetUpdateConfig = {
	resource: 'sheet';
	operation: 'update';
/**
 * The ID of the Google Spreadsheet. Found as part of the sheet URL https://docs.google.com/spreadsheets/d/{ID}/.
 * @displayOptions.show { resource: ["sheet"] }
 */
		sheetId: string | Expression<string>;
/**
 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["create", "delete", "remove"] }
 * @default A:F
 */
		range: string | Expression<string>;
/**
 * Whether the data supplied is RAW instead of parsed into keys
 * @displayOptions.show { resource: ["sheet"], operation: ["update", "upsert"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
/**
 * The name of the property from which to read the RAW data
 * @displayOptions.show { resource: ["sheet"], operation: ["update", "upsert"], rawData: [true] }
 * @default data
 */
		dataProperty?: string | Expression<string>;
/**
 * Index of the first row which contains the actual data and not the keys. Starts with 0.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["append", "create", "clear", "delete", "remove"], rawData: [true] }
 * @default 1
 */
		dataStartRow?: number | Expression<number>;
/**
 * Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.
 * @displayOptions.show { resource: ["sheet"] }
 * @displayOptions.hide { operation: ["clear", "create", "delete", "remove"], rawData: [true] }
 * @default 0
 */
		keyRow?: number | Expression<number>;
/**
 * The name of the key to identify which data should be updated in the sheet
 * @displayOptions.show { resource: ["sheet"], operation: ["update", "upsert"], rawData: [false] }
 * @default id
 */
		key?: string | Expression<string>;
	options?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleSheetsV2Credentials {
	googleApi: CredentialReference;
	googleSheetsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleSheetsV2NodeBase {
	type: 'n8n-nodes-base.googleSheets';
	version: 2;
	credentials?: GoogleSheetsV2Credentials;
}

export type GoogleSheetsV2SpreadsheetCreateNode = GoogleSheetsV2NodeBase & {
	config: NodeConfig<GoogleSheetsV2SpreadsheetCreateConfig>;
};

export type GoogleSheetsV2SheetAppendNode = GoogleSheetsV2NodeBase & {
	config: NodeConfig<GoogleSheetsV2SheetAppendConfig>;
};

export type GoogleSheetsV2SheetClearNode = GoogleSheetsV2NodeBase & {
	config: NodeConfig<GoogleSheetsV2SheetClearConfig>;
};

export type GoogleSheetsV2SheetCreateNode = GoogleSheetsV2NodeBase & {
	config: NodeConfig<GoogleSheetsV2SheetCreateConfig>;
};

export type GoogleSheetsV2SheetUpsertNode = GoogleSheetsV2NodeBase & {
	config: NodeConfig<GoogleSheetsV2SheetUpsertConfig>;
};

export type GoogleSheetsV2SheetDeleteNode = GoogleSheetsV2NodeBase & {
	config: NodeConfig<GoogleSheetsV2SheetDeleteConfig>;
};

export type GoogleSheetsV2SheetLookupNode = GoogleSheetsV2NodeBase & {
	config: NodeConfig<GoogleSheetsV2SheetLookupConfig>;
};

export type GoogleSheetsV2SheetReadNode = GoogleSheetsV2NodeBase & {
	config: NodeConfig<GoogleSheetsV2SheetReadConfig>;
};

export type GoogleSheetsV2SheetRemoveNode = GoogleSheetsV2NodeBase & {
	config: NodeConfig<GoogleSheetsV2SheetRemoveConfig>;
};

export type GoogleSheetsV2SheetUpdateNode = GoogleSheetsV2NodeBase & {
	config: NodeConfig<GoogleSheetsV2SheetUpdateConfig>;
};

export type GoogleSheetsV2Node =
	| GoogleSheetsV2SpreadsheetCreateNode
	| GoogleSheetsV2SheetAppendNode
	| GoogleSheetsV2SheetClearNode
	| GoogleSheetsV2SheetCreateNode
	| GoogleSheetsV2SheetUpsertNode
	| GoogleSheetsV2SheetDeleteNode
	| GoogleSheetsV2SheetLookupNode
	| GoogleSheetsV2SheetReadNode
	| GoogleSheetsV2SheetRemoveNode
	| GoogleSheetsV2SheetUpdateNode
	;