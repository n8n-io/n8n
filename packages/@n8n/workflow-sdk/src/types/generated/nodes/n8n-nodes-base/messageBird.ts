/**
 * MessageBird Node Types
 *
 * Sends SMS via MessageBird
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/messagebird/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Send text messages (SMS) */
export type MessageBirdV1SmsSendConfig = {
	resource: 'sms';
	operation: 'send';
	/**
	 * The number from which to send the message
	 */
	originator: string | Expression<string>;
	/**
	 * All recipients separated by commas
	 */
	recipients: string | Expression<string>;
	/**
	 * The message to be send
	 */
	message: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get the balance */
export type MessageBirdV1BalanceGetConfig = {
	resource: 'balance';
	operation: 'get';
};

export type MessageBirdV1Params = MessageBirdV1SmsSendConfig | MessageBirdV1BalanceGetConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MessageBirdV1Credentials {
	messageBirdApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MessageBirdV1Node = {
	type: 'n8n-nodes-base.messageBird';
	version: 1;
	config: NodeConfig<MessageBirdV1Params>;
	credentials?: MessageBirdV1Credentials;
};

export type MessageBirdNode = MessageBirdV1Node;
