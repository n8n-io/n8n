/**
 * Mailjet Trigger Node - Version 1
 * Handle Mailjet events via webhooks
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
// Node Types
// ===========================================================================

interface MailjetTriggerV1NodeBase {
	type: 'n8n-nodes-base.mailjetTrigger';
	version: 1;
	credentials?: MailjetTriggerV1Credentials;
	isTrigger: true;
}

export type MailjetTriggerV1ParamsNode = MailjetTriggerV1NodeBase & {
	config: NodeConfig<MailjetTriggerV1Params>;
};

export type MailjetTriggerV1Node = MailjetTriggerV1ParamsNode;