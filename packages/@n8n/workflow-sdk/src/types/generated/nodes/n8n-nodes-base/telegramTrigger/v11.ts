/**
 * Telegram Trigger Node - Version 1.1
 * Starts the workflow on a Telegram update
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TelegramTriggerV11Config {
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
// Node Types
// ===========================================================================

interface TelegramTriggerV11NodeBase {
	type: 'n8n-nodes-base.telegramTrigger';
	version: 1.1;
	credentials?: TelegramTriggerV11Credentials;
	isTrigger: true;
}

export type TelegramTriggerV11Node = TelegramTriggerV11NodeBase & {
	config: NodeConfig<TelegramTriggerV11Config>;
};

export type TelegramTriggerV11Node = TelegramTriggerV11Node;