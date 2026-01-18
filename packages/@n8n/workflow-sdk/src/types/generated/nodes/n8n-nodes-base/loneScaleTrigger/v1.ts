/**
 * LoneScale Trigger Node - Version 1
 * Trigger LoneScale Workflow
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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
// Node Type
// ===========================================================================

export type LoneScaleTriggerV1Node = {
	type: 'n8n-nodes-base.loneScaleTrigger';
	version: 1;
	config: NodeConfig<LoneScaleTriggerV1Params>;
	credentials?: LoneScaleTriggerV1Credentials;
	isTrigger: true;
};