/**
 * Discord Node - Version 1
 * Sends data to Discord
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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
// Node Type
// ===========================================================================

export type DiscordV1Node = {
	type: 'n8n-nodes-base.discord';
	version: 1;
	config: NodeConfig<DiscordV1Params>;
	credentials?: Record<string, never>;
};