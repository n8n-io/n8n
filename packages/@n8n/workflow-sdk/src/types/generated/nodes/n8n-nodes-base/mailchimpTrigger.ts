/**
 * Mailchimp Trigger Node Types
 *
 * Handle Mailchimp events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mailchimptrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MailchimpTriggerV1Params {
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

export type MailchimpTriggerV1Node = {
	type: 'n8n-nodes-base.mailchimpTrigger';
	version: 1;
	config: NodeConfig<MailchimpTriggerV1Params>;
	credentials?: MailchimpTriggerV1Credentials;
	isTrigger: true;
};

export type MailchimpTriggerNode = MailchimpTriggerV1Node;
