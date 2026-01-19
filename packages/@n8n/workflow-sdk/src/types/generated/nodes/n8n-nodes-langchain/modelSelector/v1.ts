/**
 * Model Selector Node - Version 1
 * Use this node to select one of the connected models to this node based on workflow data
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcModelSelectorV1Config {
/**
 * The number of data inputs you want to merge. The node waits for all connected inputs to be executed.
 * @default 2
 */
		numberInputs?: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Expression<number>;
/**
 * Rules to map workflow data to specific models
 * @default {}
 */
		rules?: {
		rule?: Array<{
			/** Choose model input from the list
			 * @default 1
			 */
			modelIndex?: string | Expression<string>;
			/** Conditions that must be met to select this model
			 * @default {}
			 */
			conditions?: FilterValue;
		}>;
	};
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcModelSelectorV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.modelSelector';
	version: 1;
}

export type LcModelSelectorV1Node = LcModelSelectorV1NodeBase & {
	config: NodeConfig<LcModelSelectorV1Config>;
};

export type LcModelSelectorV1Node = LcModelSelectorV1Node;