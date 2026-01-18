/**
 * Sentry.io Node Types
 *
 * Consume Sentry.io API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/sentryio/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get event by ID */
export type SentryIoV1EventGetConfig = {
	resource: 'event';
	operation: 'get';
	/**
	 * The slug of the organization the events belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	organizationSlug: string | Expression<string>;
	/**
	 * The slug of the project the events belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectSlug: string | Expression<string>;
	/**
	 * The ID of the event to retrieve (either the numeric primary-key or the hexadecimal ID as reported by the raven client)
	 */
	eventId: string | Expression<string>;
};

/** Get many events */
export type SentryIoV1EventGetAllConfig = {
	resource: 'event';
	operation: 'getAll';
	/**
	 * The slug of the organization the events belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	organizationSlug: string | Expression<string>;
	/**
	 * The slug of the project the events belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectSlug: string | Expression<string>;
	/**
	 * Whether the event payload will include the full event body, including the stack trace
	 * @default true
	 */
	full?: boolean | Expression<boolean>;
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

/** Delete an issue */
export type SentryIoV1IssueDeleteConfig = {
	resource: 'issue';
	operation: 'delete';
	/**
	 * ID of issue to get
	 */
	issueId: string | Expression<string>;
};

/** Get event by ID */
export type SentryIoV1IssueGetConfig = {
	resource: 'issue';
	operation: 'get';
	/**
	 * ID of issue to get
	 */
	issueId: string | Expression<string>;
};

/** Get many events */
export type SentryIoV1IssueGetAllConfig = {
	resource: 'issue';
	operation: 'getAll';
	/**
	 * The slug of the organization the issues belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	organizationSlug: string | Expression<string>;
	/**
	 * The slug of the project the issues belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectSlug: string | Expression<string>;
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
	additionalFields?: Record<string, unknown>;
};

/** Update an issue */
export type SentryIoV1IssueUpdateConfig = {
	resource: 'issue';
	operation: 'update';
	/**
	 * ID of issue to get
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
	 */
	name: string | Expression<string>;
	/**
	 * Whether you agree to the applicable terms of service and privacy policy of Sentry.io
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
	 */
	organizationSlug: string | Expression<string>;
};

/** Get many events */
export type SentryIoV1OrganizationGetAllConfig = {
	resource: 'organization';
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
	additionalFields?: Record<string, unknown>;
};

/** Update an issue */
export type SentryIoV1OrganizationUpdateConfig = {
	resource: 'organization';
	operation: 'update';
	/**
	 * The slug of the organization to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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
	 */
	organizationSlug: string | Expression<string>;
	/**
	 * The slug of the team to create a new project for. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	teamSlug: string | Expression<string>;
	/**
	 * The name for the new project
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
	 */
	organizationSlug: string | Expression<string>;
	/**
	 * The slug of the project to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectSlug: string | Expression<string>;
};

/** Get event by ID */
export type SentryIoV1ProjectGetConfig = {
	resource: 'project';
	operation: 'get';
	/**
	 * The slug of the organization the events belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	organizationSlug: string | Expression<string>;
	/**
	 * The slug of the project to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectSlug: string | Expression<string>;
};

/** Get many events */
export type SentryIoV1ProjectGetAllConfig = {
	resource: 'project';
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

/** Update an issue */
export type SentryIoV1ProjectUpdateConfig = {
	resource: 'project';
	operation: 'update';
	/**
	 * The slug of the organization the project belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	organizationSlug: string | Expression<string>;
	/**
	 * The slug of the project to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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
	 */
	organizationSlug: string | Expression<string>;
	/**
	 * A version identifier for this release. Can be a version number, a commit hash etc.
	 */
	version: string | Expression<string>;
	/**
	 * A URL that points to the release. This can be the path to an online interface to the sourcecode for instance.
	 */
	url: string | Expression<string>;
	/**
	 * A list of project slugs that are involved in this release. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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
	 */
	organizationSlug: string | Expression<string>;
	/**
	 * The version identifier of the release
	 */
	version: string | Expression<string>;
};

/** Get event by ID */
export type SentryIoV1ReleaseGetConfig = {
	resource: 'release';
	operation: 'get';
	/**
	 * The slug of the organization the release belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	organizationSlug: string | Expression<string>;
	/**
	 * The version identifier of the release
	 */
	version: string | Expression<string>;
};

/** Get many events */
export type SentryIoV1ReleaseGetAllConfig = {
	resource: 'release';
	operation: 'getAll';
	/**
	 * The slug of the organization the releases belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	organizationSlug: string | Expression<string>;
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
	additionalFields?: Record<string, unknown>;
};

/** Update an issue */
export type SentryIoV1ReleaseUpdateConfig = {
	resource: 'release';
	operation: 'update';
	/**
	 * The slug of the organization the release belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	organizationSlug: string | Expression<string>;
	/**
	 * A version identifier for this release. Can be a version number, a commit hash etc.
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
	 */
	organizationSlug: string | Expression<string>;
	/**
	 * The name of the team
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
	 */
	organizationSlug: string | Expression<string>;
	/**
	 * The slug of the team to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	teamSlug: string | Expression<string>;
};

/** Get event by ID */
export type SentryIoV1TeamGetConfig = {
	resource: 'team';
	operation: 'get';
	/**
	 * The slug of the organization the team belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	organizationSlug: string | Expression<string>;
	/**
	 * The slug of the team to get. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	teamSlug: string | Expression<string>;
};

/** Get many events */
export type SentryIoV1TeamGetAllConfig = {
	resource: 'team';
	operation: 'getAll';
	/**
	 * The slug of the organization for which the teams should be listed. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	organizationSlug: string | Expression<string>;
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

/** Update an issue */
export type SentryIoV1TeamUpdateConfig = {
	resource: 'team';
	operation: 'update';
	/**
	 * The slug of the organization the team belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	organizationSlug: string | Expression<string>;
	/**
	 * The slug of the team to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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
	| SentryIoV1TeamUpdateConfig;

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

export type SentryIoV1Node = {
	type: 'n8n-nodes-base.sentryIo';
	version: 1;
	config: NodeConfig<SentryIoV1Params>;
	credentials?: SentryIoV1Credentials;
};

export type SentryIoNode = SentryIoV1Node;
