/**
 * Schedule Trigger Node Types
 *
 * Triggers the workflow on a given schedule
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/scheduletrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ScheduleTriggerV13Params {
	rule?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ScheduleTriggerNode = {
	type: 'n8n-nodes-base.scheduleTrigger';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<ScheduleTriggerV13Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};
