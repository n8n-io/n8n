/**
 * Manual Trigger Node - Version 1
 * Runs the flow on clicking a button in n8n
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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
// Node Type
// ===========================================================================

export type ManualTriggerV1Node = {
	type: 'n8n-nodes-base.manualTrigger';
	version: 1;
	config: NodeConfig<ManualTriggerV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};