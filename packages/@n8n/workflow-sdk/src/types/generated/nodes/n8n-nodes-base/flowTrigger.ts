/**
 * Flow Trigger Node Types
 *
 * Handle Flow events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/flowtrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FlowTriggerV1Params {
	/**
	 * Resource that triggers the webhook
	 */
	resource?: 'list' | 'task' | Expression<string>;
	/**
	 * Lists IDs, perhaps known better as "Projects" separated by a comma (,)
	 */
	listIds: string | Expression<string>;
	/**
	 * Task IDs separated by a comma (,)
	 */
	taskIds: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface FlowTriggerV1Credentials {
	flowApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type FlowTriggerNode = {
	type: 'n8n-nodes-base.flowTrigger';
	version: 1;
	config: NodeConfig<FlowTriggerV1Params>;
	credentials?: FlowTriggerV1Credentials;
	isTrigger: true;
};
