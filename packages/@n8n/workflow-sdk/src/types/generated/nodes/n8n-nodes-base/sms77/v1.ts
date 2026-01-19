/**
 * seven Node - Version 1
 * Send SMS and make text-to-speech calls
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Send SMS */
export type Sms77V1SmsSendConfig = {
	resource: 'sms';
	operation: 'send';
/**
 * The caller ID displayed in the receivers display. Max 16 numeric or 11 alphanumeric characters.
 * @displayOptions.show { operation: ["send"], resource: ["sms"] }
 */
		from?: string | Expression<string>;
/**
 * The number of your recipient(s) separated by comma. Can be regular numbers or contact/groups from seven.
 * @displayOptions.show { operation: ["send"], resource: ["sms", "voice"] }
 */
		to: string | Expression<string>;
/**
 * The message to send. Max. 1520 characters
 * @displayOptions.show { operation: ["send"], resource: ["sms", "voice"] }
 */
		message: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Send SMS */
export type Sms77V1VoiceSendConfig = {
	resource: 'voice';
	operation: 'send';
/**
 * The number of your recipient(s) separated by comma. Can be regular numbers or contact/groups from seven.
 * @displayOptions.show { operation: ["send"], resource: ["sms", "voice"] }
 */
		to: string | Expression<string>;
/**
 * The message to send. Max. 1520 characters
 * @displayOptions.show { operation: ["send"], resource: ["sms", "voice"] }
 */
		message: string | Expression<string>;
	options?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type Sms77V1SmsSendOutput = {
	debug?: string;
	messages?: Array<{
		parts?: number;
		sender?: string;
		success?: boolean;
		udh?: null;
	}>;
	sms_type?: string;
	success?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface Sms77V1Credentials {
	sms77Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface Sms77V1NodeBase {
	type: 'n8n-nodes-base.sms77';
	version: 1;
	credentials?: Sms77V1Credentials;
}

export type Sms77V1SmsSendNode = Sms77V1NodeBase & {
	config: NodeConfig<Sms77V1SmsSendConfig>;
	output?: Sms77V1SmsSendOutput;
};

export type Sms77V1VoiceSendNode = Sms77V1NodeBase & {
	config: NodeConfig<Sms77V1VoiceSendConfig>;
};

export type Sms77V1Node =
	| Sms77V1SmsSendNode
	| Sms77V1VoiceSendNode
	;