/**
 * Sentry.io Node - Version 1
 * Consume Sentry.io API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get event by ID */
export type SentryIoV1EventGetConfig = {
	resource: 'event';
	operation: 'get';
/**
 * The slug of the organization the events belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["event"], operation: ["get"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * The slug of the project the events belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["event"], operation: ["get"] }
 */
		projectSlug: string | Expression<string>;
/**
 * The ID of the event to retrieve (either the numeric primary-key or the hexadecimal ID as reported by the raven client)
 * @displayOptions.show { resource: ["event"], operation: ["get"] }
 */
		eventId: string | Expression<string>;
};

/** Get many events */
export type SentryIoV1EventGetAllConfig = {
	resource: 'event';
	operation: 'getAll';
/**
 * The slug of the organization the events belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["event"], operation: ["getAll"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * The slug of the project the events belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["event"], operation: ["getAll"] }
 */
		projectSlug: string | Expression<string>;
/**
 * Whether the event payload will include the full event body, including the stack trace
 * @displayOptions.show { resource: ["event"], operation: ["getAll"] }
 * @default true
 */
		full?: boolean | Expression<boolean>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["event"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["event"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Delete an issue */
export type SentryIoV1IssueDeleteConfig = {
	resource: 'issue';
	operation: 'delete';
/**
 * ID of issue to get
 * @displayOptions.show { resource: ["issue"], operation: ["get", "delete"] }
 */
		issueId: string | Expression<string>;
};

/** Get event by ID */
export type SentryIoV1IssueGetConfig = {
	resource: 'issue';
	operation: 'get';
/**
 * ID of issue to get
 * @displayOptions.show { resource: ["issue"], operation: ["get", "delete"] }
 */
		issueId: string | Expression<string>;
};

/** Get many events */
export type SentryIoV1IssueGetAllConfig = {
	resource: 'issue';
	operation: 'getAll';
/**
 * The slug of the organization the issues belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["issue"], operation: ["getAll"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * The slug of the project the issues belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["issue"], operation: ["getAll"] }
 */
		projectSlug: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["issue"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["issue"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Update an issue */
export type SentryIoV1IssueUpdateConfig = {
	resource: 'issue';
	operation: 'update';
/**
 * ID of issue to get
 * @displayOptions.show { resource: ["issue"], operation: ["update"] }
 */
		issueId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create an organization */
export type SentryIoV1OrganizationCreateConfig = {
	resource: 'organization';
	operation: 'create';
/**
 * The slug of the organization the team should be created for
 * @displayOptions.show { resource: ["organization"], operation: ["create"] }
 */
		name: string | Expression<string>;
/**
 * Whether you agree to the applicable terms of service and privacy policy of Sentry.io
 * @displayOptions.show { resource: ["organization"], operation: ["create"] }
 * @default false
 */
		agreeTerms?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Get event by ID */
export type SentryIoV1OrganizationGetConfig = {
	resource: 'organization';
	operation: 'get';
/**
 * The slug of the organization the team should be created for. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["organization"], operation: ["get"] }
 */
		organizationSlug: string | Expression<string>;
};

/** Get many events */
export type SentryIoV1OrganizationGetAllConfig = {
	resource: 'organization';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["organization"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["organization"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Update an issue */
export type SentryIoV1OrganizationUpdateConfig = {
	resource: 'organization';
	operation: 'update';
/**
 * The slug of the organization to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["organization"], operation: ["update"] }
 */
		organization_slug: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an organization */
export type SentryIoV1ProjectCreateConfig = {
	resource: 'project';
	operation: 'create';
/**
 * The slug of the organization the events belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["project"], operation: ["create", "get"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * The slug of the team to create a new project for. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["project"], operation: ["create"] }
 */
		teamSlug: string | Expression<string>;
/**
 * The name for the new project
 * @displayOptions.show { resource: ["project"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an issue */
export type SentryIoV1ProjectDeleteConfig = {
	resource: 'project';
	operation: 'delete';
/**
 * The slug of the organization the project belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["project"], operation: ["delete"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * The slug of the project to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["project"], operation: ["delete"] }
 */
		projectSlug: string | Expression<string>;
};

/** Get event by ID */
export type SentryIoV1ProjectGetConfig = {
	resource: 'project';
	operation: 'get';
/**
 * The slug of the organization the events belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["project"], operation: ["create", "get"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * The slug of the project to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["project"], operation: ["get"] }
 */
		projectSlug: string | Expression<string>;
};

/** Get many events */
export type SentryIoV1ProjectGetAllConfig = {
	resource: 'project';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["project"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["project"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Update an issue */
export type SentryIoV1ProjectUpdateConfig = {
	resource: 'project';
	operation: 'update';
/**
 * The slug of the organization the project belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["project"], operation: ["update"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * The slug of the project to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["project"], operation: ["update"] }
 */
		projectSlug: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an organization */
export type SentryIoV1ReleaseCreateConfig = {
	resource: 'release';
	operation: 'create';
/**
 * The slug of the organization the release belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["release"], operation: ["create"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * A version identifier for this release. Can be a version number, a commit hash etc.
 * @displayOptions.show { resource: ["release"], operation: ["create"] }
 */
		version: string | Expression<string>;
/**
 * A URL that points to the release. This can be the path to an online interface to the sourcecode for instance.
 * @displayOptions.show { resource: ["release"], operation: ["create"] }
 */
		url: string | Expression<string>;
/**
 * A list of project slugs that are involved in this release. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["release"], operation: ["create"] }
 * @default []
 */
		projects: string[];
	additionalFields?: Record<string, unknown>;
};

/** Delete an issue */
export type SentryIoV1ReleaseDeleteConfig = {
	resource: 'release';
	operation: 'delete';
/**
 * The slug of the organization the release belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["release"], operation: ["get", "delete"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * The version identifier of the release
 * @displayOptions.show { resource: ["release"], operation: ["get", "delete"] }
 */
		version: string | Expression<string>;
};

/** Get event by ID */
export type SentryIoV1ReleaseGetConfig = {
	resource: 'release';
	operation: 'get';
/**
 * The slug of the organization the release belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["release"], operation: ["get", "delete"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * The version identifier of the release
 * @displayOptions.show { resource: ["release"], operation: ["get", "delete"] }
 */
		version: string | Expression<string>;
};

/** Get many events */
export type SentryIoV1ReleaseGetAllConfig = {
	resource: 'release';
	operation: 'getAll';
/**
 * The slug of the organization the releases belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["release"], operation: ["getAll"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["release"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["release"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Update an issue */
export type SentryIoV1ReleaseUpdateConfig = {
	resource: 'release';
	operation: 'update';
/**
 * The slug of the organization the release belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["release"], operation: ["update"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * A version identifier for this release. Can be a version number, a commit hash etc.
 * @displayOptions.show { resource: ["release"], operation: ["update"] }
 */
		version: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an organization */
export type SentryIoV1TeamCreateConfig = {
	resource: 'team';
	operation: 'create';
/**
 * The slug of the organization the team belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["team"], operation: ["create"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * The name of the team
 * @displayOptions.show { resource: ["team"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an issue */
export type SentryIoV1TeamDeleteConfig = {
	resource: 'team';
	operation: 'delete';
/**
 * The slug of the organization the team belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["team"], operation: ["delete"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * The slug of the team to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["team"], operation: ["delete"] }
 */
		teamSlug: string | Expression<string>;
};

/** Get event by ID */
export type SentryIoV1TeamGetConfig = {
	resource: 'team';
	operation: 'get';
/**
 * The slug of the organization the team belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["team"], operation: ["get"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * The slug of the team to get. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["team"], operation: ["get"] }
 */
		teamSlug: string | Expression<string>;
};

/** Get many events */
export type SentryIoV1TeamGetAllConfig = {
	resource: 'team';
	operation: 'getAll';
/**
 * The slug of the organization for which the teams should be listed. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["team"], operation: ["getAll"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["team"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["team"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Update an issue */
export type SentryIoV1TeamUpdateConfig = {
	resource: 'team';
	operation: 'update';
/**
 * The slug of the organization the team belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["team"], operation: ["update"] }
 */
		organizationSlug: string | Expression<string>;
/**
 * The slug of the team to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["team"], operation: ["update"] }
 */
		teamSlug: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type SentryIoV1Params =
	| SentryIoV1EventGetConfig
	| SentryIoV1EventGetAllConfig
	| SentryIoV1IssueDeleteConfig
	| SentryIoV1IssueGetConfig
	| SentryIoV1IssueGetAllConfig
	| SentryIoV1IssueUpdateConfig
	| SentryIoV1OrganizationCreateConfig
	| SentryIoV1OrganizationGetConfig
	| SentryIoV1OrganizationGetAllConfig
	| SentryIoV1OrganizationUpdateConfig
	| SentryIoV1ProjectCreateConfig
	| SentryIoV1ProjectDeleteConfig
	| SentryIoV1ProjectGetConfig
	| SentryIoV1ProjectGetAllConfig
	| SentryIoV1ProjectUpdateConfig
	| SentryIoV1ReleaseCreateConfig
	| SentryIoV1ReleaseDeleteConfig
	| SentryIoV1ReleaseGetConfig
	| SentryIoV1ReleaseGetAllConfig
	| SentryIoV1ReleaseUpdateConfig
	| SentryIoV1TeamCreateConfig
	| SentryIoV1TeamDeleteConfig
	| SentryIoV1TeamGetConfig
	| SentryIoV1TeamGetAllConfig
	| SentryIoV1TeamUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type SentryIoV1IssueGetAllOutput = {
	count?: string;
	culprit?: string;
	firstSeen?: string;
	hasSeen?: boolean;
	id?: string;
	isBookmarked?: boolean;
	isPublic?: boolean;
	isSubscribed?: boolean;
	issueCategory?: string;
	issueType?: string;
	isUnhandled?: boolean;
	lastSeen?: string;
	level?: string;
	metadata?: {
		filename?: string;
		'function'?: string;
		in_app_frame_mix?: string;
		initial_priority?: number;
		sdk?: {
			name?: string;
			name_normalized?: string;
		};
		severity_reason?: string;
		type?: string;
		value?: string;
	};
	numComments?: number;
	permalink?: string;
	platform?: string;
	priority?: string;
	project?: {
		id?: string;
		name?: string;
		platform?: string;
		slug?: string;
	};
	shareId?: null;
	shortId?: string;
	stats?: {
		'24h'?: Array<Array<number>>;
	};
	status?: string;
	substatus?: string;
	title?: string;
	type?: string;
	userCount?: number;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface SentryIoV1Credentials {
	sentryIoOAuth2Api: CredentialReference;
	sentryIoApi: CredentialReference;
	sentryIoServerApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface SentryIoV1NodeBase {
	type: 'n8n-nodes-base.sentryIo';
	version: 1;
	credentials?: SentryIoV1Credentials;
}

export type SentryIoV1EventGetNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1EventGetConfig>;
};

export type SentryIoV1EventGetAllNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1EventGetAllConfig>;
};

export type SentryIoV1IssueDeleteNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1IssueDeleteConfig>;
};

export type SentryIoV1IssueGetNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1IssueGetConfig>;
};

export type SentryIoV1IssueGetAllNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1IssueGetAllConfig>;
	output?: SentryIoV1IssueGetAllOutput;
};

export type SentryIoV1IssueUpdateNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1IssueUpdateConfig>;
};

export type SentryIoV1OrganizationCreateNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1OrganizationCreateConfig>;
};

export type SentryIoV1OrganizationGetNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1OrganizationGetConfig>;
};

export type SentryIoV1OrganizationGetAllNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1OrganizationGetAllConfig>;
};

export type SentryIoV1OrganizationUpdateNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1OrganizationUpdateConfig>;
};

export type SentryIoV1ProjectCreateNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1ProjectCreateConfig>;
};

export type SentryIoV1ProjectDeleteNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1ProjectDeleteConfig>;
};

export type SentryIoV1ProjectGetNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1ProjectGetConfig>;
};

export type SentryIoV1ProjectGetAllNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1ProjectGetAllConfig>;
};

export type SentryIoV1ProjectUpdateNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1ProjectUpdateConfig>;
};

export type SentryIoV1ReleaseCreateNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1ReleaseCreateConfig>;
};

export type SentryIoV1ReleaseDeleteNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1ReleaseDeleteConfig>;
};

export type SentryIoV1ReleaseGetNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1ReleaseGetConfig>;
};

export type SentryIoV1ReleaseGetAllNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1ReleaseGetAllConfig>;
};

export type SentryIoV1ReleaseUpdateNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1ReleaseUpdateConfig>;
};

export type SentryIoV1TeamCreateNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1TeamCreateConfig>;
};

export type SentryIoV1TeamDeleteNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1TeamDeleteConfig>;
};

export type SentryIoV1TeamGetNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1TeamGetConfig>;
};

export type SentryIoV1TeamGetAllNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1TeamGetAllConfig>;
};

