/**
 * Evaluation Trigger Node - Version 4.7
 * Run a test dataset through your workflow to check performance
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface EvaluationTriggerV47Params {
	authentication?: 'serviceAccount' | 'oAuth2' | Expression<string>;
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
	dataTableId: ResourceLocatorValue;
/**
 * Whether to limit number of rows to process
 * @default false
 */
		limitRows?: boolean | Expression<boolean>;
/**
 * Maximum number of rows to process
 * @displayOptions.show { limitRows: [true] }
 * @default 10
 */
		maxRows?: number | Expression<number>;
	filtersUI?: {
		values?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			lookupColumn?: string | Expression<string>;
			/** Value
			 * @hint The column must have this value to be matched
			 */
			lookupValue?: string | Expression<string>;
		}>;
	};
/**
 * Whether to filter rows to process
 * @displayOptions.show { source: ["dataTable"] }
 * @default false
 */
		filterRows?: boolean | Expression<boolean>;
	matchType?: 'anyCondition' | 'allConditions' | Expression<string>;
/**
 * Filter to decide which rows get
 * @displayOptions.show { filterRows: [true] }
 * @default {}
 */
		filters?: {
		conditions?: Array<{
			/** Choose from the list, or specify using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @default id
			 */
			keyName?: string | Expression<string>;
			/** Condition
			 * @default eq
			 */
			condition?: string | Expression<string>;
			/** Value
			 * @displayOptions.hide { condition: ["isEmpty", "isNotEmpty", "isTrue", "isFalse"] }
			 */
			keyValue?: string | Expression<string>;
		}>;
	};
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface EvaluationTriggerV47Credentials {
	googleApi: CredentialReference;
	googleSheetsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface EvaluationTriggerV47NodeBase {
	type: 'n8n-nodes-base.evaluationTrigger';
	version: 4.7;
	credentials?: EvaluationTriggerV47Credentials;
	isTrigger: true;
}

export type EvaluationTriggerV47ParamsNode = EvaluationTriggerV47NodeBase & {
	config: NodeConfig<EvaluationTriggerV47Params>;
};

export type EvaluationTriggerV47Node = EvaluationTriggerV47ParamsNode;