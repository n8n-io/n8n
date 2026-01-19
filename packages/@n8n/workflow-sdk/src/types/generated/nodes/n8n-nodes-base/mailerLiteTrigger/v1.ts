/**
 * MailerLite Trigger Node - Version 1
 * Starts the workflow when MailerLite events occur
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
// Node Types
// ===========================================================================

interface MailerLiteTriggerV1NodeBase {
	type: 'n8n-nodes-base.mailerLiteTrigger';
	version: 1;
	credentials?: MailerLiteTriggerV1Credentials;
	isTrigger: true;
}

export type MailerLiteTriggerV1ParamsNode = MailerLiteTriggerV1NodeBase & {
	config: NodeConfig<MailerLiteTriggerV1Params>;
};

export type MailerLiteTriggerV1Node = MailerLiteTriggerV1ParamsNode;