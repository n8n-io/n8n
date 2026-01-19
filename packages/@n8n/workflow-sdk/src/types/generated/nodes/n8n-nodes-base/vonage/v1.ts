/**
 * Vonage Node - Version 1
 * Consume Vonage API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type VonageV1SmsSendConfig = {
	resource: 'sms';
	operation: 'send';
/**
 * The name or number the message should be sent from
 * @displayOptions.show { resource: ["sms"], operation: ["send"] }
 */
		from?: string | Expression<string>;
/**
 * The number that the message should be sent to. Numbers are specified in E.164 format.
 * @displayOptions.show { resource: ["sms"], operation: ["send"] }
 */
		to?: string | Expression<string>;
/**
 * The body of the message being sent
 * @displayOptions.show { resource: ["sms"], operation: ["send"] }
 */
		message?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type VonageV1SmsSendOutput = {
	'message-id'?: string;
	'message-price'?: string;
	network?: string;
	'remaining-balance'?: string;
	status?: string;
	to?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface VonageV1Credentials {
	vonageApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface VonageV1NodeBase {
	type: 'n8n-nodes-base.vonage';
	version: 1;
	credentials?: VonageV1Credentials;
}

export type VonageV1SmsSendNode = VonageV1NodeBase & {
	config: NodeConfig<VonageV1SmsSendConfig>;
	output?: VonageV1SmsSendOutput;
};

export type VonageV1Node = VonageV1SmsSendNode;