/**
 * Google Docs Node - Version 1
 * Consume Google Docs API.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type GoogleDocsV1DocumentCreateConfig = {
	resource: 'document';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create"], resource: ["document"] }
 * @default myDrive
 */
		driveId: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create"], resource: ["document"] }
 */
		folderId: string | Expression<string>;
	title: string | Expression<string>;
};

export type GoogleDocsV1DocumentGetConfig = {
	resource: 'document';
	operation: 'get';
/**
 * The ID in the document URL (or just paste the whole URL)
 * @displayOptions.show { operation: ["get"], resource: ["document"] }
 */
		documentURL: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["get"], resource: ["document"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

export type GoogleDocsV1DocumentUpdateConfig = {
	resource: 'document';
	operation: 'update';
/**
 * The ID in the document URL (or just paste the whole URL)
 * @displayOptions.show { operation: ["update"], resource: ["document"] }
 */
		documentURL: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["update"], resource: ["document"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
/**
 * Actions applied to update the document
 * @displayOptions.show { operation: ["update"], resource: ["document"] }
 * @default {"actionFields":[{"object":"text","action":"insert","locationChoice":"endOfSegmentLocation","index":0,"text":""}]}
 */
		actionsUi?: {
		actionFields?: Array<{
			/** The update object
			 * @default text
			 */
			object?: 'footer' | 'header' | 'namedRange' | 'pageBreak' | 'paragraphBullets' | 'positionedObject' | 'table' | 'tableColumn' | 'tableRow' | 'text' | Expression<string>;
			/** The update action
			 * @displayOptions.show { object: ["text"] }
			 */
			action?: 'replaceAll' | 'insert' | Expression<string>;
			/** The update action
			 * @displayOptions.show { object: ["footer", "header", "namedRange", "paragraphBullets"] }
			 */
			action?: 'create' | 'delete' | Expression<string>;
			/** The update action
			 * @displayOptions.show { object: ["tableColumn", "tableRow"] }
			 */
			action?: 'delete' | 'insert' | Expression<string>;
			/** The update action
			 * @displayOptions.show { object: ["pageBreak", "table"] }
			 */
			action?: 'insert' | Expression<string>;
			/** The update action
			 * @displayOptions.show { object: ["positionedObject"] }
			 */
			action?: 'delete' | Expression<string>;
			/** The location where to create the object
			 * @displayOptions.show { object: ["footer", "header", "paragraphBullets", "namedRange"], action: ["create"] }
			 * @default body
			 */
			insertSegment?: 'header' | 'body' | 'footer' | Expression<string>;
			/** The ID of the header, footer or footnote. The &lt;code&gt;Document → Get&lt;/code&gt; operation lists all segment IDs (make sure you disable the &lt;code&gt;simple&lt;/code&gt; toggle).
			 * @displayOptions.show { object: ["footer", "header", "paragraphBullets", "namedRange"], action: ["create"] }
			 * @displayOptions.hide { insertSegment: ["body"] }
			 */
			segmentId?: string | Expression<string>;
			/** The zero-based index, relative to the beginning of the specified segment
			 * @displayOptions.show { object: ["footer", "header"], action: ["create"] }
			 * @default 0
			 */
			index?: number | Expression<number>;
			/** The name of the Named Range. Names do not need to be unique.
			 * @displayOptions.show { object: ["namedRange"], action: ["create"] }
			 */
			name?: string | Expression<string>;
			/** The zero-based start index of this range
			 * @displayOptions.show { object: ["namedRange"], action: ["create"] }
			 * @default 0
			 */
			startIndex?: number | Expression<number>;
			/** The zero-based end index of this range
			 * @displayOptions.show { object: ["namedRange"], action: ["create"] }
			 * @default 0
			 */
			endIndex?: number | Expression<number>;
			/** The Preset pattern of bullet glyphs for list
			 * @displayOptions.show { object: ["paragraphBullets"], action: ["create"] }
			 * @default BULLET_DISC_CIRCLE_SQUARE
			 */
			bulletPreset?: 'BULLET_DISC_CIRCLE_SQUARE' | 'BULLET_CHECKBOX' | 'NUMBERED_DECIMAL_NESTED' | Expression<string>;
			/** The ID of the footer to delete. To retrieve it, use the &lt;code&gt;get document&lt;/code&gt; where you can find under &lt;code&gt;footers&lt;/code&gt; attribute.
			 * @displayOptions.show { object: ["footer"], action: ["delete"] }
			 */
			footerId?: string | Expression<string>;
			/** The ID of the header to delete. To retrieve it, use the &lt;code&gt;get document&lt;/code&gt; where you can find under &lt;code&gt;headers&lt;/code&gt; attribute.
			 * @displayOptions.show { object: ["header"], action: ["delete"] }
			 */
			headerId?: string | Expression<string>;
			/** The value determines which range or ranges to delete
			 * @displayOptions.show { object: ["namedRange"], action: ["delete"] }
			 * @default namedRangeId
			 */
			namedRangeReference?: 'namedRangeId' | 'name' | Expression<string>;
			/** The ID of the range
			 * @displayOptions.show { object: ["namedRange"], action: ["delete"], namedRangeReference: ["namedRangeId"] }
			 */
			value?: string | Expression<string>;
			/** The name of the range
			 * @displayOptions.show { object: ["namedRange"], action: ["delete"], namedRangeReference: ["name"] }
			 */
			value?: string | Expression<string>;
			/** The ID of the positioned object to delete (An object that is tied to a paragraph and positioned relative to its beginning), See the Google &lt;a href="https://developers.google.com/docs/api/reference/rest/v1/documents#positionedobject" target="_blank"&gt;documentation&lt;/a&gt;
			 * @displayOptions.show { object: ["positionedObject"], action: ["delete"] }
			 */
			objectId?: string | Expression<string>;
			/** The location where to create the object
			 * @displayOptions.show { object: ["pageBreak", "table", "tableColumn", "tableRow", "text"], action: ["insert"] }
			 * @default body
			 */
			insertSegment?: 'header' | 'body' | 'footer' | Expression<string>;
			/** The ID of the header, footer or footnote. The &lt;code&gt;Document → Get&lt;/code&gt; operation lists all segment IDs (make sure you disable the &lt;code&gt;simple&lt;/code&gt; toggle).
			 * @displayOptions.show { object: ["pageBreak", "table", "tableColumn", "tableRow", "text"], action: ["insert"] }
			 * @displayOptions.hide { insertSegment: ["body"] }
			 */
			segmentId?: string | Expression<string>;
			/** The location where the text will be inserted
			 * @displayOptions.show { object: ["pageBreak"], action: ["insert"] }
			 * @default endOfSegmentLocation
			 */
			locationChoice?: 'endOfSegmentLocation' | 'location' | Expression<string>;
			/** The zero-based index, relative to the beginning of the specified segment
			 * @displayOptions.show { locationChoice: ["location"], object: ["pageBreak"], action: ["insert"] }
			 * @default 1
			 */
			index?: number | Expression<number>;
			/** The location where the text will be inserted
			 * @displayOptions.show { object: ["table"], action: ["insert"] }
			 * @default endOfSegmentLocation
			 */
			locationChoice?: 'endOfSegmentLocation' | 'location' | Expression<string>;
			/** The zero-based index, relative to the beginning of the specified segment (use index + 1 to refer to a table)
			 * @displayOptions.show { locationChoice: ["location"], object: ["table"], action: ["insert"] }
			 * @default 1
			 */
			index?: number | Expression<number>;
			/** The number of rows in the table
			 * @displayOptions.show { object: ["table"], action: ["insert"] }
			 * @default 0
			 */
			rows?: number | Expression<number>;
			/** The number of columns in the table
			 * @displayOptions.show { object: ["table"], action: ["insert"] }
			 * @default 0
			 */
			columns?: number | Expression<number>;
			/** The location where the text will be inserted
			 * @displayOptions.show { object: ["text"], action: ["insert"] }
			 * @default endOfSegmentLocation
			 */
			locationChoice?: 'endOfSegmentLocation' | 'location' | Expression<string>;
			/** The zero-based index, relative to the beginning of the specified segment
			 * @displayOptions.show { locationChoice: ["location"], object: ["text"], action: ["insert"] }
			 * @default 1
			 */
			index?: number | Expression<number>;
			/** The text to insert in the document
			 * @displayOptions.show { object: ["text"], action: ["insert"] }
			 */
			text?: string | Expression<string>;
			/** The text to search for in the document
			 * @displayOptions.show { object: ["text"], action: ["replaceAll"] }
			 */
			text?: string | Expression<string>;
			/** The text that will replace the matched text
			 * @displayOptions.show { object: ["text"], action: ["replaceAll"] }
			 */
			replaceText?: string | Expression<string>;
			/** Whether the search should respect case sensitivity
			 * @displayOptions.show { object: ["text"], action: ["replaceAll"] }
			 * @default false
			 */
			matchCase?: boolean | Expression<boolean>;
			/** The location where to create the object
			 * @displayOptions.show { object: ["paragraphBullets", "tableColumn", "tableRow"], action: ["delete"] }
			 * @default body
			 */
			insertSegment?: 'header' | 'body' | 'footer' | Expression<string>;
			/** The ID of the header, footer or footnote. The &lt;code&gt;Document → Get&lt;/code&gt; operation lists all segment IDs (make sure you disable the &lt;code&gt;simple&lt;/code&gt; toggle).
			 * @displayOptions.show { object: ["paragraphBullets", "tableColumn", "tableRow"], action: ["delete"] }
			 * @displayOptions.hide { insertSegment: ["body"] }
			 */
			segmentId?: string | Expression<string>;
			/** The zero-based start index of this range
			 * @displayOptions.show { object: ["paragraphBullets"] }
			 * @default 0
			 */
			startIndex?: number | Expression<number>;
			/** The zero-based end index of this range
			 * @displayOptions.show { object: ["paragraphBullets"] }
			 * @default 0
			 */
			endIndex?: number | Expression<number>;
			/** Insert Position
			 * @displayOptions.show { object: ["tableColumn", "tableRow"], action: ["insert"] }
			 * @default true
			 */
			insertPosition?: false | true | Expression<boolean>;
			/** The zero-based index, relative to the beginning of the specified segment (use index + 1 to refer to a table)
			 * @displayOptions.show { object: ["tableColumn", "tableRow"] }
			 * @default 1
			 */
			index?: number | Expression<number>;
			/** The zero-based row index
			 * @displayOptions.show { object: ["tableColumn", "tableRow"] }
			 * @default 0
			 */
			rowIndex?: number | Expression<number>;
			/** The zero-based column index
			 * @displayOptions.show { object: ["tableColumn", "tableRow"] }
			 * @default 0
			 */
			columnIndex?: number | Expression<number>;
		}>;
	};
	updateFields?: {
		writeControlObject?: {
			/** Determines how the changes are applied to the revision
			 * @default requiredRevisionId
			 */
			control?: 'targetRevisionId' | 'requiredRevisionId' | Expression<string>;
			/** Revision ID
			 */
			value?: string | Expression<string>;
		};
	};
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleDocsV1Credentials {
	googleApi: CredentialReference;
	googleDocsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleDocsV1NodeBase {
	type: 'n8n-nodes-base.googleDocs';
	version: 1;
	credentials?: GoogleDocsV1Credentials;
}

export type GoogleDocsV1DocumentCreateNode = GoogleDocsV1NodeBase & {
	config: NodeConfig<GoogleDocsV1DocumentCreateConfig>;
};

export type GoogleDocsV1DocumentGetNode = GoogleDocsV1NodeBase & {
	config: NodeConfig<GoogleDocsV1DocumentGetConfig>;
};

export type GoogleDocsV1DocumentUpdateNode = GoogleDocsV1NodeBase & {
	config: NodeConfig<GoogleDocsV1DocumentUpdateConfig>;
};

export type GoogleDocsV1Node =
	| GoogleDocsV1DocumentCreateNode
	| GoogleDocsV1DocumentGetNode
	| GoogleDocsV1DocumentUpdateNode
	;