/**
 * Bitly Node - Version 1
 * Consume Bitly API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
			/** App ID
			 */
			appId?: string | Expression<string>;
			/** App URI Path
			 */
			appUriPath?: string | Expression<string>;
			/** Install Type
			 */
			installType?: string | Expression<string>;
			/** Install URL
			 */
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
			/** App ID
			 */
			appId?: string | Expression<string>;
			/** App URI Path
			 */
			appUriPath?: string | Expression<string>;
			/** Install Type
			 */
			installType?: string | Expression<string>;
			/** Install URL
			 */
			installUrl?: string | Expression<string>;
		}>;
	};
};


// ===========================================================================
// Output Types
// ===========================================================================

export type BitlyV1LinkCreateOutput = {
	archived?: boolean;
	created_at?: string;
	id?: string;
	link?: string;
	long_url?: string;
	references?: {
		group?: string;
	};
	tags?: Array<string>;
};

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

interface BitlyV1NodeBase {
	type: 'n8n-nodes-base.bitly';
	version: 1;
	credentials?: BitlyV1Credentials;
}

export type BitlyV1LinkCreateNode = BitlyV1NodeBase & {
	config: NodeConfig<BitlyV1LinkCreateConfig>;
	output?: BitlyV1LinkCreateOutput;
};

export type BitlyV1LinkGetNode = BitlyV1NodeBase & {
	config: NodeConfig<BitlyV1LinkGetConfig>;
};

export type BitlyV1LinkUpdateNode = BitlyV1NodeBase & {
	config: NodeConfig<BitlyV1LinkUpdateConfig>;
};

export type BitlyV1Node =
	| BitlyV1LinkCreateNode
	| BitlyV1LinkGetNode
	| BitlyV1LinkUpdateNode
	;