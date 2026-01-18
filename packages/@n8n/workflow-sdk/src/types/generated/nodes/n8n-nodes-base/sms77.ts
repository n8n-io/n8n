/**
 * seven Node Types
 *
 * Send SMS and make text-to-speech calls
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/sms77/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Send SMS */
export type Sms77V1SmsSendConfig = {
	resource: 'sms';
	operation: 'send';
	/**
	 * The caller ID displayed in the receivers display. Max 16 numeric or 11 alphanumeric characters.
	 */
	from?: string | Expression<string>;
	/**
	 * The number of your recipient(s) separated by comma. Can be regular numbers or contact/groups from seven.
	 */
	to: string | Expression<string>;
	/**
	 * The message to send. Max. 1520 characters
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
	 */
	to: string | Expression<string>;
	/**
	 * The message to send. Max. 1520 characters
	 */
	message: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type Sms77V1Params = Sms77V1SmsSendConfig | Sms77V1VoiceSendConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface Sms77V1Credentials {
	sms77Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type Sms77V1Node = {
	type: 'n8n-nodes-base.sms77';
	version: 1;
	config: NodeConfig<Sms77V1Params>;
	credentials?: Sms77V1Credentials;
};

export type Sms77Node = Sms77V1Node;
