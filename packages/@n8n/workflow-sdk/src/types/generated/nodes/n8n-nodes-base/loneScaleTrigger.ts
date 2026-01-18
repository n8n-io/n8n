/**
 * LoneScale Trigger Node Types
 *
 * Trigger LoneScale Workflow
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lonescaletrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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

export type LoneScaleTriggerV1Node = {
	type: 'n8n-nodes-base.loneScaleTrigger';
	version: 1;
	config: NodeConfig<LoneScaleTriggerV1Params>;
	credentials?: LoneScaleTriggerV1Credentials;
	isTrigger: true;
};

export type LoneScaleTriggerNode = LoneScaleTriggerV1Node;
