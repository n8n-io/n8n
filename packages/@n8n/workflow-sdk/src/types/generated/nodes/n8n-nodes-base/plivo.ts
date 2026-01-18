/**
 * Plivo Node Types
 *
 * Send SMS/MMS messages or make phone calls
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/plivo/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Make a voice call */
export type PlivoV1CallMakeConfig = {
	resource: 'call';
	operation: 'make';
	/**
	 * Caller ID for the call to make
	 */
	from: string | Expression<string>;
	/**
	 * Phone number to make the call to
	 */
	to: string | Expression<string>;
	/**
	 * HTTP verb to be used when invoking the Answer URL
	 * @default POST
	 */
	answer_method: 'GET' | 'POST' | Expression<string>;
	/**
	 * URL to be invoked by Plivo once the call is answered. It should return the XML to handle the call once answered.
	 */
	answer_url: string | Expression<string>;
};

/** Send an SMS message */
export type PlivoV1MmsSendConfig = {
	resource: 'mms';
	operation: 'send';
	/**
	 * Plivo Number to send the MMS from
	 */
	from: string | Expression<string>;
	/**
	 * Phone number to send the MMS to
	 */
	to: string | Expression<string>;
	/**
	 * Message to send
	 */
	message?: string | Expression<string>;
	/**
	 * Comma-separated list of media URLs of the files from your file server
	 */
	media_urls?: string | Expression<string>;
};

/** Send an SMS message */
export type PlivoV1SmsSendConfig = {
	resource: 'sms';
	operation: 'send';
	/**
	 * Plivo Number to send the SMS from
	 */
	from: string | Expression<string>;
	/**
	 * Phone number to send the message to
	 */
	to: string | Expression<string>;
	/**
	 * Message to send
	 */
	message: string | Expression<string>;
};

export type PlivoV1Params = PlivoV1CallMakeConfig | PlivoV1MmsSendConfig | PlivoV1SmsSendConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface PlivoV1Credentials {
	plivoApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type PlivoNode = {
	type: 'n8n-nodes-base.plivo';
	version: 1;
	config: NodeConfig<PlivoV1Params>;
	credentials?: PlivoV1Credentials;
};
