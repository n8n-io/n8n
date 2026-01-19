/**
 * Flow Trigger Node - Version 1
 * Handle Flow events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
 * @displayOptions.show { resource: ["list"] }
 * @displayOptions.hide { resource: ["task"] }
 */
		listIds: string | Expression<string>;
/**
 * Task IDs separated by a comma (,)
 * @displayOptions.show { resource: ["task"] }
 * @displayOptions.hide { resource: ["list"] }
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
// Node Types
// ===========================================================================

interface FlowTriggerV1NodeBase {
	type: 'n8n-nodes-base.flowTrigger';
	version: 1;
	credentials?: FlowTriggerV1Credentials;
	isTrigger: true;
}

export type FlowTriggerV1ParamsNode = FlowTriggerV1NodeBase & {
	config: NodeConfig<FlowTriggerV1Params>;
};

export type FlowTriggerV1Node = FlowTriggerV1ParamsNode;