/**
 * Elastic Security Node Types
 *
 * Consume the Elastic Security API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/elasticsecurity/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a case */
export type ElasticSecurityV1CaseCreateConfig = {
	resource: 'case';
	operation: 'create';
	title: string | Expression<string>;
	/**
	 * Connectors allow you to send Elastic Security cases into other systems (only ServiceNow, Jira, or IBM Resilient). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	connectorId: string | Expression<string>;
	connectorType: '.resilient' | '.jira' | '.servicenow' | Expression<string>;
	/**
	 * Type of the Jira issue to create for this case
	 */
	issueType: string | Expression<string>;
	/**
	 * Priority of the Jira issue to create for this case
	 */
	priority: string | Expression<string>;
	/**
	 * Urgency of the ServiceNow ITSM issue to create for this case
	 * @default 1
	 */
	urgency: 1 | 2 | 3 | Expression<number>;
	/**
	 * Severity of the ServiceNow ITSM issue to create for this case
	 * @default 1
	 */
	severity: 1 | 2 | 3 | Expression<number>;
	/**
	 * Impact of the ServiceNow ITSM issue to create for this case
	 * @default 1
	 */
	impact: 1 | 2 | 3 | Expression<number>;
	/**
	 * Category of the ServiceNow ITSM issue to create for this case
	 */
	category: string | Expression<string>;
	/**
	 * Comma-separated list of numerical types of the IBM Resilient issue to create for this case
	 */
	issueTypes: string | Expression<string>;
	/**
	 * Severity code of the IBM Resilient issue to create for this case
	 * @default 1
	 */
	severityCode: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a case */
export type ElasticSecurityV1CaseDeleteConfig = {
	resource: 'case';
	operation: 'delete';
	caseId: string | Expression<string>;
};

/** Get a case */
export type ElasticSecurityV1CaseGetConfig = {
	resource: 'case';
	operation: 'get';
	caseId: string | Expression<string>;
};

/** Retrieve many cases */
export type ElasticSecurityV1CaseGetAllConfig = {
	resource: 'case';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	sortOptions?: Record<string, unknown>;
};

/** Retrieve a summary of all case activity */
export type ElasticSecurityV1CaseGetStatusConfig = {
	resource: 'case';
	operation: 'getStatus';
};

/** Update a case */
export type ElasticSecurityV1CaseUpdateConfig = {
	resource: 'case';
	operation: 'update';
	caseId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Add a comment to a case */
export type ElasticSecurityV1CaseCommentAddConfig = {
	resource: 'caseComment';
	operation: 'add';
	/**
	 * ID of the case containing the comment to retrieve
	 */
	caseId: string | Expression<string>;
	comment: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Get a case */
export type ElasticSecurityV1CaseCommentGetConfig = {
	resource: 'caseComment';
	operation: 'get';
	/**
	 * ID of the case containing the comment to retrieve
	 */
	caseId: string | Expression<string>;
	/**
	 * ID of the case comment to retrieve
	 */
	commentId: string | Expression<string>;
};

/** Retrieve many cases */
export type ElasticSecurityV1CaseCommentGetAllConfig = {
	resource: 'caseComment';
	operation: 'getAll';
	caseId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Remove a comment from a case */
export type ElasticSecurityV1CaseCommentRemoveConfig = {
	resource: 'caseComment';
	operation: 'remove';
	/**
	 * ID of the case containing the comment to remove
	 */
	caseId: string | Expression<string>;
	commentId: string | Expression<string>;
};

/** Update a case */
export type ElasticSecurityV1CaseCommentUpdateConfig = {
	resource: 'caseComment';
	operation: 'update';
	/**
	 * ID of the case containing the comment to retrieve
	 */
	caseId: string | Expression<string>;
	commentId: string | Expression<string>;
	/**
	 * Text to replace current comment message
	 */
	comment: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Add a comment to a case */
export type ElasticSecurityV1CaseTagAddConfig = {
	resource: 'caseTag';
	operation: 'add';
	caseId: string | Expression<string>;
	/**
	 * Tag to attach to the case. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	tag: string | Expression<string>;
};

/** Remove a comment from a case */
export type ElasticSecurityV1CaseTagRemoveConfig = {
	resource: 'caseTag';
	operation: 'remove';
	caseId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	tag: string | Expression<string>;
};

/** Create a case */
export type ElasticSecurityV1ConnectorCreateConfig = {
	resource: 'connector';
	operation: 'create';
	/**
	 * Connectors allow you to send Elastic Security cases into other systems (only ServiceNow, Jira, or IBM Resilient)
	 */
	name: string | Expression<string>;
	connectorType: '.resilient' | '.jira' | '.servicenow' | Expression<string>;
	/**
	 * URL of the third-party instance
	 */
	apiUrl: string | Expression<string>;
	/**
	 * Jira-registered email
	 */
	email: string | Expression<string>;
	/**
	 * Jira API token
	 */
	apiToken: string | Expression<string>;
	/**
	 * Jira Project Key
	 */
	projectKey: string | Expression<string>;
	/**
	 * ServiceNow ITSM username
	 */
	username: string | Expression<string>;
	/**
	 * ServiceNow ITSM password
	 */
	password: string | Expression<string>;
	/**
	 * IBM Resilient API key ID
	 */
	apiKeyId: string | Expression<string>;
	/**
	 * IBM Resilient API key secret
	 */
	apiKeySecret: string | Expression<string>;
	/**
	 * IBM Resilient organization ID
	 */
	orgId: string | Expression<string>;
};

export type ElasticSecurityV1Params =
	| ElasticSecurityV1CaseCreateConfig
	| ElasticSecurityV1CaseDeleteConfig
	| ElasticSecurityV1CaseGetConfig
	| ElasticSecurityV1CaseGetAllConfig
	| ElasticSecurityV1CaseGetStatusConfig
	| ElasticSecurityV1CaseUpdateConfig
	| ElasticSecurityV1CaseCommentAddConfig
	| ElasticSecurityV1CaseCommentGetConfig
	| ElasticSecurityV1CaseCommentGetAllConfig
	| ElasticSecurityV1CaseCommentRemoveConfig
	| ElasticSecurityV1CaseCommentUpdateConfig
	| ElasticSecurityV1CaseTagAddConfig
	| ElasticSecurityV1CaseTagRemoveConfig
	| ElasticSecurityV1ConnectorCreateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ElasticSecurityV1Credentials {
	elasticSecurityApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ElasticSecurityNode = {
	type: 'n8n-nodes-base.elasticSecurity';
	version: 1;
	config: NodeConfig<ElasticSecurityV1Params>;
	credentials?: ElasticSecurityV1Credentials;
};
