/**
 * Google Perspective Node - Version 1
 * Consume Google Perspective API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface GooglePerspectiveV1Params {
	operation?: 'analyzeComment' | Expression<string>;
	text: string | Expression<string>;
	requestedAttributesUi: {
		requestedAttributesValues?: Array<{
			/** Attribute to analyze in the text. Details &lt;a href="https://developers.perspectiveapi.com/s/about-the-api-attributes-and-languages"&gt;here&lt;/a&gt;.
			 * @default flirtation
			 */
			attributeName?: 'flirtation' | 'identity_attack' | 'insult' | 'profanity' | 'severe_toxicity' | 'sexually_explicit' | 'threat' | 'toxicity' | Expression<string>;
			/** Score above which to return results. At zero, all scores are returned.
			 * @default 0
			 */
			scoreThreshold?: number | Expression<number>;
		}>;
	};
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GooglePerspectiveV1Credentials {
	googlePerspectiveOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GooglePerspectiveV1NodeBase {
	type: 'n8n-nodes-base.googlePerspective';
	version: 1;
	credentials?: GooglePerspectiveV1Credentials;
}

export type GooglePerspectiveV1ParamsNode = GooglePerspectiveV1NodeBase & {
	config: NodeConfig<GooglePerspectiveV1Params>;
};

export type GooglePerspectiveV1Node = GooglePerspectiveV1ParamsNode;