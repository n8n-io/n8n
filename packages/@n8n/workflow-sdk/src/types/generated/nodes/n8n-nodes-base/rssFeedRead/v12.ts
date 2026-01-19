/**
 * RSS Read Node - Version 1.2
 * Reads data from an RSS Feed
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

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
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface RssFeedReadV12NodeBase {
	type: 'n8n-nodes-base.rssFeedRead';
	version: 1.2;
}

export type RssFeedReadV12ParamsNode = RssFeedReadV12NodeBase & {
	config: NodeConfig<RssFeedReadV12Params>;
};

export type RssFeedReadV12Node = RssFeedReadV12ParamsNode;