/**
 * Linear Node - Version 1
 * Consume Linear API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Add a comment to an issue */
export type LinearV1CommentAddCommentConfig = {
	resource: 'comment';
	operation: 'addComment';
	issueId: string | Expression<string>;
	comment: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Add a link to an issue */
export type LinearV1IssueAddLinkConfig = {
	resource: 'issue';
	operation: 'addLink';
	issueId: string | Expression<string>;
	link: string | Expression<string>;
};

/** Create an issue */
export type LinearV1IssueCreateConfig = {
	resource: 'issue';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["issue"], operation: ["create"] }
 */
		teamId: string | Expression<string>;
	title: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an issue */
export type LinearV1IssueDeleteConfig = {
	resource: 'issue';
	operation: 'delete';
	issueId: string | Expression<string>;
};

/** Get an issue */
export type LinearV1IssueGetConfig = {
	resource: 'issue';
	operation: 'get';
	issueId: string | Expression<string>;
};

/** Get many issues */
export type LinearV1IssueGetAllConfig = {
	resource: 'issue';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["issue"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["issue"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update an issue */
export type LinearV1IssueUpdateConfig = {
	resource: 'issue';
	operation: 'update';
	issueId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type LinearV1Params =
	| LinearV1CommentAddCommentConfig
	| LinearV1IssueAddLinkConfig
	| LinearV1IssueCreateConfig
	| LinearV1IssueDeleteConfig
	| LinearV1IssueGetConfig
	| LinearV1IssueGetAllConfig
	| LinearV1IssueUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type LinearV1IssueCreateOutput = {
	archivedAt?: null;
	createdAt?: string;
	creator?: {
		displayName?: string;
		id?: string;
	};
	dueDate?: null;
	id?: string;
	identifier?: string;
	priority?: number;
	state?: {
		id?: string;
		name?: string;
	};
	title?: string;
};

export type LinearV1IssueGetOutput = {
	createdAt?: string;
	creator?: {
		displayName?: string;
		id?: string;
	};
	id?: string;
	identifier?: string;
	priority?: number;
	state?: {
		id?: string;
		name?: string;
	};
	title?: string;
};

export type LinearV1IssueGetAllOutput = {
	archivedAt?: null;
	createdAt?: string;
	creator?: {
		displayName?: string;
		id?: string;
	};
	id?: string;
	identifier?: string;
	priority?: number;
	state?: {
		id?: string;
		name?: string;
	};
	title?: string;
};

export type LinearV1IssueUpdateOutput = {
	createdAt?: string;
	creator?: {
		displayName?: string;
		id?: string;
	};
	id?: string;
	identifier?: string;
	priority?: number;
	state?: {
		id?: string;
		name?: string;
	};
	title?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface LinearV1Credentials {
	linearApi: CredentialReference;
	linearOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LinearV1NodeBase {
	type: 'n8n-nodes-base.linear';
	version: 1;
	credentials?: LinearV1Credentials;
}

export type LinearV1CommentAddCommentNode = LinearV1NodeBase & {
	config: NodeConfig<LinearV1CommentAddCommentConfig>;
};

export type LinearV1IssueAddLinkNode = LinearV1NodeBase & {
	config: NodeConfig<LinearV1IssueAddLinkConfig>;
};

export type LinearV1IssueCreateNode = LinearV1NodeBase & {
	config: NodeConfig<LinearV1IssueCreateConfig>;
	output?: LinearV1IssueCreateOutput;
};

export type LinearV1IssueDeleteNode = LinearV1NodeBase & {
	config: NodeConfig<LinearV1IssueDeleteConfig>;
};

export type LinearV1IssueGetNode = LinearV1NodeBase & {
	config: NodeConfig<LinearV1IssueGetConfig>;
	output?: LinearV1IssueGetOutput;
};

export type LinearV1IssueGetAllNode = LinearV1NodeBase & {
	config: NodeConfig<LinearV1IssueGetAllConfig>;
	output?: LinearV1IssueGetAllOutput;
};

export type LinearV1IssueUpdateNode = LinearV1NodeBase & {
	config: NodeConfig<LinearV1IssueUpdateConfig>;
	output?: LinearV1IssueUpdateOutput;
};

export type LinearV1Node =
	| LinearV1CommentAddCommentNode
	| LinearV1IssueAddLinkNode
	| LinearV1IssueCreateNode
	| LinearV1IssueDeleteNode
	| LinearV1IssueGetNode
	| LinearV1IssueGetAllNode
	| LinearV1IssueUpdateNode
	;