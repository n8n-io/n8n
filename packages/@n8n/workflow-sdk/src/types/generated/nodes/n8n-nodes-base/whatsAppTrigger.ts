/**
 * WhatsApp Trigger Node Types
 *
 * Handle WhatsApp events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/whatsapptrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface WhatsAppTriggerV1Params {
	updates: Array<
		| 'account_review_update'
		| 'account_update'
		| 'business_capability_update'
		| 'message_template_quality_update'
		| 'message_template_status_update'
		| 'messages'
		| 'phone_number_name_update'
		| 'phone_number_quality_update'
		| 'security'
		| 'template_category_update'
	>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface WhatsAppTriggerV1Credentials {
	whatsAppTriggerApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type WhatsAppTriggerNode = {
	type: 'n8n-nodes-base.whatsAppTrigger';
	version: 1;
	config: NodeConfig<WhatsAppTriggerV1Params>;
	credentials?: WhatsAppTriggerV1Credentials;
	isTrigger: true;
};
