/**
 * Google Docs Node Types
 *
 * Consume Google Docs API.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googledocs/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type GoogleDocsV2DocumentCreateConfig = {
	resource: 'document';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @default myDrive
	 */
	driveId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	folderId: string | Expression<string>;
	title: string | Expression<string>;
};

export type GoogleDocsV2DocumentGetConfig = {
	resource: 'document';
	operation: 'get';
	/**
	 * The ID in the document URL (or just paste the whole URL)
	 */
	documentURL: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

export type GoogleDocsV2DocumentUpdateConfig = {
	resource: 'document';
	operation: 'update';
	/**
	 * The ID in the document URL (or just paste the whole URL)
	 */
	documentURL: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	/**
	 * Actions applied to update the document
	 * @default {"actionFields":[{"object":"text","action":"insert","locationChoice":"endOfSegmentLocation","index":0,"text":""}]}
	 */
	actionsUi?: {
		actionFields?: Array<{
			object?:
				| 'footer'
				| 'header'
				| 'namedRange'
				| 'pageBreak'
				| 'paragraphBullets'
				| 'positionedObject'
				| 'table'
				| 'tableColumn'
				| 'tableRow'
				| 'text'
				| Expression<string>;
			action?: 'replaceAll' | 'insert' | Expression<string>;
			action?: 'create' | 'delete' | Expression<string>;
			action?: 'delete' | 'insert' | Expression<string>;
			action?: 'insert' | Expression<string>;
			action?: 'delete' | Expression<string>;
			insertSegment?: 'header' | 'body' | 'footer' | Expression<string>;
			segmentId?: string | Expression<string>;
			index?: number | Expression<number>;
			name?: string | Expression<string>;
			startIndex?: number | Expression<number>;
			endIndex?: number | Expression<number>;
			bulletPreset?:
				| 'BULLET_DISC_CIRCLE_SQUARE'
				| 'BULLET_CHECKBOX'
				| 'NUMBERED_DECIMAL_NESTED'
				| Expression<string>;
			footerId?: string | Expression<string>;
			headerId?: string | Expression<string>;
			namedRangeReference?: 'namedRangeId' | 'name' | Expression<string>;
			value?: string | Expression<string>;
			value?: string | Expression<string>;
			objectId?: string | Expression<string>;
			insertSegment?: 'header' | 'body' | 'footer' | Expression<string>;
			segmentId?: string | Expression<string>;
			locationChoice?: 'endOfSegmentLocation' | 'location' | Expression<string>;
			index?: number | Expression<number>;
			locationChoice?: 'endOfSegmentLocation' | 'location' | Expression<string>;
			index?: number | Expression<number>;
			rows?: number | Expression<number>;
			columns?: number | Expression<number>;
			locationChoice?: 'endOfSegmentLocation' | 'location' | Expression<string>;
			index?: number | Expression<number>;
			text?: string | Expression<string>;
			text?: string | Expression<string>;
			replaceText?: string | Expression<string>;
			matchCase?: boolean | Expression<boolean>;
			insertSegment?: 'header' | 'body' | 'footer' | Expression<string>;
			segmentId?: string | Expression<string>;
			startIndex?: number | Expression<number>;
			endIndex?: number | Expression<number>;
			insertPosition?: false | true | Expression<boolean>;
			index?: number | Expression<number>;
			rowIndex?: number | Expression<number>;
			columnIndex?: number | Expression<number>;
		}>;
	};
	updateFields?: {
		writeControlObject?: {
			control?: 'targetRevisionId' | 'requiredRevisionId' | Expression<string>;
			value?: string | Expression<string>;
		};
	};
};

export type GoogleDocsV2Params =
	| GoogleDocsV2DocumentCreateConfig
	| GoogleDocsV2DocumentGetConfig
	| GoogleDocsV2DocumentUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleDocsV2Credentials {
	googleApi: CredentialReference;
	googleDocsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GoogleDocsV2Node = {
	type: 'n8n-nodes-base.googleDocs';
	version: 1 | 2;
	config: NodeConfig<GoogleDocsV2Params>;
	credentials?: GoogleDocsV2Credentials;
};

export type GoogleDocsNode = GoogleDocsV2Node;
