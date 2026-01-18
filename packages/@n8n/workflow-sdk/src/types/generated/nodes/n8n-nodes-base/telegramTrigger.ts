/**
 * Telegram Trigger Node Types
 *
 * Starts the workflow on a Telegram update
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/telegramtrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TelegramTriggerV12Params {
	updates: Array<
		| '*'
		| 'callback_query'
		| 'channel_post'
		| 'edited_channel_post'
		| 'edited_message'
		| 'inline_query'
		| 'message'
		| 'poll'
		| 'pre_checkout_query'
		| 'shipping_query'
	>;
	additionalFields?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface TelegramTriggerV12Credentials {
	telegramApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type TelegramTriggerNode = {
	type: 'n8n-nodes-base.telegramTrigger';
	version: 1 | 1.1 | 1.2;
	config: NodeConfig<TelegramTriggerV12Params>;
	credentials?: TelegramTriggerV12Credentials;
	isTrigger: true;
};
