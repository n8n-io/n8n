/**
 * RSS Read Node Types
 *
 * Reads data from an RSS Feed
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/rssfeedread/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RssFeedReadV12Params {
	/**
	 * URL of the RSS feed
	 */
	url: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type RssFeedReadNode = {
	type: 'n8n-nodes-base.rssFeedRead';
	version: 1 | 1.1 | 1.2;
	config: NodeConfig<RssFeedReadV12Params>;
	credentials?: Record<string, never>;
};
