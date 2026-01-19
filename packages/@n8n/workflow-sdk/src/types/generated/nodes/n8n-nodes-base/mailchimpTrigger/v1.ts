/**
 * Mailchimp Trigger Node - Version 1
 * Handle Mailchimp events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MailchimpTriggerV1Config {
	authentication?: 'apiKey' | 'oAuth2' | Expression<string>;
/**
 * The list that is gonna fire the event. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		list: string | Expression<string>;
/**
 * The events that can trigger the webhook and whether they are enabled
 * @default []
 */
		events: Array<'campaign' | 'cleaned' | 'upemail' | 'profile' | 'subscribe' | 'unsubscribe'>;
/**
 * The possible sources of any events that can trigger the webhook and whether they are enabled
 * @default []
 */
		sources: Array<'user' | 'admin' | 'api'>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MailchimpTriggerV1Credentials {
	mailchimpApi: CredentialReference;
	mailchimpOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MailchimpTriggerV1NodeBase {
	type: 'n8n-nodes-base.mailchimpTrigger';
	version: 1;
	credentials?: MailchimpTriggerV1Credentials;
	isTrigger: true;
}

export type MailchimpTriggerV1Node = MailchimpTriggerV1NodeBase & {
	config: NodeConfig<MailchimpTriggerV1Config>;
};

export type MailchimpTriggerV1Node = MailchimpTriggerV1Node;