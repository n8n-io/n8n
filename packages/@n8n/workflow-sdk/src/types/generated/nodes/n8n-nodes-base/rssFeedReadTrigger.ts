/**
 * RSS Feed Trigger Node Types
 *
 * Starts a workflow when an RSS feed is updated
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/rssfeedreadtrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RssFeedReadTriggerV1Params {
	/**
	 * Time at which polling should occur
	 * @default {"item":[{"mode":"everyMinute"}]}
	 */
	pollTimes?: Record<string, unknown>;
	/**
	 * URL of the RSS feed to poll
	 * @default https://blog.n8n.io/rss/
	 */
	feedUrl: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type RssFeedReadTriggerV1Node = {
	type: 'n8n-nodes-base.rssFeedReadTrigger';
	version: 1;
	config: NodeConfig<RssFeedReadTriggerV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type RssFeedReadTriggerNode = RssFeedReadTriggerV1Node;
