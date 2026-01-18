/**
 * MailerLite Trigger Node - Version 1
 * Starts the workflow when MailerLite events occur
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MailerLiteTriggerV1Params {
/**
 * The events to listen to
 * @default []
 */
		event: 'campaign.sent' | 'subscriber.added_through_webform' | 'subscriber.add_to_group' | 'subscriber.automation_complete' | 'subscriber.automation_triggered' | 'subscriber.bounced' | 'subscriber.complaint' | 'subscriber.create' | 'subscriber.remove_from_group' | 'subscriber.unsubscribe' | 'subscriber.update' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MailerLiteTriggerV1Credentials {
	mailerLiteApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MailerLiteTriggerV1Node = {
	type: 'n8n-nodes-base.mailerLiteTrigger';
	version: 1;
	config: NodeConfig<MailerLiteTriggerV1Params>;
	credentials?: MailerLiteTriggerV1Credentials;
	isTrigger: true;
};