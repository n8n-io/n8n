/**
 * Google Sheets  Node - Version 1
 * Read, update and write data to Google Sheets
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new sheet */
export type GoogleSheetsV1SpreadsheetCreateConfig = {
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
export type GoogleSheetsV1SheetAppendConfig = {
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
export type GoogleSheetsV1SheetClearConfig = {
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
export type GoogleSheetsV1SheetCreateConfig = {
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
export type GoogleSheetsV1SheetUpsertConfig = {
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
export type GoogleSheetsV1SheetDeleteConfig = {
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
export type GoogleSheetsV1SheetLookupConfig = {
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
export type GoogleSheetsV1SheetReadConfig = {
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
export type GoogleSheetsV1SheetRemoveConfig = {
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
export type GoogleSheetsV1SheetUpdateConfig = {
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

export interface GoogleSheetsV1Credentials {
	googleApi: CredentialReference;
	googleSheetsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleSheetsV1NodeBase {
	type: 'n8n-nodes-base.googleSheets';
	version: 1;
	credentials?: GoogleSheetsV1Credentials;
}

export type GoogleSheetsV1SpreadsheetCreateNode = GoogleSheetsV1NodeBase & {
	config: NodeConfig<GoogleSheetsV1SpreadsheetCreateConfig>;
};

export type GoogleSheetsV1SheetAppendNode = GoogleSheetsV1NodeBase & {
	config: NodeConfig<GoogleSheetsV1SheetAppendConfig>;
};

export type GoogleSheetsV1SheetClearNode = GoogleSheetsV1NodeBase & {
	config: NodeConfig<GoogleSheetsV1SheetClearConfig>;
};

export type GoogleSheetsV1SheetCreateNode = GoogleSheetsV1NodeBase & {
	config: NodeConfig<GoogleSheetsV1SheetCreateConfig>;
};

export type GoogleSheetsV1SheetUpsertNode = GoogleSheetsV1NodeBase & {
	config: NodeConfig<GoogleSheetsV1SheetUpsertConfig>;
};

export type GoogleSheetsV1SheetDeleteNode = GoogleSheetsV1NodeBase & {
	config: NodeConfig<GoogleSheetsV1SheetDeleteConfig>;
};

export type GoogleSheetsV1SheetLookupNode = GoogleSheetsV1NodeBase & {
	config: NodeConfig<GoogleSheetsV1SheetLookupConfig>;
};

export type GoogleSheetsV1SheetReadNode = GoogleSheetsV1NodeBase & {
	config: NodeConfig<GoogleSheetsV1SheetReadConfig>;
};

export type GoogleSheetsV1SheetRemoveNode = GoogleSheetsV1NodeBase & {
	config: NodeConfig<GoogleSheetsV1SheetRemoveConfig>;
};

export type GoogleSheetsV1SheetUpdateNode = GoogleSheetsV1NodeBase & {
	config: NodeConfig<GoogleSheetsV1SheetUpdateConfig>;
};

export type GoogleSheetsV1Node =
	| GoogleSheetsV1SpreadsheetCreateNode
	| GoogleSheetsV1SheetAppendNode
	| GoogleSheetsV1SheetClearNode
	| GoogleSheetsV1SheetCreateNode
	| GoogleSheetsV1SheetUpsertNode
	| GoogleSheetsV1SheetDeleteNode
	| GoogleSheetsV1SheetLookupNode
	| GoogleSheetsV1SheetReadNode
	| GoogleSheetsV1SheetRemoveNode
	| GoogleSheetsV1SheetUpdateNode
	;