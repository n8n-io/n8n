/**
 * Twilio Node - Version 1
 * Send SMS and WhatsApp messages or make phone calls
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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

export type TwilioV1Params =
	| TwilioV1CallMakeConfig
	| TwilioV1SmsSendConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface TwilioV1Credentials {
	twilioApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type TwilioV1Node = {
	type: 'n8n-nodes-base.twilio';
	version: 1;
	config: NodeConfig<TwilioV1Params>;
	credentials?: TwilioV1Credentials;
};