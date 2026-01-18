/**
 * Manual Trigger Node Types
 *
 * Runs the flow on clicking a button in n8n
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/manualtrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ManualTriggerV1Params {}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type ManualTriggerV1Node = {
	type: 'n8n-nodes-base.manualTrigger';
	version: 1;
	config: NodeConfig<ManualTriggerV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type ManualTriggerNode = ManualTriggerV1Node;
