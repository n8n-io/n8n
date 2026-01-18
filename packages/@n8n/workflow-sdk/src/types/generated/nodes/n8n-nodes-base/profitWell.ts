/**
 * ProfitWell Node Types
 *
 * Consume ProfitWell API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/profitwell/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get your company's ProfitWell account settings */
export type ProfitWellV1CompanyGetSettingConfig = {
	resource: 'company';
	operation: 'getSetting';
};

/** Retrieve financial metric broken down by day for either the current month or the last */
export type ProfitWellV1MetricGetConfig = {
	resource: 'metric';
	operation: 'get';
	type: 'daily' | 'monthly' | Expression<string>;
	/**
	 * Can only be the current or previous month. Format should be YYYY-MM.
	 */
	month: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type ProfitWellV1Params = ProfitWellV1CompanyGetSettingConfig | ProfitWellV1MetricGetConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ProfitWellV1Credentials {
	profitWellApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type ProfitWellV1Node = {
	type: 'n8n-nodes-base.profitWell';
	version: 1;
	config: NodeConfig<ProfitWellV1Params>;
	credentials?: ProfitWellV1Credentials;
};

export type ProfitWellNode = ProfitWellV1Node;
