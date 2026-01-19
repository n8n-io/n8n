/**
 * Copper Trigger Node - Version 1
 * Handle Copper events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface CopperTriggerV1Config {
/**
 * The resource which will fire the event
 */
		resource: 'company' | 'lead' | 'opportunity' | 'person' | 'project' | 'task' | Expression<string>;
/**
 * The event to listen to
 */
		event: 'delete' | 'new' | 'update' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface CopperTriggerV1Credentials {
	copperApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface CopperTriggerV1NodeBase {
	type: 'n8n-nodes-base.copperTrigger';
	version: 1;
	credentials?: CopperTriggerV1Credentials;
	isTrigger: true;
}

export type CopperTriggerV1Node = CopperTriggerV1NodeBase & {
	config: NodeConfig<CopperTriggerV1Config>;
};

export type CopperTriggerV1Node = CopperTriggerV1Node;