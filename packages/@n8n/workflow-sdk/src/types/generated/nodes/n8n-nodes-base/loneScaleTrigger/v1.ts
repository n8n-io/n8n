/**
 * LoneScale Trigger Node - Version 1
 * Trigger LoneScale Workflow
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LoneScaleTriggerV1Params {
/**
 * Select one workflow. Choose from the list
 */
		workflow: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LoneScaleTriggerV1Credentials {
	loneScaleApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LoneScaleTriggerV1NodeBase {
	type: 'n8n-nodes-base.loneScaleTrigger';
	version: 1;
	credentials?: LoneScaleTriggerV1Credentials;
	isTrigger: true;
}

export type LoneScaleTriggerV1ParamsNode = LoneScaleTriggerV1NodeBase & {
	config: NodeConfig<LoneScaleTriggerV1Params>;
};

export type LoneScaleTriggerV1Node = LoneScaleTriggerV1ParamsNode;