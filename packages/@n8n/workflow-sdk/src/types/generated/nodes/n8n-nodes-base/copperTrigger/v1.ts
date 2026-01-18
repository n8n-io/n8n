/**
 * Copper Trigger Node - Version 1
 * Handle Copper events via webhooks
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface CopperTriggerV1Params {
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
// Node Type
// ===========================================================================

export type CopperTriggerV1Node = {
	type: 'n8n-nodes-base.copperTrigger';
	version: 1;
	config: NodeConfig<CopperTriggerV1Params>;
	credentials?: CopperTriggerV1Credentials;
	isTrigger: true;
};