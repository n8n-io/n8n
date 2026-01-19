/**
 * MailerLite Trigger Node - Version 2
 * Starts the workflow when MailerLite events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MailerLiteTriggerV2Config {
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
// Node Types
// ===========================================================================

interface MailerLiteTriggerV2NodeBase {
	type: 'n8n-nodes-base.mailerLiteTrigger';
	version: 2;
	credentials?: MailerLiteTriggerV2Credentials;
	isTrigger: true;
}

export type MailerLiteTriggerV2Node = MailerLiteTriggerV2NodeBase & {
	config: NodeConfig<MailerLiteTriggerV2Config>;
};

export type MailerLiteTriggerV2Node = MailerLiteTriggerV2Node;