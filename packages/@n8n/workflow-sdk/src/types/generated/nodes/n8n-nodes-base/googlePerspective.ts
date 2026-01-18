/**
 * Google Perspective Node Types
 *
 * Consume Google Perspective API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googleperspective/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface GooglePerspectiveV1Params {
	operation?: 'analyzeComment' | Expression<string>;
	text: string | Expression<string>;
	requestedAttributesUi: Record<string, unknown>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GooglePerspectiveV1Credentials {
	googlePerspectiveOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GooglePerspectiveNode = {
	type: 'n8n-nodes-base.googlePerspective';
	version: 1;
	config: NodeConfig<GooglePerspectiveV1Params>;
	credentials?: GooglePerspectiveV1Credentials;
};
