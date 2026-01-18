/**
 * Telegram Trigger Node - Version 1.1
 * Starts the workflow on a Telegram update
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TelegramTriggerV11Params {
	updates: Array<'*' | 'callback_query' | 'channel_post' | 'edited_channel_post' | 'edited_message' | 'inline_query' | 'message' | 'poll' | 'pre_checkout_query' | 'shipping_query'>;
	additionalFields?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface TelegramTriggerV11Credentials {
	telegramApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type TelegramTriggerV11Node = {
	type: 'n8n-nodes-base.telegramTrigger';
	version: 1.1;
	config: NodeConfig<TelegramTriggerV11Params>;
	credentials?: TelegramTriggerV11Credentials;
	isTrigger: true;
};