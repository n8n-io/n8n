/**
 * MSG91 Node - Version 1
 * Sends transactional SMS via MSG91
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Send SMS */
export type Msg91V1SmsSendConfig = {
	resource: 'sms';
	operation: 'send';
/**
 * The number from which to send the message
 * @displayOptions.show { operation: ["send"], resource: ["sms"] }
 */
		from: string | Expression<string>;
/**
 * The number, with coutry code, to which to send the message
 * @displayOptions.show { operation: ["send"], resource: ["sms"] }
 */
		to: string | Expression<string>;
/**
 * The message to send
 * @displayOptions.show { operation: ["send"], resource: ["sms"] }
 */
		message: string | Expression<string>;
};

export type Msg91V1Params =
	| Msg91V1SmsSendConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface Msg91V1Credentials {
	msg91Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type Msg91V1Node = {
	type: 'n8n-nodes-base.msg91';
	version: 1;
	config: NodeConfig<Msg91V1Params>;
	credentials?: Msg91V1Credentials;
};