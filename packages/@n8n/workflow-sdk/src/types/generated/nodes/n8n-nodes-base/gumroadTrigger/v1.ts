/**
 * Gumroad Trigger Node - Version 1
 * Handle Gumroad events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface GumroadTriggerV1Config {
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
// Node Types
// ===========================================================================

interface GumroadTriggerV1NodeBase {
	type: 'n8n-nodes-base.gumroadTrigger';
	version: 1;
	credentials?: GumroadTriggerV1Credentials;
	isTrigger: true;
}

export type GumroadTriggerV1Node = GumroadTriggerV1NodeBase & {
	config: NodeConfig<GumroadTriggerV1Config>;
};

export type GumroadTriggerV1Node = GumroadTriggerV1Node;