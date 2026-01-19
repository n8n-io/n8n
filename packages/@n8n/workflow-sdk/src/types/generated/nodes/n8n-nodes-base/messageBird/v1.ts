/**
 * MessageBird Node - Version 1
 * Sends SMS via MessageBird
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Send text messages (SMS) */
export type MessageBirdV1SmsSendConfig = {
	resource: 'sms';
	operation: 'send';
/**
 * The number from which to send the message
 * @displayOptions.show { operation: ["send"], resource: ["sms"] }
 */
		originator: string | Expression<string>;
/**
 * All recipients separated by commas
 * @displayOptions.show { operation: ["send"], resource: ["sms"] }
 */
		recipients: string | Expression<string>;
/**
 * The message to be send
 * @displayOptions.show { operation: ["send"], resource: ["sms"] }
 */
		message: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get the balance */
export type MessageBirdV1BalanceGetConfig = {
	resource: 'balance';
	operation: 'get';
};

export type MessageBirdV1Params =
	| MessageBirdV1SmsSendConfig
	| MessageBirdV1BalanceGetConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MessageBirdV1Credentials {
	messageBirdApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MessageBirdV1NodeBase {
	type: 'n8n-nodes-base.messageBird';
	version: 1;
	credentials?: MessageBirdV1Credentials;
}

export type MessageBirdV1SmsSendNode = MessageBirdV1NodeBase & {
	config: NodeConfig<MessageBirdV1SmsSendConfig>;
};

export type MessageBirdV1BalanceGetNode = MessageBirdV1NodeBase & {
	config: NodeConfig<MessageBirdV1BalanceGetConfig>;
};

export type MessageBirdV1Node =
	| MessageBirdV1SmsSendNode
	| MessageBirdV1BalanceGetNode
	;