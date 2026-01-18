/**
 * Yourls Node Types
 *
 * Consume Yourls API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/yourls/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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

export type YourlsV1Params =
	| YourlsV1UrlExpandConfig
	| YourlsV1UrlShortenConfig
	| YourlsV1UrlStatsConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface YourlsV1Credentials {
	yourlsApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type YourlsV1Node = {
	type: 'n8n-nodes-base.yourls';
	version: 1;
	config: NodeConfig<YourlsV1Params>;
	credentials?: YourlsV1Credentials;
};

export type YourlsNode = YourlsV1Node;
