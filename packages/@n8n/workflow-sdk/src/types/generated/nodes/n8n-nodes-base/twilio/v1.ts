/**
 * Twilio Node - Version 1
 * Send SMS and WhatsApp messages or make phone calls
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type TwilioV1CallMakeConfig = {
	resource: 'call';
	operation: 'make';
/**
 * The number from which to send the message
 * @displayOptions.show { operation: ["send", "make"], resource: ["sms", "call"] }
 */
		from: string | Expression<string>;
/**
 * The number to which to send the message
 * @displayOptions.show { operation: ["send", "make"], resource: ["sms", "call"] }
 */
		to: string | Expression<string>;
/**
 * Whether to use the &lt;a href="https://www.twilio.com/docs/voice/twiml"&gt;Twilio Markup Language&lt;/a&gt; in the message
 * @displayOptions.show { operation: ["make"], resource: ["call"] }
 * @default false
 */
		twiml?: boolean | Expression<boolean>;
	message: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Send SMS/MMS/WhatsApp message */
export type TwilioV1SmsSendConfig = {
	resource: 'sms';
	operation: 'send';
/**
 * The number from which to send the message
 * @displayOptions.show { operation: ["send", "make"], resource: ["sms", "call"] }
 */
		from: string | Expression<string>;
/**
 * The number to which to send the message
 * @displayOptions.show { operation: ["send", "make"], resource: ["sms", "call"] }
 */
		to: string | Expression<string>;
/**
 * Whether the message should be sent to WhatsApp
 * @displayOptions.show { operation: ["send"], resource: ["sms"] }
 * @default false
 */
		toWhatsapp?: boolean | Expression<boolean>;
/**
 * The message to send
 * @displayOptions.show { operation: ["send"], resource: ["sms"] }
 */
		message: string | Expression<string>;
	options?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type TwilioV1CallMakeOutput = {
	account_sid?: string;
	annotation?: null;
	answered_by?: null;
	api_version?: string;
	caller_name?: null;
	date_created?: null;
	date_updated?: null;
	direction?: string;
	duration?: null;
	end_time?: null;
	forwarded_from?: null;
	from?: string;
	from_formatted?: string;
	group_sid?: null;
	parent_call_sid?: null;
	price?: null;
	price_unit?: string;
	queue_time?: string;
	sid?: string;
	start_time?: null;
	status?: string;
	subresource_uris?: {
		events?: string;
		notifications?: string;
		payments?: string;
		recordings?: string;
		siprec?: string;
		streams?: string;
		transcriptions?: string;
		user_defined_message_subscriptions?: string;
		user_defined_messages?: string;
	};
	to?: string;
	to_formatted?: string;
	trunk_sid?: null;
	uri?: string;
};

export type TwilioV1SmsSendOutput = {
	account_sid?: string;
	api_version?: string;
	body?: string;
	date_created?: string;
	date_sent?: null;
	date_updated?: string;
	direction?: string;
	error_code?: null;
	error_message?: null;
	from?: string;
	messaging_service_sid?: string;
	num_media?: string;
	num_segments?: string;
	price?: null;
	sid?: string;
	status?: string;
	subresource_uris?: {
		media?: string;
	};
	to?: string;
	uri?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface TwilioV1Credentials {
	twilioApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TwilioV1NodeBase {
	type: 'n8n-nodes-base.twilio';
	version: 1;
	credentials?: TwilioV1Credentials;
}

export type TwilioV1CallMakeNode = TwilioV1NodeBase & {
	config: NodeConfig<TwilioV1CallMakeConfig>;
	output?: TwilioV1CallMakeOutput;
};

export type TwilioV1SmsSendNode = TwilioV1NodeBase & {
	config: NodeConfig<TwilioV1SmsSendConfig>;
	output?: TwilioV1SmsSendOutput;
};

export type TwilioV1Node =
	| TwilioV1CallMakeNode
	| TwilioV1SmsSendNode
	;