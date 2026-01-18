/**
 * Linear Node Types
 *
 * Consume Linear API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/linear/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Add a comment to an issue */
export type LinearV11CommentAddCommentConfig = {
	resource: 'comment';
	operation: 'addComment';
	issueId: string | Expression<string>;
	comment: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Add a link to an issue */
export type LinearV11IssueAddLinkConfig = {
	resource: 'issue';
	operation: 'addLink';
	issueId: string | Expression<string>;
	link: string | Expression<string>;
};

/** Create an issue */
export type LinearV11IssueCreateConfig = {
	resource: 'issue';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	teamId: string | Expression<string>;
	title: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an issue */
export type LinearV11IssueDeleteConfig = {
	resource: 'issue';
	operation: 'delete';
	issueId: string | Expression<string>;
};

/** Get an issue */
export type LinearV11IssueGetConfig = {
	resource: 'issue';
	operation: 'get';
	issueId: string | Expression<string>;
};

/** Get many issues */
export type LinearV11IssueGetAllConfig = {
	resource: 'issue';
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
};

/** Update an issue */
export type LinearV11IssueUpdateConfig = {
	resource: 'issue';
	operation: 'update';
	issueId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type LinearV11Params =
	| LinearV11CommentAddCommentConfig
	| LinearV11IssueAddLinkConfig
	| LinearV11IssueCreateConfig
	| LinearV11IssueDeleteConfig
	| LinearV11IssueGetConfig
	| LinearV11IssueGetAllConfig
	| LinearV11IssueUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LinearV11Credentials {
	linearApi: CredentialReference;
	linearOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LinearV11Node = {
	type: 'n8n-nodes-base.linear';
	version: 1 | 1.1;
	config: NodeConfig<LinearV11Params>;
	credentials?: LinearV11Credentials;
};

export type LinearNode = LinearV11Node;
