/**
 * Affinity Trigger Node Types
 *
 * Handle Affinity events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/affinitytrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AffinityTriggerV1Params {
	/**
	 * Webhook events that will be enabled for that endpoint
	 * @default []
	 */
	events: Array<
		| 'field_value.created'
		| 'field_value.deleted'
		| 'field_value.updated'
		| 'field.created'
		| 'field.deleted'
		| 'field.updated'
		| 'file.created'
		| 'file.deleted'
		| 'list_entry.created'
		| 'list_entry.deleted'
		| 'list.created'
		| 'list.deleted'
		| 'list.updated'
		| 'note.created'
		| 'note.deleted'
		| 'note.updated'
		| 'opportunity.created'
		| 'opportunity.deleted'
		| 'opportunity.updated'
		| 'organization.created'
		| 'organization.deleted'
		| 'organization.updated'
		| 'person.created'
		| 'person.deleted'
		| 'person.updated'
	>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AffinityTriggerV1Credentials {
	affinityApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AffinityTriggerNode = {
	type: 'n8n-nodes-base.affinityTrigger';
	version: 1;
	config: NodeConfig<AffinityTriggerV1Params>;
	credentials?: AffinityTriggerV1Credentials;
	isTrigger: true;
};
