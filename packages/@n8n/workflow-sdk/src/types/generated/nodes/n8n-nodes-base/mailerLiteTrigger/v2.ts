/**
 * MailerLite Trigger Node - Version 2
 * Starts the workflow when MailerLite events occur
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MailerLiteTriggerV2Params {
/**
 * The events to listen to
 * @default []
 */
		events: Array<'campaign.sent' | 'subscriber.added_to_group' | 'subscriber.automation_completed' | 'subscriber.automation_triggered' | 'subscriber.bounced' | 'subscriber.created' | 'subscriber.removed_from_group' | 'subscriber.spam_reported' | 'subscriber.unsubscribed' | 'subscriber.updated'>;
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

export type MailerLiteTriggerV2Node = {
	type: 'n8n-nodes-base.mailerLiteTrigger';
	version: 2;
	config: NodeConfig<MailerLiteTriggerV2Params>;
	credentials?: MailerLiteTriggerV2Credentials;
	isTrigger: true;
};