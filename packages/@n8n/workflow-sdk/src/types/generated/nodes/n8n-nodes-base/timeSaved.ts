/**
 * Track Time Saved Node Types
 *
 * Dynamically track time saved based on the workflow’s execution path and the number of items processed
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/timesaved/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TimeSavedV1Params {
	mode?: 'once' | 'perItem' | Expression<string>;
	/**
	 * Number of minutes saved by this workflow execution
	 * @default 0
	 */
	minutesSaved?: number | Expression<number>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type TimeSavedV1Node = {
	type: 'n8n-nodes-base.timeSaved';
	version: 1;
	config: NodeConfig<TimeSavedV1Params>;
	credentials?: Record<string, never>;
};

export type TimeSavedNode = TimeSavedV1Node;
