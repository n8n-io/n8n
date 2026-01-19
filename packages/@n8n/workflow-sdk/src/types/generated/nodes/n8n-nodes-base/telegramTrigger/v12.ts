/**
 * Telegram Trigger Node - Version 1.2
 * Starts the workflow on a Telegram update
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TelegramTriggerV12Config {
	updates: Array<'*' | 'callback_query' | 'channel_post' | 'edited_channel_post' | 'edited_message' | 'inline_query' | 'message' | 'poll' | 'pre_checkout_query' | 'shipping_query'>;
	additionalFields?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface TelegramTriggerV12Credentials {
	telegramApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TelegramTriggerV12NodeBase {
	type: 'n8n-nodes-base.telegramTrigger';
	version: 1.2;
	credentials?: TelegramTriggerV12Credentials;
	isTrigger: true;
}

export type TelegramTriggerV12Node = TelegramTriggerV12NodeBase & {
	config: NodeConfig<TelegramTriggerV12Config>;
};

export type TelegramTriggerV12Node = TelegramTriggerV12Node;