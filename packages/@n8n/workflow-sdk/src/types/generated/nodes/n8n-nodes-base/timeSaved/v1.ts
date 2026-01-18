/**
 * Track Time Saved Node - Version 1
 * Dynamically track time saved based on the workflow’s execution path and the number of items processed
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

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
// Node Type
// ===========================================================================

export type TimeSavedV1Node = {
	type: 'n8n-nodes-base.timeSaved';
	version: 1;
	config: NodeConfig<TimeSavedV1Params>;
	credentials?: Record<string, never>;
};