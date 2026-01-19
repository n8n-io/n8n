/**
 * Yourls Node - Version 1
 * Consume Yourls API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Expand a URL */
export type YourlsV1UrlExpandConfig = {
	resource: 'url';
	operation: 'expand';
/**
 * The short URL to expand
 * @displayOptions.show { resource: ["url"], operation: ["expand"] }
 */
		shortUrl: string | Expression<string>;
};

/** Shorten a URL */
export type YourlsV1UrlShortenConfig = {
	resource: 'url';
	operation: 'shorten';
/**
 * The URL to shorten
 * @displayOptions.show { resource: ["url"], operation: ["shorten"] }
 */
		url: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get stats about one short URL */
export type YourlsV1UrlStatsConfig = {
	resource: 'url';
	operation: 'stats';
/**
 * The short URL for which to get stats
 * @displayOptions.show { resource: ["url"], operation: ["stats"] }
 */
		shortUrl: string | Expression<string>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface YourlsV1Credentials {
	yourlsApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface YourlsV1NodeBase {
	type: 'n8n-nodes-base.yourls';
	version: 1;
	credentials?: YourlsV1Credentials;
}

export type YourlsV1UrlExpandNode = YourlsV1NodeBase & {
	config: NodeConfig<YourlsV1UrlExpandConfig>;
};

export type YourlsV1UrlShortenNode = YourlsV1NodeBase & {
	config: NodeConfig<YourlsV1UrlShortenConfig>;
};

export type YourlsV1UrlStatsNode = YourlsV1NodeBase & {
	config: NodeConfig<YourlsV1UrlStatsConfig>;
};

export type YourlsV1Node =
	| YourlsV1UrlExpandNode
	| YourlsV1UrlShortenNode
	| YourlsV1UrlStatsNode
	;