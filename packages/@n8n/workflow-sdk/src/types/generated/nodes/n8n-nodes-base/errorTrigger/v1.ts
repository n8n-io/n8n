/**
 * Error Trigger Node - Version 1
 * Triggers the workflow when another workflow has an error
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ErrorTriggerV1Params {
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface ErrorTriggerV1NodeBase {
	type: 'n8n-nodes-base.errorTrigger';
	version: 1;
	isTrigger: true;
}

export type ErrorTriggerV1ParamsNode = ErrorTriggerV1NodeBase & {
	config: NodeConfig<ErrorTriggerV1Params>;
};

export type ErrorTriggerV1Node = ErrorTriggerV1ParamsNode;