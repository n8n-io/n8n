/**
 * Manual Trigger Node - Version 1
 * Runs the flow on clicking a button in n8n
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ManualTriggerV1Params {
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface ManualTriggerV1NodeBase {
	type: 'n8n-nodes-base.manualTrigger';
	version: 1;
	isTrigger: true;
}

export type ManualTriggerV1ParamsNode = ManualTriggerV1NodeBase & {
	config: NodeConfig<ManualTriggerV1Params>;
};

export type ManualTriggerV1Node = ManualTriggerV1ParamsNode;