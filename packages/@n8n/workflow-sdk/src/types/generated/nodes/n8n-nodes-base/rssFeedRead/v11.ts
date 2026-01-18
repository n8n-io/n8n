/**
 * RSS Read Node - Version 1.1
 * Reads data from an RSS Feed
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RssFeedReadV11Params {
/**
 * URL of the RSS feed
 */
		url: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type RssFeedReadV11Node = {
	type: 'n8n-nodes-base.rssFeedRead';
	version: 1.1;
	config: NodeConfig<RssFeedReadV11Params>;
	credentials?: Record<string, never>;
};