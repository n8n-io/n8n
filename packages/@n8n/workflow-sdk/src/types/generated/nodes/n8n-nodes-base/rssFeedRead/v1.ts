/**
 * RSS Read Node - Version 1
 * Reads data from an RSS Feed
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RssFeedReadV1Config {
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
// Node Types
// ===========================================================================

interface RssFeedReadV1NodeBase {
	type: 'n8n-nodes-base.rssFeedRead';
	version: 1;
}

export type RssFeedReadV1Node = RssFeedReadV1NodeBase & {
	config: NodeConfig<RssFeedReadV1Config>;
};

export type RssFeedReadV1Node = RssFeedReadV1Node;