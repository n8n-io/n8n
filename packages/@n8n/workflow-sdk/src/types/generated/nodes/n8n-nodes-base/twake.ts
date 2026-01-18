/**
 * Twake Node Types
 *
 * Consume Twake API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/twake/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Send data to the message app */
export type TwakeV1MessageSendConfig = {
	resource: 'message';
	operation: 'send';
	/**
	 * Channel's ID. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId?: string | Expression<string>;
	/**
	 * Message content
	 */
	content: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type TwakeV1Params = TwakeV1MessageSendConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface TwakeV1Credentials {
	twakeCloudApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type TwakeV1Node = {
	type: 'n8n-nodes-base.twake';
	version: 1;
	config: NodeConfig<TwakeV1Params>;
	credentials?: TwakeV1Credentials;
};

export type TwakeNode = TwakeV1Node;
