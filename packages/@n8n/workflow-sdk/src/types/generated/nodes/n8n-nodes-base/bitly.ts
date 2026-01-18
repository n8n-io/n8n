/**
 * Bitly Node Types
 *
 * Consume Bitly API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/bitly/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a link */
export type BitlyV1LinkCreateConfig = {
	resource: 'link';
	operation: 'create';
	longUrl: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	deeplink?: {
		deeplinkUi?: Array<{
			appId?: string | Expression<string>;
			appUriPath?: string | Expression<string>;
			installType?: string | Expression<string>;
			installUrl?: string | Expression<string>;
		}>;
	};
};

/** Get a link */
export type BitlyV1LinkGetConfig = {
	resource: 'link';
	operation: 'get';
	id: string | Expression<string>;
};

/** Update a link */
export type BitlyV1LinkUpdateConfig = {
	resource: 'link';
	operation: 'update';
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	deeplink?: {
		deeplinkUi?: Array<{
			appId?: string | Expression<string>;
			appUriPath?: string | Expression<string>;
			installType?: string | Expression<string>;
			installUrl?: string | Expression<string>;
		}>;
	};
};

export type BitlyV1Params =
	| BitlyV1LinkCreateConfig
	| BitlyV1LinkGetConfig
	| BitlyV1LinkUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface BitlyV1Credentials {
	bitlyApi: CredentialReference;
	bitlyOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type BitlyV1Node = {
	type: 'n8n-nodes-base.bitly';
	version: 1;
	config: NodeConfig<BitlyV1Params>;
	credentials?: BitlyV1Credentials;
};

export type BitlyNode = BitlyV1Node;
