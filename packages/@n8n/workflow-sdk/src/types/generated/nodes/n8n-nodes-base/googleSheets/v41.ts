/**
 * Google Sheets Node - Version 4.1
 * Read, update and write data to Google Sheets
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new sheet */
export type GoogleSheetsV41SpreadsheetCreateConfig = {
	resource: 'spreadsheet';
	operation: 'create';
/**
 * The title of the spreadsheet
 * @displayOptions.show { resource: ["spreadsheet"], operation: ["create"] }
 */
		title?: string | Expression<string>;
	sheetsUi?: {
		sheetValues?: Array<{
			/** Title of the property to create
			 */
			title?: string | Expression<string>;
			/** Whether the Sheet should be hidden in the UI
			 * @default false
			 */
			hidden?: boolean | Expression<boolean>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Delete a spreadsheet */
export type GoogleSheetsV41SpreadsheetDeleteSpreadsheetConfig = {
	resource: 'spreadsheet';
	operation: 'deleteSpreadsheet';
	documentId: ResourceLocatorValue;
};

/** Append a new row or update an existing one (upsert) */
export type GoogleSheetsV41SheetAppendOrUpdateConfig = {
	resource: 'sheet';
	operation: 'appendOrUpdate';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create a new row in a sheet */
export type GoogleSheetsV41SheetAppendConfig = {
	resource: 'sheet';
	operation: 'append';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete all the contents or a part of a sheet */
export type GoogleSheetsV41SheetClearConfig = {
	resource: 'sheet';
	operation: 'clear';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
/**
 * What to clear
 * @displayOptions.show { resource: ["sheet"], operation: ["clear"] }
 * @displayOptions.hide { sheetName: [""] }
 * @default wholeSheet
 */
		clear?: 'wholeSheet' | 'specificRows' | 'specificColumns' | 'specificRange' | Expression<string>;
	keepFirstRow?: boolean | Expression<boolean>;
/**
 * The row number to delete from, The first row is 1
 * @displayOptions.show { resource: ["sheet"], operation: ["clear"], clear: ["specificRows"] }
 * @displayOptions.hide { sheetName: [""] }
 * @default 1
 */
		startIndex?: number | Expression<number>;
	rowsToDelete?: number | Expression<number>;
	columnsToDelete?: number | Expression<number>;
/**
 * The table range to read from or to append data to. See the Google &lt;a href="https://developers.google.com/sheets/api/guides/values#writing"&gt;documentation&lt;/a&gt; for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"
 * @displayOptions.show { resource: ["sheet"], operation: ["clear"], clear: ["specificRange"] }
 * @displayOptions.hide { sheetName: [""] }
 * @default A:F
 */
		range: string | Expression<string>;
};

/** Create a new sheet */
export type GoogleSheetsV41SheetCreateConfig = {
	resource: 'sheet';
	operation: 'create';
	documentId: ResourceLocatorValue;
/**
 * The name of the sheet
 * @displayOptions.show { resource: ["sheet"], operation: ["create"] }
 * @default n8n-sheet
 */
		title: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Permanently delete a sheet */
export type GoogleSheetsV41SheetRemoveConfig = {
	resource: 'sheet';
	operation: 'remove';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
};

/** Delete columns or rows from a sheet */
export type GoogleSheetsV41SheetDeleteConfig = {
	resource: 'sheet';
	operation: 'delete';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
/**
 * What to delete
 * @displayOptions.show { resource: ["sheet"], operation: ["delete"] }
 * @displayOptions.hide { sheetName: [""] }
 * @default rows
 */
		toDelete?: 'rows' | 'columns' | Expression<string>;
/**
 * The row number to delete from, The first row is 2
 * @displayOptions.show { resource: ["sheet"], operation: ["delete"], toDelete: ["rows"] }
 * @displayOptions.hide { sheetName: [""] }
 * @default 2
 */
		startIndex?: number | Expression<number>;
	numberToDelete?: number | Expression<number>;
};

/** Retrieve one or more rows from a sheet */
export type GoogleSheetsV41SheetReadConfig = {
	resource: 'sheet';
	operation: 'read';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
	filtersUI?: {
		values?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			lookupColumn?: string | Expression<string>;
			/** Value
			 * @hint The column must have this value to be matched
			 */
			lookupValue?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Update an existing row in a sheet */
export type GoogleSheetsV41SheetUpdateConfig = {
	resource: 'sheet';
	operation: 'update';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type GoogleSheetsV41Params =
	| GoogleSheetsV41SpreadsheetCreateConfig
	| GoogleSheetsV41SpreadsheetDeleteSpreadsheetConfig
	| GoogleSheetsV41SheetAppendOrUpdateConfig
	| GoogleSheetsV41SheetAppendConfig
	| GoogleSheetsV41SheetClearConfig
	| GoogleSheetsV41SheetCreateConfig
	| GoogleSheetsV41SheetRemoveConfig
	| GoogleSheetsV41SheetDeleteConfig
	| GoogleSheetsV41SheetReadConfig
	| GoogleSheetsV41SheetUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleSheetsV41Credentials {
	googleApi: CredentialReference;
	googleSheetsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleSheetsV41NodeBase {
	type: 'n8n-nodes-base.googleSheets';
	version: 4.1;
	credentials?: GoogleSheetsV41Credentials;
}

export type GoogleSheetsV41SpreadsheetCreateNode = GoogleSheetsV41NodeBase & {
	config: NodeConfig<GoogleSheetsV41SpreadsheetCreateConfig>;
};

export type GoogleSheetsV41SpreadsheetDeleteSpreadsheetNode = GoogleSheetsV41NodeBase & {
	config: NodeConfig<GoogleSheetsV41SpreadsheetDeleteSpreadsheetConfig>;
};

export type GoogleSheetsV41SheetAppendOrUpdateNode = GoogleSheetsV41NodeBase & {
	config: NodeConfig<GoogleSheetsV41SheetAppendOrUpdateConfig>;
};

export type GoogleSheetsV41SheetAppendNode = GoogleSheetsV41NodeBase & {
	config: NodeConfig<GoogleSheetsV41SheetAppendConfig>;
};

export type GoogleSheetsV41SheetClearNode = GoogleSheetsV41NodeBase & {
	config: NodeConfig<GoogleSheetsV41SheetClearConfig>;
};

export type GoogleSheetsV41SheetCreateNode = GoogleSheetsV41NodeBase & {
	config: NodeConfig<GoogleSheetsV41SheetCreateConfig>;
};

export type GoogleSheetsV41SheetRemoveNode = GoogleSheetsV41NodeBase & {
	config: NodeConfig<GoogleSheetsV41SheetRemoveConfig>;
};

export type GoogleSheetsV41SheetDeleteNode = GoogleSheetsV41NodeBase & {
	config: NodeConfig<GoogleSheetsV41SheetDeleteConfig>;
};

export type GoogleSheetsV41SheetReadNode = GoogleSheetsV41NodeBase & {
	config: NodeConfig<GoogleSheetsV41SheetReadConfig>;
};

export type GoogleSheetsV41SheetUpdateNode = GoogleSheetsV41NodeBase & {
	config: NodeConfig<GoogleSheetsV41SheetUpdateConfig>;
};

export type GoogleSheetsV41Node =
	| GoogleSheetsV41SpreadsheetCreateNode
	| GoogleSheetsV41SpreadsheetDeleteSpreadsheetNode
	| GoogleSheetsV41SheetAppendOrUpdateNode
	| GoogleSheetsV41SheetAppendNode
	| GoogleSheetsV41SheetClearNode
	| GoogleSheetsV41SheetCreateNode
	| GoogleSheetsV41SheetRemoveNode
	| GoogleSheetsV41SheetDeleteNode
	| GoogleSheetsV41SheetReadNode
	| GoogleSheetsV41SheetUpdateNode
	;