export type SentryIoV1TeamUpdateNode = SentryIoV1NodeBase & {
	config: NodeConfig<SentryIoV1TeamUpdateConfig>;
};

export type SentryIoV1Node =
	| SentryIoV1EventGetNode
	| SentryIoV1EventGetAllNode
	| SentryIoV1IssueDeleteNode
	| SentryIoV1IssueGetNode
	| SentryIoV1IssueGetAllNode
	| SentryIoV1IssueUpdateNode
	| SentryIoV1OrganizationCreateNode
	| SentryIoV1OrganizationGetNode
	| SentryIoV1OrganizationGetAllNode
	| SentryIoV1OrganizationUpdateNode
	| SentryIoV1ProjectCreateNode
	| SentryIoV1ProjectDeleteNode
	| SentryIoV1ProjectGetNode
	| SentryIoV1ProjectGetAllNode
	| SentryIoV1ProjectUpdateNode
	| SentryIoV1ReleaseCreateNode
	| SentryIoV1ReleaseDeleteNode
	| SentryIoV1ReleaseGetNode
	| SentryIoV1ReleaseGetAllNode
	| SentryIoV1ReleaseUpdateNode
	| SentryIoV1TeamCreateNode
	| SentryIoV1TeamDeleteNode
	| SentryIoV1TeamGetNode
	| SentryIoV1TeamGetAllNode
	| SentryIoV1TeamUpdateNode
	;