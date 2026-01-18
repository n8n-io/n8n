/**
 * Workable Trigger Node Types
 *
 * Starts the workflow when Workable events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/workabletrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface WorkableTriggerV1Params {
	triggerOn: 'candidateCreated' | 'candidateMoved' | Expression<string>;
	filters?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface WorkableTriggerV1Credentials {
	workableApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type WorkableTriggerV1Node = {
	type: 'n8n-nodes-base.workableTrigger';
	version: 1;
	config: NodeConfig<WorkableTriggerV1Params>;
	credentials?: WorkableTriggerV1Credentials;
	isTrigger: true;
};

export type WorkableTriggerNode = WorkableTriggerV1Node;
