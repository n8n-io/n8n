/**
 * Linear Node - Version 1.1
 * Consume Linear API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
 * @displayOptions.show { resource: ["issue"], operation: ["create"] }
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
export type LinearV11IssueUpdateConfig = {
	resource: 'issue';
	operation: 'update';
	issueId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type LinearV11IssueCreateOutput = {
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

export type LinearV11IssueGetOutput = {
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

export type LinearV11IssueGetAllOutput = {
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

export type LinearV11IssueUpdateOutput = {
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

export interface LinearV11Credentials {
	linearApi: CredentialReference;
	linearOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LinearV11NodeBase {
	type: 'n8n-nodes-base.linear';
	version: 1.1;
	credentials?: LinearV11Credentials;
}

export type LinearV11CommentAddCommentNode = LinearV11NodeBase & {
	config: NodeConfig<LinearV11CommentAddCommentConfig>;
};

export type LinearV11IssueAddLinkNode = LinearV11NodeBase & {
	config: NodeConfig<LinearV11IssueAddLinkConfig>;
};

export type LinearV11IssueCreateNode = LinearV11NodeBase & {
	config: NodeConfig<LinearV11IssueCreateConfig>;
	output?: LinearV11IssueCreateOutput;
};

export type LinearV11IssueDeleteNode = LinearV11NodeBase & {
	config: NodeConfig<LinearV11IssueDeleteConfig>;
};

export type LinearV11IssueGetNode = LinearV11NodeBase & {
	config: NodeConfig<LinearV11IssueGetConfig>;
	output?: LinearV11IssueGetOutput;
};

export type LinearV11IssueGetAllNode = LinearV11NodeBase & {
	config: NodeConfig<LinearV11IssueGetAllConfig>;
	output?: LinearV11IssueGetAllOutput;
};

export type LinearV11IssueUpdateNode = LinearV11NodeBase & {
	config: NodeConfig<LinearV11IssueUpdateConfig>;
	output?: LinearV11IssueUpdateOutput;
};

export type LinearV11Node =
	| LinearV11CommentAddCommentNode
	| LinearV11IssueAddLinkNode
	| LinearV11IssueCreateNode
	| LinearV11IssueDeleteNode
	| LinearV11IssueGetNode
	| LinearV11IssueGetAllNode
	| LinearV11IssueUpdateNode
	;