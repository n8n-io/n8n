/**
 * Evaluation Trigger Node Types
 *
 * Run a test dataset through your workflow to check performance
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/evaluationtrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface EvaluationTriggerV47Params {
	/**
	 * Where to get the test dataset from
	 * @default dataTable
	 */
	source?: 'dataTable' | 'googleSheets' | Expression<string>;
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
	 * @default 10
	 */
	maxRows?: number | Expression<number>;
	filtersUI?: Record<string, unknown>;
	/**
	 * Whether to filter rows to process
	 * @default false
	 */
	filterRows?: boolean | Expression<boolean>;
	matchType?: 'anyCondition' | 'allConditions' | Expression<string>;
	/**
	 * Filter to decide which rows get
	 * @default {}
	 */
	filters?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface EvaluationTriggerV47Credentials {
	googleApi: CredentialReference;
	googleSheetsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type EvaluationTriggerNode = {
	type: 'n8n-nodes-base.evaluationTrigger';
	version: 4.6 | 4.7;
	config: NodeConfig<EvaluationTriggerV47Params>;
	credentials?: EvaluationTriggerV47Credentials;
	isTrigger: true;
};
