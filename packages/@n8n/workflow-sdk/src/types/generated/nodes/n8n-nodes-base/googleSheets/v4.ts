/**
 * Google Sheets Node - Version 4
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
export type GoogleSheetsV4SpreadsheetCreateConfig = {
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
export type GoogleSheetsV4SpreadsheetDeleteSpreadsheetConfig = {
	resource: 'spreadsheet';
	operation: 'deleteSpreadsheet';
	documentId: ResourceLocatorValue;
};

/** Append a new row or update an existing one (upsert) */
export type GoogleSheetsV4SheetAppendOrUpdateConfig = {
	resource: 'sheet';
	operation: 'appendOrUpdate';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create a new row in a sheet */
export type GoogleSheetsV4SheetAppendConfig = {
	resource: 'sheet';
	operation: 'append';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete all the contents or a part of a sheet */
export type GoogleSheetsV4SheetClearConfig = {
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
export type GoogleSheetsV4SheetCreateConfig = {
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
export type GoogleSheetsV4SheetRemoveConfig = {
	resource: 'sheet';
	operation: 'remove';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
};

/** Delete columns or rows from a sheet */
export type GoogleSheetsV4SheetDeleteConfig = {
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
export type GoogleSheetsV4SheetReadConfig = {
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
export type GoogleSheetsV4SheetUpdateConfig = {
	resource: 'sheet';
	operation: 'update';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
	options?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleSheetsV4Credentials {
	googleApi: CredentialReference;
	googleSheetsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleSheetsV4NodeBase {
	type: 'n8n-nodes-base.googleSheets';
	version: 4;
	credentials?: GoogleSheetsV4Credentials;
}

export type GoogleSheetsV4SpreadsheetCreateNode = GoogleSheetsV4NodeBase & {
	config: NodeConfig<GoogleSheetsV4SpreadsheetCreateConfig>;
};

export type GoogleSheetsV4SpreadsheetDeleteSpreadsheetNode = GoogleSheetsV4NodeBase & {
	config: NodeConfig<GoogleSheetsV4SpreadsheetDeleteSpreadsheetConfig>;
};

export type GoogleSheetsV4SheetAppendOrUpdateNode = GoogleSheetsV4NodeBase & {
	config: NodeConfig<GoogleSheetsV4SheetAppendOrUpdateConfig>;
};

export type GoogleSheetsV4SheetAppendNode = GoogleSheetsV4NodeBase & {
	config: NodeConfig<GoogleSheetsV4SheetAppendConfig>;
};

export type GoogleSheetsV4SheetClearNode = GoogleSheetsV4NodeBase & {
	config: NodeConfig<GoogleSheetsV4SheetClearConfig>;
};

export type GoogleSheetsV4SheetCreateNode = GoogleSheetsV4NodeBase & {
	config: NodeConfig<GoogleSheetsV4SheetCreateConfig>;
};

export type GoogleSheetsV4SheetRemoveNode = GoogleSheetsV4NodeBase & {
	config: NodeConfig<GoogleSheetsV4SheetRemoveConfig>;
};

export type GoogleSheetsV4SheetDeleteNode = GoogleSheetsV4NodeBase & {
	config: NodeConfig<GoogleSheetsV4SheetDeleteConfig>;
};

export type GoogleSheetsV4SheetReadNode = GoogleSheetsV4NodeBase & {
	config: NodeConfig<GoogleSheetsV4SheetReadConfig>;
};

export type GoogleSheetsV4SheetUpdateNode = GoogleSheetsV4NodeBase & {
	config: NodeConfig<GoogleSheetsV4SheetUpdateConfig>;
};

export type GoogleSheetsV4Node =
	| GoogleSheetsV4SpreadsheetCreateNode
	| GoogleSheetsV4SpreadsheetDeleteSpreadsheetNode
	| GoogleSheetsV4SheetAppendOrUpdateNode
	| GoogleSheetsV4SheetAppendNode
	| GoogleSheetsV4SheetClearNode
	| GoogleSheetsV4SheetCreateNode
	| GoogleSheetsV4SheetRemoveNode
	| GoogleSheetsV4SheetDeleteNode
	| GoogleSheetsV4SheetReadNode
	| GoogleSheetsV4SheetUpdateNode
	;