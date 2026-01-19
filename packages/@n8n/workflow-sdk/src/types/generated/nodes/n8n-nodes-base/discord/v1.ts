/**
 * Discord Node - Version 1
 * Sends data to Discord
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface DiscordV1Config {
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

export type DiscordV1Node = DiscordV1NodeBase & {
	config: NodeConfig<DiscordV1Config>;
};

export type DiscordV1Node = DiscordV1Node;