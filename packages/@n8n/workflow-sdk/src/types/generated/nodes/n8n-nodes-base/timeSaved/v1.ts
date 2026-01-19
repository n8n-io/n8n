/**
 * Track Time Saved Node - Version 1
 * Dynamically track time saved based on the workflow’s execution path and the number of items processed
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TimeSavedV1Config {
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

interface TimeSavedV1NodeBase {
	type: 'n8n-nodes-base.timeSaved';
	version: 1;
}

export type TimeSavedV1Node = TimeSavedV1NodeBase & {
	config: NodeConfig<TimeSavedV1Config>;
};

export type TimeSavedV1Node = TimeSavedV1Node;