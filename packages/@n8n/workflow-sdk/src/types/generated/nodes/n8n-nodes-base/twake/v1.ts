/**
 * Twake Node - Version 1
 * Consume Twake API
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


// ===========================================================================
// Credentials
// ===========================================================================

export interface TwakeV1Credentials {
	twakeCloudApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TwakeV1NodeBase {
	type: 'n8n-nodes-base.twake';
	version: 1;
	credentials?: TwakeV1Credentials;
}

export type TwakeV1MessageSendNode = TwakeV1NodeBase & {
	config: NodeConfig<TwakeV1MessageSendConfig>;
};

export type TwakeV1Node = TwakeV1MessageSendNode;