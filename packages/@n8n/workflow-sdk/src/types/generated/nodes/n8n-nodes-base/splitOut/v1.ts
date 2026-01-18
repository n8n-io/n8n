/**
 * Split Out Node - Version 1
 * Turn a list inside item(s) into separate items
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SplitOutV1Params {
/**
 * The name of the input fields to break out into separate items. Separate multiple field names by commas. For binary data, use $binary.
 * @hint Use $binary to split out the input item by binary data
 */
		fieldToSplitOut: string | Expression<string>;
/**
 * Whether to copy any other fields into the new items
 * @default noOtherFields
 */
		include?: 'noOtherFields' | 'allOtherFields' | 'selectedOtherFields' | Expression<string>;
/**
 * Fields in the input items to aggregate together
 * @displayOptions.show { include: ["selectedOtherFields"] }
 */
		fieldsToInclude?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type SplitOutV1Node = {
	type: 'n8n-nodes-base.splitOut';
	version: 1;
	config: NodeConfig<SplitOutV1Params>;
	credentials?: Record<string, never>;
};