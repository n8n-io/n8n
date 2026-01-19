/**
 * Plivo Node - Version 1
 * Send SMS/MMS messages or make phone calls
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Make a voice call */
export type PlivoV1CallMakeConfig = {
	resource: 'call';
	operation: 'make';
/**
 * Caller ID for the call to make
 * @displayOptions.show { resource: ["call"], operation: ["make"] }
 */
		from: string | Expression<string>;
/**
 * Phone number to make the call to
 * @displayOptions.show { resource: ["call"], operation: ["make"] }
 */
		to: string | Expression<string>;
/**
 * HTTP verb to be used when invoking the Answer URL
 * @displayOptions.show { resource: ["call"], operation: ["make"] }
 * @default POST
 */
		answer_method: 'GET' | 'POST' | Expression<string>;
/**
 * URL to be invoked by Plivo once the call is answered. It should return the XML to handle the call once answered.
 * @displayOptions.show { resource: ["call"], operation: ["make"] }
 */
		answer_url: string | Expression<string>;
};

/** Send an SMS message */
export type PlivoV1MmsSendConfig = {
	resource: 'mms';
	operation: 'send';
/**
 * Plivo Number to send the MMS from
 * @displayOptions.show { resource: ["mms"], operation: ["send"] }
 */
		from: string | Expression<string>;
/**
 * Phone number to send the MMS to
 * @displayOptions.show { operation: ["send"], resource: ["mms"] }
 */
		to: string | Expression<string>;
/**
 * Message to send
 * @displayOptions.show { resource: ["mms"], operation: ["send"] }
 */
		message?: string | Expression<string>;
/**
 * Comma-separated list of media URLs of the files from your file server
 * @displayOptions.show { resource: ["mms"], operation: ["send"] }
 */
		media_urls?: string | Expression<string>;
};

/** Send an SMS message */
export type PlivoV1SmsSendConfig = {
	resource: 'sms';
	operation: 'send';
/**
 * Plivo Number to send the SMS from
 * @displayOptions.show { resource: ["sms"], operation: ["send"] }
 */
		from: string | Expression<string>;
/**
 * Phone number to send the message to
 * @displayOptions.show { resource: ["sms"], operation: ["send"] }
 */
		to: string | Expression<string>;
/**
 * Message to send
 * @displayOptions.show { operation: ["send"], resource: ["sms"] }
 */
		message: string | Expression<string>;
};

export type PlivoV1Params =
	| PlivoV1CallMakeConfig
	| PlivoV1MmsSendConfig
	| PlivoV1SmsSendConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type PlivoV1CallMakeOutput = {
	api_id?: string;
	message?: string;
	request_uuid?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface PlivoV1Credentials {
	plivoApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface PlivoV1NodeBase {
	type: 'n8n-nodes-base.plivo';
	version: 1;
	credentials?: PlivoV1Credentials;
}

export type PlivoV1CallMakeNode = PlivoV1NodeBase & {
	config: NodeConfig<PlivoV1CallMakeConfig>;
	output?: PlivoV1CallMakeOutput;
};

export type PlivoV1MmsSendNode = PlivoV1NodeBase & {
	config: NodeConfig<PlivoV1MmsSendConfig>;
};

export type PlivoV1SmsSendNode = PlivoV1NodeBase & {
	config: NodeConfig<PlivoV1SmsSendConfig>;
};

export type PlivoV1Node =
	| PlivoV1CallMakeNode
	| PlivoV1MmsSendNode
	| PlivoV1SmsSendNode
	;