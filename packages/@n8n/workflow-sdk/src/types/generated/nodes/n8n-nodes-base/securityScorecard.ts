/**
 * SecurityScorecard Node Types
 *
 * Consume SecurityScorecard API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/securityscorecard/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get company factor scores and issue counts */
export type SecurityScorecardV1CompanyGetFactorConfig = {
	resource: 'company';
	operation: 'getFactor';
	/**
	 * Primary identifier of a company or scorecard, i.e. domain.
	 */
	scorecardIdentifier: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Get company's historical factor scores */
export type SecurityScorecardV1CompanyGetFactorHistoricalConfig = {
	resource: 'company';
	operation: 'getFactorHistorical';
	/**
	 * Primary identifier of a company or scorecard, i.e. domain.
	 */
	scorecardIdentifier: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Get company's historical scores */
export type SecurityScorecardV1CompanyGetHistoricalScoreConfig = {
	resource: 'company';
	operation: 'getHistoricalScore';
	/**
	 * Primary identifier of a company or scorecard, i.e. domain.
	 */
	scorecardIdentifier: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Get company information and summary of their scorecard */
export type SecurityScorecardV1CompanyGetScorecardConfig = {
	resource: 'company';
	operation: 'getScorecard';
	/**
	 * Primary identifier of a company or scorecard, i.e. domain.
	 */
	scorecardIdentifier: string | Expression<string>;
};

/** Get company's score improvement plan */
export type SecurityScorecardV1CompanyGetScorePlanConfig = {
	resource: 'company';
	operation: 'getScorePlan';
	/**
	 * Primary identifier of a company or scorecard, i.e. domain.
	 */
	scorecardIdentifier: string | Expression<string>;
	/**
	 * Score target
	 * @default 0
	 */
	score: number | Expression<number>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Get company factor scores and issue counts */
export type SecurityScorecardV1IndustryGetFactorConfig = {
	resource: 'industry';
	operation: 'getFactor';
	industry: 'food' | 'healthcare' | 'manofacturing' | 'retail' | 'technology' | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Get company's historical factor scores */
export type SecurityScorecardV1IndustryGetFactorHistoricalConfig = {
	resource: 'industry';
	operation: 'getFactorHistorical';
	industry: 'food' | 'healthcare' | 'manofacturing' | 'retail' | 'technology' | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type SecurityScorecardV1IndustryGetScoreConfig = {
	resource: 'industry';
	operation: 'getScore';
	industry: 'food' | 'healthcare' | 'manofacturing' | 'retail' | 'technology' | Expression<string>;
};

/** Create an invite for a company/user */
export type SecurityScorecardV1InviteCreateConfig = {
	resource: 'invite';
	operation: 'create';
	email: string | Expression<string>;
	firstName: string | Expression<string>;
	lastName: string | Expression<string>;
	/**
	 * Message for the invitee
	 */
	message: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create an invite for a company/user */
export type SecurityScorecardV1PortfolioCreateConfig = {
	resource: 'portfolio';
	operation: 'create';
	/**
	 * Name of the portfolio
	 */
	name: string | Expression<string>;
	description?: string | Expression<string>;
	privacy?: 'private' | 'shared' | 'team' | Expression<string>;
};

/** Delete a portfolio */
export type SecurityScorecardV1PortfolioDeleteConfig = {
	resource: 'portfolio';
	operation: 'delete';
	portfolioId: string | Expression<string>;
};

/** Get many portfolios */
export type SecurityScorecardV1PortfolioGetAllConfig = {
	resource: 'portfolio';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Update a portfolio */
export type SecurityScorecardV1PortfolioUpdateConfig = {
	resource: 'portfolio';
	operation: 'update';
	portfolioId: string | Expression<string>;
	/**
	 * Name of the portfolio
	 */
	name: string | Expression<string>;
	description?: string | Expression<string>;
	privacy?: 'private' | 'shared' | 'team' | Expression<string>;
};

/** Add a company to portfolio */
export type SecurityScorecardV1PortfolioCompanyAddConfig = {
	resource: 'portfolioCompany';
	operation: 'add';
	portfolioId: string | Expression<string>;
	/**
	 * Company's domain name
	 */
	domain: string | Expression<string>;
};

/** Get many portfolios */
export type SecurityScorecardV1PortfolioCompanyGetAllConfig = {
	resource: 'portfolioCompany';
	operation: 'getAll';
	portfolioId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Remove a company from portfolio */
export type SecurityScorecardV1PortfolioCompanyRemoveConfig = {
	resource: 'portfolioCompany';
	operation: 'remove';
	portfolioId: string | Expression<string>;
	/**
	 * Company's domain name
	 */
	domain: string | Expression<string>;
};

/** Download a generated report */
export type SecurityScorecardV1ReportDownloadConfig = {
	resource: 'report';
	operation: 'download';
	/**
	 * URL to a generated report
	 */
	url: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Generate a report */
export type SecurityScorecardV1ReportGenerateConfig = {
	resource: 'report';
	operation: 'generate';
	report:
		| 'detailed'
		| 'events-json'
		| 'issues'
		| 'partnership'
		| 'summary'
		| 'full-scorecard-json'
		| 'portfolio'
		| 'scorecard-footprint'
		| Expression<string>;
	/**
	 * Primary identifier of a company or scorecard, i.e. domain.
	 */
	scorecardIdentifier: string | Expression<string>;
	portfolioId: string | Expression<string>;
	branding?: 'securityscorecard' | 'company_and_securityscorecard' | 'company' | Expression<string>;
	date: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many portfolios */
export type SecurityScorecardV1ReportGetAllConfig = {
	resource: 'report';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

export type SecurityScorecardV1Params =
	| SecurityScorecardV1CompanyGetFactorConfig
	| SecurityScorecardV1CompanyGetFactorHistoricalConfig
	| SecurityScorecardV1CompanyGetHistoricalScoreConfig
	| SecurityScorecardV1CompanyGetScorecardConfig
	| SecurityScorecardV1CompanyGetScorePlanConfig
	| SecurityScorecardV1IndustryGetFactorConfig
	| SecurityScorecardV1IndustryGetFactorHistoricalConfig
	| SecurityScorecardV1IndustryGetScoreConfig
	| SecurityScorecardV1InviteCreateConfig
	| SecurityScorecardV1PortfolioCreateConfig
	| SecurityScorecardV1PortfolioDeleteConfig
	| SecurityScorecardV1PortfolioGetAllConfig
	| SecurityScorecardV1PortfolioUpdateConfig
	| SecurityScorecardV1PortfolioCompanyAddConfig
	| SecurityScorecardV1PortfolioCompanyGetAllConfig
	| SecurityScorecardV1PortfolioCompanyRemoveConfig
	| SecurityScorecardV1ReportDownloadConfig
	| SecurityScorecardV1ReportGenerateConfig
	| SecurityScorecardV1ReportGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SecurityScorecardV1Credentials {
	securityScorecardApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type SecurityScorecardV1Node = {
	type: 'n8n-nodes-base.securityScorecard';
	version: 1;
	config: NodeConfig<SecurityScorecardV1Params>;
	credentials?: SecurityScorecardV1Credentials;
};

export type SecurityScorecardNode = SecurityScorecardV1Node;
