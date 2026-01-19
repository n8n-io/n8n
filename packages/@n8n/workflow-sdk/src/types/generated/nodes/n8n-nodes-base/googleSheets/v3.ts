/**
 * Google Sheets Node - Version 3
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
export type GoogleSheetsV3SpreadsheetCreateConfig = {
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
export type GoogleSheetsV3SpreadsheetDeleteSpreadsheetConfig = {
	resource: 'spreadsheet';
	operation: 'deleteSpreadsheet';
	documentId: ResourceLocatorValue;
};

/** Append a new row or update an existing one (upsert) */
export type GoogleSheetsV3SheetAppendOrUpdateConfig = {
	resource: 'sheet';
	operation: 'appendOrUpdate';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
/**
 * Whether to insert the input data this node receives in the new row
 * @displayOptions.show { resource: ["sheet"], operation: ["appendOrUpdate"] }
 * @displayOptions.hide { sheetName: [""] }
 * @default defineBelow
 */
		dataMode?: 'autoMapInputData' | 'defineBelow' | 'nothing' | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @hint Used to find the correct row to update. Doesn't get changed.
 * @displayOptions.show { resource: ["sheet"], operation: ["appendOrUpdate"] }
 * @displayOptions.hide { sheetName: [""] }
 */
		columnToMatchOn?: string | Expression<string>;
	valueToMatchOn?: string | Expression<string>;
	fieldsUi?: {
		values?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			column?: string | Expression<string>;
			/** Column Name
			 * @displayOptions.show { column: ["newColumn"] }
			 */
			columnName?: string | Expression<string>;
			/** Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Create a new row in a sheet */
export type GoogleSheetsV3SheetAppendConfig = {
	resource: 'sheet';
	operation: 'append';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
/**
 * Whether to insert the input data this node receives in the new row
 * @displayOptions.show { resource: ["sheet"], operation: ["append"] }
 * @displayOptions.hide { sheetName: [""] }
 * @default defineBelow
 */
		dataMode?: 'autoMapInputData' | 'defineBelow' | 'nothing' | Expression<string>;
	fieldsUi?: {
		fieldValues?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			fieldId?: string | Expression<string>;
			/** Field Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Delete all the contents or a part of a sheet */
export type GoogleSheetsV3SheetClearConfig = {
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
export type GoogleSheetsV3SheetCreateConfig = {
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
export type GoogleSheetsV3SheetRemoveConfig = {
	resource: 'sheet';
	operation: 'remove';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
};

/** Delete columns or rows from a sheet */
export type GoogleSheetsV3SheetDeleteConfig = {
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
export type GoogleSheetsV3SheetReadConfig = {
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
export type GoogleSheetsV3SheetUpdateConfig = {
	resource: 'sheet';
	operation: 'update';
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
/**
 * Whether to insert the input data this node receives in the new row
 * @displayOptions.show { resource: ["sheet"], operation: ["update"] }
 * @displayOptions.hide { sheetName: [""] }
 * @default defineBelow
 */
		dataMode?: 'autoMapInputData' | 'defineBelow' | 'nothing' | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @hint Used to find the correct row to update. Doesn't get changed.
 * @displayOptions.show { resource: ["sheet"], operation: ["update"] }
 * @displayOptions.hide { sheetName: [""] }
 */
		columnToMatchOn?: string | Expression<string>;
	valueToMatchOn?: string | Expression<string>;
	fieldsUi?: {
		values?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			column?: string | Expression<string>;
			/** Column Name
			 * @displayOptions.show { column: ["newColumn"] }
			 */
			columnName?: string | Expression<string>;
			/** Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleSheetsV3Credentials {
	googleApi: CredentialReference;
	googleSheetsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleSheetsV3NodeBase {
	type: 'n8n-nodes-base.googleSheets';
	version: 3;
	credentials?: GoogleSheetsV3Credentials;
}

export type GoogleSheetsV3SpreadsheetCreateNode = GoogleSheetsV3NodeBase & {
	config: NodeConfig<GoogleSheetsV3SpreadsheetCreateConfig>;
};

export type GoogleSheetsV3SpreadsheetDeleteSpreadsheetNode = GoogleSheetsV3NodeBase & {
	config: NodeConfig<GoogleSheetsV3SpreadsheetDeleteSpreadsheetConfig>;
};

export type GoogleSheetsV3SheetAppendOrUpdateNode = GoogleSheetsV3NodeBase & {
	config: NodeConfig<GoogleSheetsV3SheetAppendOrUpdateConfig>;
};

export type GoogleSheetsV3SheetAppendNode = GoogleSheetsV3NodeBase & {
	config: NodeConfig<GoogleSheetsV3SheetAppendConfig>;
};

export type GoogleSheetsV3SheetClearNode = GoogleSheetsV3NodeBase & {
	config: NodeConfig<GoogleSheetsV3SheetClearConfig>;
};

export type GoogleSheetsV3SheetCreateNode = GoogleSheetsV3NodeBase & {
	config: NodeConfig<GoogleSheetsV3SheetCreateConfig>;
};

export type GoogleSheetsV3SheetRemoveNode = GoogleSheetsV3NodeBase & {
	config: NodeConfig<GoogleSheetsV3SheetRemoveConfig>;
};

export type GoogleSheetsV3SheetDeleteNode = GoogleSheetsV3NodeBase & {
	config: NodeConfig<GoogleSheetsV3SheetDeleteConfig>;
};

export type GoogleSheetsV3SheetReadNode = GoogleSheetsV3NodeBase & {
	config: NodeConfig<GoogleSheetsV3SheetReadConfig>;
};

export type GoogleSheetsV3SheetUpdateNode = GoogleSheetsV3NodeBase & {
	config: NodeConfig<GoogleSheetsV3SheetUpdateConfig>;
};

export type GoogleSheetsV3Node =
	| GoogleSheetsV3SpreadsheetCreateNode
	| GoogleSheetsV3SpreadsheetDeleteSpreadsheetNode
	| GoogleSheetsV3SheetAppendOrUpdateNode
	| GoogleSheetsV3SheetAppendNode
	| GoogleSheetsV3SheetClearNode
	| GoogleSheetsV3SheetCreateNode
	| GoogleSheetsV3SheetRemoveNode
	| GoogleSheetsV3SheetDeleteNode
	| GoogleSheetsV3SheetReadNode
	| GoogleSheetsV3SheetUpdateNode
	;