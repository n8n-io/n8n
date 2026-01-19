/**
 * Postmark Trigger Node - Version 1
 * Starts the workflow when Postmark events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface PostmarkTriggerV1Params {
/**
 * Webhook events that will be enabled for that endpoint
 * @default []
 */
		events: Array<'bounce' | 'click' | 'delivery' | 'open' | 'spamComplaint' | 'subscriptionChange'>;
/**
 * Only fires on first open for event "Open"
 * @displayOptions.show { events: ["open"] }
 * @default false
 */
		firstOpen?: boolean | Expression<boolean>;
/**
 * Whether to include message content for events "Bounce" and "Spam Complaint"
 * @displayOptions.show { events: ["bounce", "spamComplaint"] }
 * @default false
 */
		includeContent?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface PostmarkTriggerV1Credentials {
	postmarkApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface PostmarkTriggerV1NodeBase {
	type: 'n8n-nodes-base.postmarkTrigger';
	version: 1;
	credentials?: PostmarkTriggerV1Credentials;
	isTrigger: true;
}

export type PostmarkTriggerV1ParamsNode = PostmarkTriggerV1NodeBase & {
	config: NodeConfig<PostmarkTriggerV1Params>;
};

export type PostmarkTriggerV1Node = PostmarkTriggerV1ParamsNode;