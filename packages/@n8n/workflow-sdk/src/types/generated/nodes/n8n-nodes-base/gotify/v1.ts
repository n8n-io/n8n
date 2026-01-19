/**
 * Gotify Node - Version 1
 * Consume Gotify API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type GotifyV1MessageCreateConfig = {
	resource: 'message';
	operation: 'create';
/**
 * The message to send, If using Markdown add the Content Type option
 * @displayOptions.show { resource: ["message"], operation: ["create"] }
 */
		message: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type GotifyV1MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
	messageId: string | Expression<string>;
};

export type GotifyV1MessageGetAllConfig = {
	resource: 'message';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["message"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["message"], operation: ["getAll"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface GotifyV1Credentials {
	gotifyApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GotifyV1NodeBase {
	type: 'n8n-nodes-base.gotify';
	version: 1;
	credentials?: GotifyV1Credentials;
}

export type GotifyV1MessageCreateNode = GotifyV1NodeBase & {
	config: NodeConfig<GotifyV1MessageCreateConfig>;
};

export type GotifyV1MessageDeleteNode = GotifyV1NodeBase & {
	config: NodeConfig<GotifyV1MessageDeleteConfig>;
};

export type GotifyV1MessageGetAllNode = GotifyV1NodeBase & {
	config: NodeConfig<GotifyV1MessageGetAllConfig>;
};

export type GotifyV1Node =
	| GotifyV1MessageCreateNode
	| GotifyV1MessageDeleteNode
	| GotifyV1MessageGetAllNode
	;