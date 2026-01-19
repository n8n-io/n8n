/**
 * WhatsApp Trigger Node - Version 1
 * Handle WhatsApp events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface WhatsAppTriggerV1Config {
	updates: Array<'account_review_update' | 'account_update' | 'business_capability_update' | 'message_template_quality_update' | 'message_template_status_update' | 'messages' | 'phone_number_name_update' | 'phone_number_quality_update' | 'security' | 'template_category_update'>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface WhatsAppTriggerV1Credentials {
	whatsAppTriggerApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface WhatsAppTriggerV1NodeBase {
	type: 'n8n-nodes-base.whatsAppTrigger';
	version: 1;
	credentials?: WhatsAppTriggerV1Credentials;
	isTrigger: true;
}

export type WhatsAppTriggerV1Node = WhatsAppTriggerV1NodeBase & {
	config: NodeConfig<WhatsAppTriggerV1Config>;
};

export type WhatsAppTriggerV1Node = WhatsAppTriggerV1Node;