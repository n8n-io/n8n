/**
 * Gumroad Trigger Node - Version 1
 * Handle Gumroad events via webhooks
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface GumroadTriggerV1Params {
/**
 * The resource is gonna fire the event
 */
		resource: 'cancellation' | 'dispute' | 'dispute_won' | 'refund' | 'sale' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GumroadTriggerV1Credentials {
	gumroadApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GumroadTriggerV1Node = {
	type: 'n8n-nodes-base.gumroadTrigger';
	version: 1;
	config: NodeConfig<GumroadTriggerV1Params>;
	credentials?: GumroadTriggerV1Credentials;
	isTrigger: true;
};