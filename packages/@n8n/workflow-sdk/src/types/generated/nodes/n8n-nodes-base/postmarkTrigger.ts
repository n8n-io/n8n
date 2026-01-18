/**
 * Postmark Trigger Node Types
 *
 * Starts the workflow when Postmark events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/postmarktrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	 * @default false
	 */
	firstOpen?: boolean | Expression<boolean>;
	/**
	 * Whether to include message content for events "Bounce" and "Spam Complaint"
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
// Node Type
// ===========================================================================

export type PostmarkTriggerNode = {
	type: 'n8n-nodes-base.postmarkTrigger';
	version: 1;
	config: NodeConfig<PostmarkTriggerV1Params>;
	credentials?: PostmarkTriggerV1Credentials;
	isTrigger: true;
};
