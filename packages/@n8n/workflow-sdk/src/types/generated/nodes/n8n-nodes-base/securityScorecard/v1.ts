/**
 * SecurityScorecard Node - Version 1
 * Consume SecurityScorecard API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get company factor scores and issue counts */
export type SecurityScorecardV1CompanyGetFactorConfig = {
	resource: 'company';
	operation: 'getFactor';
/**
 * Primary identifier of a company or scorecard, i.e. domain.
 * @displayOptions.show { resource: ["company"], operation: ["getScorecard", "getFactor", "getFactorHistorical", "getHistoricalScore", "getScorePlan"] }
 */
		scorecardIdentifier: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["company"], operation: ["getFactor", "getFactorHistorical", "getHistoricalScore", "getScorePlan"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["company"], operation: ["getFactor", "getFactorHistorical", "getHistoricalScore", "getScorePlan"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["company"], operation: ["getScorecard", "getFactor", "getFactorHistorical", "getHistoricalScore", "getScorePlan"] }
 */
		scorecardIdentifier: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["company"], operation: ["getFactor", "getFactorHistorical", "getHistoricalScore", "getScorePlan"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["company"], operation: ["getFactor", "getFactorHistorical", "getHistoricalScore", "getScorePlan"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["company"], operation: ["getFactorHistorical", "getHistoricalScore"] }
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
 * @displayOptions.show { resource: ["company"], operation: ["getScorecard", "getFactor", "getFactorHistorical", "getHistoricalScore", "getScorePlan"] }
 */
		scorecardIdentifier: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["company"], operation: ["getFactor", "getFactorHistorical", "getHistoricalScore", "getScorePlan"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["company"], operation: ["getFactor", "getFactorHistorical", "getHistoricalScore", "getScorePlan"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["company"], operation: ["getFactorHistorical", "getHistoricalScore"] }
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
 * @displayOptions.show { resource: ["company"], operation: ["getScorecard", "getFactor", "getFactorHistorical", "getHistoricalScore", "getScorePlan"] }
 */
		scorecardIdentifier: string | Expression<string>;
};

/** Get company's score improvement plan */
export type SecurityScorecardV1CompanyGetScorePlanConfig = {
	resource: 'company';
	operation: 'getScorePlan';
/**
 * Primary identifier of a company or scorecard, i.e. domain.
 * @displayOptions.show { resource: ["company"], operation: ["getScorecard", "getFactor", "getFactorHistorical", "getHistoricalScore", "getScorePlan"] }
 */
		scorecardIdentifier: string | Expression<string>;
/**
 * Score target
 * @displayOptions.show { resource: ["company"], operation: ["getScorePlan"] }
 * @default 0
 */
		score: number | Expression<number>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["company"], operation: ["getFactor", "getFactorHistorical", "getHistoricalScore", "getScorePlan"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["company"], operation: ["getFactor", "getFactorHistorical", "getHistoricalScore", "getScorePlan"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["industry"], operation: ["getFactor", "getFactorHistorical"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["industry"], operation: ["getFactor", "getFactorHistorical"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["industry"], operation: ["getFactor", "getFactorHistorical"] }
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
 * @displayOptions.show { resource: ["industry"], operation: ["getFactor", "getFactorHistorical"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["industry"], operation: ["getFactor", "getFactorHistorical"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["industry"], operation: ["getFactor", "getFactorHistorical"] }
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
 * @displayOptions.show { resource: ["invite"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["portfolio"], operation: ["create", "update"] }
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
 * @displayOptions.show { resource: ["portfolio"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["portfolio"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["portfolio"], operation: ["create", "update"] }
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
 * @displayOptions.show { resource: ["portfolioCompany"], operation: ["add", "remove"] }
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
 * @displayOptions.show { resource: ["portfolioCompany"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["portfolioCompany"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["portfolioCompany"], operation: ["add", "remove"] }
 */
		domain: string | Expression<string>;
};

/** Download a generated report */
export type SecurityScorecardV1ReportDownloadConfig = {
	resource: 'report';
	operation: 'download';
/**
 * URL to a generated report
 * @displayOptions.show { resource: ["report"], operation: ["download"] }
 */
		url: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Generate a report */
export type SecurityScorecardV1ReportGenerateConfig = {
	resource: 'report';
	operation: 'generate';
	report: 'detailed' | 'events-json' | 'issues' | 'partnership' | 'summary' | 'full-scorecard-json' | 'portfolio' | 'scorecard-footprint' | Expression<string>;
/**
 * Primary identifier of a company or scorecard, i.e. domain.
 * @displayOptions.show { resource: ["report"], operation: ["generate"], report: ["detailed", "events-json", "full-scorecard-json", "issues", "partnership", "scorecard-footprint", "summary"] }
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
 * @displayOptions.show { resource: ["report"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["report"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface SecurityScorecardV1Credentials {
	securityScorecardApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface SecurityScorecardV1NodeBase {
	type: 'n8n-nodes-base.securityScorecard';
	version: 1;
	credentials?: SecurityScorecardV1Credentials;
}

export type SecurityScorecardV1CompanyGetFactorNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1CompanyGetFactorConfig>;
};

export type SecurityScorecardV1CompanyGetFactorHistoricalNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1CompanyGetFactorHistoricalConfig>;
};

export type SecurityScorecardV1CompanyGetHistoricalScoreNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1CompanyGetHistoricalScoreConfig>;
};

export type SecurityScorecardV1CompanyGetScorecardNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1CompanyGetScorecardConfig>;
};

export type SecurityScorecardV1CompanyGetScorePlanNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1CompanyGetScorePlanConfig>;
};

export type SecurityScorecardV1IndustryGetFactorNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1IndustryGetFactorConfig>;
};

export type SecurityScorecardV1IndustryGetFactorHistoricalNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1IndustryGetFactorHistoricalConfig>;
};

export type SecurityScorecardV1IndustryGetScoreNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1IndustryGetScoreConfig>;
};

export type SecurityScorecardV1InviteCreateNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1InviteCreateConfig>;
};

export type SecurityScorecardV1PortfolioCreateNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1PortfolioCreateConfig>;
};

export type SecurityScorecardV1PortfolioDeleteNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1PortfolioDeleteConfig>;
};

export type SecurityScorecardV1PortfolioGetAllNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1PortfolioGetAllConfig>;
};

export type SecurityScorecardV1PortfolioUpdateNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1PortfolioUpdateConfig>;
};

export type SecurityScorecardV1PortfolioCompanyAddNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1PortfolioCompanyAddConfig>;
};

export type SecurityScorecardV1PortfolioCompanyGetAllNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1PortfolioCompanyGetAllConfig>;
};

export type SecurityScorecardV1PortfolioCompanyRemoveNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1PortfolioCompanyRemoveConfig>;
};

export type SecurityScorecardV1ReportDownloadNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1ReportDownloadConfig>;
};

export type SecurityScorecardV1ReportGenerateNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1ReportGenerateConfig>;
};

export type SecurityScorecardV1ReportGetAllNode = SecurityScorecardV1NodeBase & {
	config: NodeConfig<SecurityScorecardV1ReportGetAllConfig>;
};

export type SecurityScorecardV1Node =
	| SecurityScorecardV1CompanyGetFactorNode
	| SecurityScorecardV1CompanyGetFactorHistoricalNode
	| SecurityScorecardV1CompanyGetHistoricalScoreNode
	| SecurityScorecardV1CompanyGetScorecardNode
	| SecurityScorecardV1CompanyGetScorePlanNode
	| SecurityScorecardV1IndustryGetFactorNode
	| SecurityScorecardV1IndustryGetFactorHistoricalNode
	| SecurityScorecardV1IndustryGetScoreNode
	| SecurityScorecardV1InviteCreateNode
	| SecurityScorecardV1PortfolioCreateNode
	| SecurityScorecardV1PortfolioDeleteNode
	| SecurityScorecardV1PortfolioGetAllNode
	| SecurityScorecardV1PortfolioUpdateNode
	| SecurityScorecardV1PortfolioCompanyAddNode
	| SecurityScorecardV1PortfolioCompanyGetAllNode
	| SecurityScorecardV1PortfolioCompanyRemoveNode
	| SecurityScorecardV1ReportDownloadNode
	| SecurityScorecardV1ReportGenerateNode
	| SecurityScorecardV1ReportGetAllNode
	;