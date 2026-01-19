/**
 * Telegram Trigger Node - Version 1
 * Starts the workflow on a Telegram update
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TelegramTriggerV1Config {
	updates: Array<'*' | 'callback_query' | 'channel_post' | 'edited_channel_post' | 'edited_message' | 'inline_query' | 'message' | 'poll' | 'pre_checkout_query' | 'shipping_query'>;
	additionalFields?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface TelegramTriggerV1Credentials {
	telegramApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TelegramTriggerV1NodeBase {
	type: 'n8n-nodes-base.telegramTrigger';
	version: 1;
	credentials?: TelegramTriggerV1Credentials;
	isTrigger: true;
}

export type TelegramTriggerV1Node = TelegramTriggerV1NodeBase & {
	config: NodeConfig<TelegramTriggerV1Config>;
};

export type TelegramTriggerV1Node = TelegramTriggerV1Node;