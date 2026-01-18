/**
 * MailerLite Trigger Node Types
 *
 * Starts the workflow when MailerLite events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mailerlitetrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MailerLiteTriggerV2Params {
	/**
	 * The events to listen to
	 * @default []
	 */
	events: Array<
		| 'campaign.sent'
		| 'subscriber.added_to_group'
		| 'subscriber.automation_completed'
		| 'subscriber.automation_triggered'
		| 'subscriber.bounced'
		| 'subscriber.created'
		| 'subscriber.removed_from_group'
		| 'subscriber.spam_reported'
		| 'subscriber.unsubscribed'
		| 'subscriber.updated'
	>;
}

export interface MailerLiteTriggerV1Params {
	/**
	 * The events to listen to
	 * @default []
	 */
	event:
		| 'campaign.sent'
		| 'subscriber.added_through_webform'
		| 'subscriber.add_to_group'
		| 'subscriber.automation_complete'
		| 'subscriber.automation_triggered'
		| 'subscriber.bounced'
		| 'subscriber.complaint'
		| 'subscriber.create'
		| 'subscriber.remove_from_group'
		| 'subscriber.unsubscribe'
		| 'subscriber.update'
		| Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MailerLiteTriggerV2Credentials {
	mailerLiteApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MailerLiteTriggerNode = {
	type: 'n8n-nodes-base.mailerLiteTrigger';
	version: 1 | 2;
	config: NodeConfig<MailerLiteTriggerV2Params>;
	credentials?: MailerLiteTriggerV2Credentials;
	isTrigger: true;
};
