/**
 * Twake Node - Version 1
 * Consume Twake API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Send data to the message app */
export type TwakeV1MessageSendConfig = {
	resource: 'message';
	operation: 'send';
/**
 * Channel's ID. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["send"] }
 */
		channelId?: string | Expression<string>;
/**
 * Message content
 * @displayOptions.show { operation: ["send"] }
 */
		content: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type TwakeV1Params =
	| TwakeV1MessageSendConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface TwakeV1Credentials {
	twakeCloudApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type TwakeV1Node = {
	type: 'n8n-nodes-base.twake';
	version: 1;
	config: NodeConfig<TwakeV1Params>;
	credentials?: TwakeV1Credentials;
};