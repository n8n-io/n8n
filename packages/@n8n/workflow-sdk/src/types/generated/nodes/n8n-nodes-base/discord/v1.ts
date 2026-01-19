/**
 * Discord Node - Version 1
 * Sends data to Discord
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface DiscordV1Params {
	webhookUri: string | Expression<string>;
	text?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface DiscordV1NodeBase {
	type: 'n8n-nodes-base.discord';
	version: 1;
}

export type DiscordV1ParamsNode = DiscordV1NodeBase & {
	config: NodeConfig<DiscordV1Params>;
};

export type DiscordV1Node = DiscordV1ParamsNode;