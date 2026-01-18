/**
 * Google Slides Node - Version 2
 * Consume the Google Slides API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get a presentation */
export type GoogleSlidesV2PageGetConfig = {
	resource: 'page';
	operation: 'get';
/**
 * ID of the presentation to retrieve. Found in the presentation URL: &lt;code&gt;https://docs.google.com/presentation/d/PRESENTATION_ID/edit&lt;/code&gt;
 * @displayOptions.show { resource: ["presentation", "page"], operation: ["get", "getThumbnail", "getSlides", "replaceText"] }
 */
		presentationId: string | Expression<string>;
/**
 * ID of the page object to retrieve
 * @displayOptions.show { resource: ["page"], operation: ["get", "getThumbnail"] }
 */
		pageObjectId: string | Expression<string>;
};

/** Get a thumbnail */
export type GoogleSlidesV2PageGetThumbnailConfig = {
	resource: 'page';
	operation: 'getThumbnail';
/**
 * ID of the presentation to retrieve. Found in the presentation URL: &lt;code&gt;https://docs.google.com/presentation/d/PRESENTATION_ID/edit&lt;/code&gt;
 * @displayOptions.show { resource: ["presentation", "page"], operation: ["get", "getThumbnail", "getSlides", "replaceText"] }
 */
		presentationId: string | Expression<string>;
/**
 * ID of the page object to retrieve
 * @displayOptions.show { resource: ["page"], operation: ["get", "getThumbnail"] }
 */
		pageObjectId: string | Expression<string>;
/**
 * Name of the binary property to which to write the data of the read page
 * @displayOptions.show { resource: ["page"], operation: ["getThumbnail"] }
 * @default false
 */
		download?: boolean | Expression<boolean>;
	binaryProperty: string | Expression<string>;
};

/** Create a presentation */
export type GoogleSlidesV2PresentationCreateConfig = {
	resource: 'presentation';
	operation: 'create';
/**
 * Title of the presentation to create
 * @displayOptions.show { resource: ["presentation"], operation: ["create"] }
 */
		title: string | Expression<string>;
};

/** Get a presentation */
export type GoogleSlidesV2PresentationGetConfig = {
	resource: 'presentation';
	operation: 'get';
/**
 * ID of the presentation to retrieve. Found in the presentation URL: &lt;code&gt;https://docs.google.com/presentation/d/PRESENTATION_ID/edit&lt;/code&gt;
 * @displayOptions.show { resource: ["presentation", "page"], operation: ["get", "getThumbnail", "getSlides", "replaceText"] }
 */
		presentationId: string | Expression<string>;
};

/** Get presentation slides */
export type GoogleSlidesV2PresentationGetSlidesConfig = {
	resource: 'presentation';
	operation: 'getSlides';
/**
 * ID of the presentation to retrieve. Found in the presentation URL: &lt;code&gt;https://docs.google.com/presentation/d/PRESENTATION_ID/edit&lt;/code&gt;
 * @displayOptions.show { resource: ["presentation", "page"], operation: ["get", "getThumbnail", "getSlides", "replaceText"] }
 */
		presentationId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getSlides"], resource: ["presentation"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getSlides"], resource: ["presentation"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Replace text in a presentation */
export type GoogleSlidesV2PresentationReplaceTextConfig = {
	resource: 'presentation';
	operation: 'replaceText';
/**
 * ID of the presentation to retrieve. Found in the presentation URL: &lt;code&gt;https://docs.google.com/presentation/d/PRESENTATION_ID/edit&lt;/code&gt;
 * @displayOptions.show { resource: ["presentation", "page"], operation: ["get", "getThumbnail", "getSlides", "replaceText"] }
 */
		presentationId: string | Expression<string>;
	textUi?: {
		textValues?: Array<{
			/** Whether the search should respect case. True : the search is case sensitive. False : the search is case insensitive.
			 * @default false
			 */
			matchCase?: boolean | Expression<boolean>;
			/** If non-empty, limits the matches to slide elements only on the given slides. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @default []
			 */
			pageObjectIds?: string[];
			/** The text to search for in the slide
			 */
			text?: string | Expression<string>;
			/** The text that will replace the matched text
			 */
			replaceText?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};

export type GoogleSlidesV2Params =
	| GoogleSlidesV2PageGetConfig
	| GoogleSlidesV2PageGetThumbnailConfig
	| GoogleSlidesV2PresentationCreateConfig
	| GoogleSlidesV2PresentationGetConfig
	| GoogleSlidesV2PresentationGetSlidesConfig
	| GoogleSlidesV2PresentationReplaceTextConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleSlidesV2Credentials {
	googleApi: CredentialReference;
	googleSlidesOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GoogleSlidesV2Node = {
	type: 'n8n-nodes-base.googleSlides';
	version: 1 | 2;
	config: NodeConfig<GoogleSlidesV2Params>;
	credentials?: GoogleSlidesV2Credentials;
};