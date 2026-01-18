/**
 * Summarize Node Types
 *
 * Sum, count, max, etc. across items
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/summarize/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SummarizeV11Params {
	fieldsToSummarize?: Record<string, unknown>;
	/**
	 * The name of the input fields that you want to split the summary by
	 * @hint Enter the name of the fields as text (separated by commas)
	 */
	fieldsToSplitBy?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type SummarizeV11Node = {
	type: 'n8n-nodes-base.summarize';
	version: 1 | 1.1;
	config: NodeConfig<SummarizeV11Params>;
	credentials?: Record<string, never>;
};

export type SummarizeNode = SummarizeV11Node;
