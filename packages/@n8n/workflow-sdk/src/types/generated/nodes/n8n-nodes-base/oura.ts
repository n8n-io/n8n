/**
 * Oura Node Types
 *
 * Consume Oura API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/oura/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get the user's personal information */
export type OuraV1ProfileGetConfig = {
	resource: 'profile';
	operation: 'get';
};

/** Get the user's activity summary */
export type OuraV1SummaryGetActivityConfig = {
	resource: 'summary';
	operation: 'getActivity';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["summary"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["summary"], returnAll: [false] }
	 * @default 5
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Get the user's readiness summary */
export type OuraV1SummaryGetReadinessConfig = {
	resource: 'summary';
	operation: 'getReadiness';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["summary"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["summary"], returnAll: [false] }
	 * @default 5
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Get the user's sleep summary */
export type OuraV1SummaryGetSleepConfig = {
	resource: 'summary';
	operation: 'getSleep';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["summary"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["summary"], returnAll: [false] }
	 * @default 5
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type OuraV1Params =
	| OuraV1ProfileGetConfig
	| OuraV1SummaryGetActivityConfig
	| OuraV1SummaryGetReadinessConfig
	| OuraV1SummaryGetSleepConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface OuraV1Credentials {
	ouraApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type OuraV1Node = {
	type: 'n8n-nodes-base.oura';
	version: 1;
	config: NodeConfig<OuraV1Params>;
	credentials?: OuraV1Credentials;
};

export type OuraNode = OuraV1Node;
