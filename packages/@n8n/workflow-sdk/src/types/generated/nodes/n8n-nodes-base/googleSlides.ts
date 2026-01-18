/**
 * Google Slides Node Types
 *
 * Consume the Google Slides API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googleslides/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get a presentation */
export type GoogleSlidesV2PageGetConfig = {
	resource: 'page';
	operation: 'get';
	/**
	 * ID of the presentation to retrieve. Found in the presentation URL: &lt;code&gt;https://docs.google.com/presentation/d/PRESENTATION_ID/edit&lt;/code&gt;
	 */
	presentationId: string | Expression<string>;
	/**
	 * ID of the page object to retrieve
	 */
	pageObjectId: string | Expression<string>;
};

/** Get a thumbnail */
export type GoogleSlidesV2PageGetThumbnailConfig = {
	resource: 'page';
	operation: 'getThumbnail';
	/**
	 * ID of the presentation to retrieve. Found in the presentation URL: &lt;code&gt;https://docs.google.com/presentation/d/PRESENTATION_ID/edit&lt;/code&gt;
	 */
	presentationId: string | Expression<string>;
	/**
	 * ID of the page object to retrieve
	 */
	pageObjectId: string | Expression<string>;
	/**
	 * Name of the binary property to which to write the data of the read page
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
	 */
	title: string | Expression<string>;
};

/** Get a presentation */
export type GoogleSlidesV2PresentationGetConfig = {
	resource: 'presentation';
	operation: 'get';
	/**
	 * ID of the presentation to retrieve. Found in the presentation URL: &lt;code&gt;https://docs.google.com/presentation/d/PRESENTATION_ID/edit&lt;/code&gt;
	 */
	presentationId: string | Expression<string>;
};

/** Get presentation slides */
export type GoogleSlidesV2PresentationGetSlidesConfig = {
	resource: 'presentation';
	operation: 'getSlides';
	/**
	 * ID of the presentation to retrieve. Found in the presentation URL: &lt;code&gt;https://docs.google.com/presentation/d/PRESENTATION_ID/edit&lt;/code&gt;
	 */
	presentationId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	presentationId: string | Expression<string>;
	textUi?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type GoogleSlidesV2Params =
	| GoogleSlidesV2PageGetConfig
	| GoogleSlidesV2PageGetThumbnailConfig
	| GoogleSlidesV2PresentationCreateConfig
	| GoogleSlidesV2PresentationGetConfig
	| GoogleSlidesV2PresentationGetSlidesConfig
	| GoogleSlidesV2PresentationReplaceTextConfig;

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

export type GoogleSlidesNode = {
	type: 'n8n-nodes-base.googleSlides';
	version: 1 | 2;
	config: NodeConfig<GoogleSlidesV2Params>;
	credentials?: GoogleSlidesV2Credentials;
};
