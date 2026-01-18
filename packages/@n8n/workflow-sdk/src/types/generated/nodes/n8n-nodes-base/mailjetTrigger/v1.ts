/**
 * Mailjet Trigger Node - Version 1
 * Handle Mailjet events via webhooks
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MailjetTriggerV1Params {
/**
 * Determines which resource events the webhook is triggered for
 * @default open
 */
		event: 'blocked' | 'bounce' | 'open' | 'sent' | 'spam' | 'unsub' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MailjetTriggerV1Credentials {
	mailjetEmailApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MailjetTriggerV1Node = {
	type: 'n8n-nodes-base.mailjetTrigger';
	version: 1;
	config: NodeConfig<MailjetTriggerV1Params>;
	credentials?: MailjetTriggerV1Credentials;
	isTrigger: true;
};