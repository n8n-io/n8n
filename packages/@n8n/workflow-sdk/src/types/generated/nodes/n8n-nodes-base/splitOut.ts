/**
 * Split Out Node Types
 *
 * Turn a list inside item(s) into separate items
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/splitout/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SplitOutV1Params {
	/**
	 * The name of the input fields to break out into separate items. Separate multiple field names by commas. For binary data, use $binary.
	 */
	fieldToSplitOut: string | Expression<string>;
	/**
	 * Whether to copy any other fields into the new items
	 * @default noOtherFields
	 */
	include?: 'noOtherFields' | 'allOtherFields' | 'selectedOtherFields' | Expression<string>;
	/**
	 * Fields in the input items to aggregate together
	 */
	fieldsToInclude?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type SplitOutNode = {
	type: 'n8n-nodes-base.splitOut';
	version: 1;
	config: NodeConfig<SplitOutV1Params>;
	credentials?: Record<string, never>;
};
