/**
 * RSS Read Node - Version 1.1
 * Reads data from an RSS Feed
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
// Node Types
// ===========================================================================

interface RssFeedReadV11NodeBase {
	type: 'n8n-nodes-base.rssFeedRead';
	version: 1.1;
}

export type RssFeedReadV11ParamsNode = RssFeedReadV11NodeBase & {
	config: NodeConfig<RssFeedReadV11Params>;
};

export type RssFeedReadV11Node = RssFeedReadV11ParamsNode;