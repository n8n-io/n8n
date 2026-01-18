/**
 * Summarize Node - Version 1.1
 * Sum, count, max, etc. across items
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SummarizeV11Params {
	fieldsToSummarize?: {
		values?: Array<{
			/** How to combine the values of the field you want to summarize
			 * @default count
			 */
			aggregation?: 'append' | 'average' | 'concatenate' | 'count' | 'countUnique' | 'max' | 'min' | 'sum' | Expression<string>;
			/** The name of an input field that you want to summarize
			 * @hint  Enter the field name as text
			 * @displayOptions.hide { aggregation: ["average", "sum", "countUnique", "count", "max", "min"] }
			 */
			field?: string | Expression<string>;
			/** The name of an input field that you want to summarize. The field should contain numerical values; null, undefined, empty strings would be ignored.
			 * @hint  Enter the field name as text
			 * @displayOptions.show { aggregation: ["average", "sum"] }
			 */
			field?: string | Expression<string>;
			/** The name of an input field that you want to summarize; null, undefined, empty strings would be ignored
			 * @hint  Enter the field name as text
			 * @displayOptions.show { aggregation: ["countUnique", "count", "max", "min"] }
			 */
			field?: string | Expression<string>;
			/** Include Empty Values
			 * @displayOptions.show { aggregation: ["append", "concatenate", "count", "countUnique"] }
			 * @default false
			 */
			includeEmpty?: boolean | Expression<boolean>;
			/** Separator
			 * @hint What to insert between values
			 * @displayOptions.show { aggregation: ["concatenate"] }
			 * @default ,
			 */
			separateBy?: ',' | ', ' | '\n' | '' | ' ' | 'other' | Expression<string>;
			/** Custom Separator
			 * @displayOptions.show { aggregation: ["concatenate"], separateBy: ["other"] }
			 */
			customSeparator?: string | Expression<string>;
		}>;
	};
/**
 * The name of the input fields that you want to split the summary by
 * @hint Enter the name of the fields as text (separated by commas)
 * @displayOptions.hide { /options.outputFormat: ["singleItem"] }
 */
		fieldsToSplitBy?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type SummarizeV11Node = {
	type: 'n8n-nodes-base.summarize';
	version: 1 | 1.1;
	config: NodeConfig<SummarizeV11Params>;
	credentials?: Record<string, never>;
};