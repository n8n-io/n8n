/**
 * GitHub Node Types
 *
 * Consume GitHub API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/github/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new issue */
export type GithubV11FileCreateConfig = {
	resource: 'file';
	operation: 'create';
	/**
	 * The file path of the file. Has to contain the full path.
	 */
	filePath: string | Expression<string>;
	/**
	 * Whether the data to upload should be taken from binary field
	 * @default false
	 */
	binaryData: boolean | Expression<boolean>;
	/**
	 * The text content of the file
	 */
	fileContent: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	commitMessage: string | Expression<string>;
	/**
	 * Additional fields to add
	 * @default {}
	 */
	additionalParameters?: Record<string, unknown>;
};

/** Delete a file in repository */
export type GithubV11FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
	/**
	 * The file path of the file. Has to contain the full path.
	 */
	filePath: string | Expression<string>;
	commitMessage: string | Expression<string>;
	/**
	 * Additional fields to add
	 * @default {}
	 */
	additionalParameters?: Record<string, unknown>;
};

/** Edit an issue */
export type GithubV11FileEditConfig = {
	resource: 'file';
	operation: 'edit';
	/**
	 * The file path of the file. Has to contain the full path.
	 */
	filePath: string | Expression<string>;
	/**
	 * Whether the data to upload should be taken from binary field
	 * @default false
	 */
	binaryData: boolean | Expression<boolean>;
	/**
	 * The text content of the file
	 */
	fileContent: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	commitMessage: string | Expression<string>;
	/**
	 * Additional fields to add
	 * @default {}
	 */
	additionalParameters?: Record<string, unknown>;
};

/** Get the data of a single issue */
export type GithubV11FileGetConfig = {
	resource: 'file';
	operation: 'get';
	/**
	 * The file path of the file. Has to contain the full path.
	 */
	filePath: string | Expression<string>;
	/**
	 * Whether to set the data of the file as binary property instead of returning the raw API response
	 * @default true
	 */
	asBinaryProperty?: boolean | Expression<boolean>;
	binaryPropertyName: string | Expression<string>;
	/**
	 * Additional fields to add
	 * @default {}
	 */
	additionalParameters?: Record<string, unknown>;
};

/** List contents of a folder */
export type GithubV11FileListConfig = {
	resource: 'file';
	operation: 'list';
	/**
	 * The file path of the file. Has to contain the full path.
	 */
	filePath: string | Expression<string>;
};

/** Create a new issue */
export type GithubV11IssueCreateConfig = {
	resource: 'issue';
	operation: 'create';
	/**
	 * The title of the issue
	 */
	title: string | Expression<string>;
	/**
	 * The body of the issue
	 */
	body?: string | Expression<string>;
	labels?: Record<string, unknown>;
	assignees?: Record<string, unknown>;
};

/** Create a new comment on an issue */
export type GithubV11IssueCreateCommentConfig = {
	resource: 'issue';
	operation: 'createComment';
	/**
	 * The number of the issue on which to create the comment on
	 * @default 0
	 */
	issueNumber: number | Expression<number>;
	/**
	 * The body of the comment
	 */
	body?: string | Expression<string>;
};

/** Edit an issue */
export type GithubV11IssueEditConfig = {
	resource: 'issue';
	operation: 'edit';
	/**
	 * The number of the issue edit
	 * @default 0
	 */
	issueNumber: number | Expression<number>;
	editFields?: Record<string, unknown>;
};

/** Get the data of a single issue */
export type GithubV11IssueGetConfig = {
	resource: 'issue';
	operation: 'get';
	/**
	 * The issue number to get data for
	 * @default 0
	 */
	issueNumber: number | Expression<number>;
};

/** Lock an issue */
export type GithubV11IssueLockConfig = {
	resource: 'issue';
	operation: 'lock';
	/**
	 * The issue number to lock
	 * @default 0
	 */
	issueNumber: number | Expression<number>;
	/**
	 * The reason for locking the issue
	 * @default resolved
	 */
	lockReason?: 'off-topic' | 'too heated' | 'resolved' | 'spam' | Expression<string>;
};

/** Returns all repositories of an organization */
export type GithubV11OrganizationGetRepositoriesConfig = {
	resource: 'organization';
	operation: 'getRepositories';
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

/** Create a new issue */
export type GithubV11ReleaseCreateConfig = {
	resource: 'release';
	operation: 'create';
	/**
	 * The tag of the release
	 */
	releaseTag: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a file in repository */
export type GithubV11ReleaseDeleteConfig = {
	resource: 'release';
	operation: 'delete';
	release_id: string | Expression<string>;
};

/** Get the data of a single issue */
export type GithubV11ReleaseGetConfig = {
	resource: 'release';
	operation: 'get';
	release_id: string | Expression<string>;
};

/** Get many repository releases */
export type GithubV11ReleaseGetAllConfig = {
	resource: 'release';
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

/** Update a release */
export type GithubV11ReleaseUpdateConfig = {
	resource: 'release';
	operation: 'update';
	release_id: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get the data of a single issue */
export type GithubV11RepositoryGetConfig = {
	resource: 'repository';
	operation: 'get';
};

/** Returns issues of a repository */
export type GithubV11RepositoryGetIssuesConfig = {
	resource: 'repository';
	operation: 'getIssues';
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
	getRepositoryIssuesFilters?: Record<string, unknown>;
};

/** Returns the contents of the repository's license file, if one is detected */
export type GithubV11RepositoryGetLicenseConfig = {
	resource: 'repository';
	operation: 'getLicense';
};

/** Get the community profile of a repository with metrics, health score, description, license, etc */
export type GithubV11RepositoryGetProfileConfig = {
	resource: 'repository';
	operation: 'getProfile';
};

/** Returns pull requests of a repository */
export type GithubV11RepositoryGetPullRequestsConfig = {
	resource: 'repository';
	operation: 'getPullRequests';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return. Maximum value is &lt;a href="https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#list-pull-requests"&gt;100&lt;/a&gt;.
	 * @default 50
	 */
	limit?: number | Expression<number>;
	getRepositoryPullRequestsFilters?: Record<string, unknown>;
};

/** Get the top 10 popular content paths over the last 14 days */
export type GithubV11RepositoryListPopularPathsConfig = {
	resource: 'repository';
	operation: 'listPopularPaths';
};

/** Get the top 10 referrering domains over the last 14 days */
export type GithubV11RepositoryListReferrersConfig = {
	resource: 'repository';
	operation: 'listReferrers';
};

/** Create a new issue */
export type GithubV11ReviewCreateConfig = {
	resource: 'review';
	operation: 'create';
	/**
	 * The number of the pull request to review
	 * @default 0
	 */
	pullRequestNumber: number | Expression<number>;
	/**
	 * The review action you want to perform
	 * @default approve
	 */
	event?: 'approve' | 'requestChanges' | 'comment' | 'pending' | Expression<string>;
	/**
	 * The body of the review (required for events Request Changes or Comment)
	 */
	body?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get the data of a single issue */
export type GithubV11ReviewGetConfig = {
	resource: 'review';
	operation: 'get';
	/**
	 * The number of the pull request
	 * @default 0
	 */
	pullRequestNumber: number | Expression<number>;
	/**
	 * ID of the review
	 */
	reviewId: string | Expression<string>;
};

/** Get many repository releases */
export type GithubV11ReviewGetAllConfig = {
	resource: 'review';
	operation: 'getAll';
	/**
	 * The number of the pull request
	 * @default 0
	 */
	pullRequestNumber: number | Expression<number>;
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

/** Update a release */
export type GithubV11ReviewUpdateConfig = {
	resource: 'review';
	operation: 'update';
	/**
	 * The number of the pull request
	 * @default 0
	 */
	pullRequestNumber: number | Expression<number>;
	/**
	 * ID of the review
	 */
	reviewId: string | Expression<string>;
	/**
	 * The body of the review
	 */
	body?: string | Expression<string>;
};

/** Returns all repositories of an organization */
export type GithubV11UserGetRepositoriesConfig = {
	resource: 'user';
	operation: 'getRepositories';
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

/** Returns the issues assigned to the user */
export type GithubV11UserGetUserIssuesConfig = {
	resource: 'user';
	operation: 'getUserIssues';
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
	getUserIssuesFilters?: Record<string, unknown>;
};

/** Invites a user to an organization */
export type GithubV11UserInviteConfig = {
	resource: 'user';
	operation: 'invite';
	/**
	 * The GitHub organization that the user is being invited to
	 */
	organization: string | Expression<string>;
	/**
	 * The email address of the invited user
	 */
	email: string | Expression<string>;
};

/** Disable a workflow */
export type GithubV11WorkflowDisableConfig = {
	resource: 'workflow';
	operation: 'disable';
	/**
	 * The workflow to dispatch
	 * @default {"mode":"list","value":""}
	 */
	workflowId: ResourceLocatorValue;
};

/** Dispatch a workflow event */
export type GithubV11WorkflowDispatchConfig = {
	resource: 'workflow';
	operation: 'dispatch';
	/**
	 * The workflow to dispatch
	 * @default {"mode":"list","value":""}
	 */
	workflowId: ResourceLocatorValue;
	/**
	 * The git reference for the workflow dispatch (branch or tag name)
	 * @default main
	 */
	ref: string | Expression<string>;
	/**
	 * JSON object with input parameters for the workflow
	 * @default {}
	 */
	inputs?: IDataObject | string | Expression<string>;
};

/** Dispatch a workflow event and wait for a webhook to be called before proceeding */
export type GithubV11WorkflowDispatchAndWaitConfig = {
	resource: 'workflow';
	operation: 'dispatchAndWait';
	/**
	 * The workflow to dispatch
	 * @default {"mode":"list","value":""}
	 */
	workflowId: ResourceLocatorValue;
	/**
	 * The git reference for the workflow dispatch (branch or tag name)
	 * @default main
	 */
	ref: string | Expression<string>;
	/**
	 * JSON object with input parameters for the workflow
	 * @default {}
	 */
	inputs?: IDataObject | string | Expression<string>;
};

/** Enable a workflow */
export type GithubV11WorkflowEnableConfig = {
	resource: 'workflow';
	operation: 'enable';
	/**
	 * The workflow to dispatch
	 * @default {"mode":"list","value":""}
	 */
	workflowId: ResourceLocatorValue;
};

/** Get the data of a single issue */
export type GithubV11WorkflowGetConfig = {
	resource: 'workflow';
	operation: 'get';
	/**
	 * The workflow to dispatch
	 * @default {"mode":"list","value":""}
	 */
	workflowId: ResourceLocatorValue;
};

/** Get the usage of a workflow */
export type GithubV11WorkflowGetUsageConfig = {
	resource: 'workflow';
	operation: 'getUsage';
	/**
	 * The workflow to dispatch
	 * @default {"mode":"list","value":""}
	 */
	workflowId: ResourceLocatorValue;
};

/** List contents of a folder */
export type GithubV11WorkflowListConfig = {
	resource: 'workflow';
	operation: 'list';
};

export type GithubV11Params =
	| GithubV11FileCreateConfig
	| GithubV11FileDeleteConfig
	| GithubV11FileEditConfig
	| GithubV11FileGetConfig
	| GithubV11FileListConfig
	| GithubV11IssueCreateConfig
	| GithubV11IssueCreateCommentConfig
	| GithubV11IssueEditConfig
	| GithubV11IssueGetConfig
	| GithubV11IssueLockConfig
	| GithubV11OrganizationGetRepositoriesConfig
	| GithubV11ReleaseCreateConfig
	| GithubV11ReleaseDeleteConfig
	| GithubV11ReleaseGetConfig
	| GithubV11ReleaseGetAllConfig
	| GithubV11ReleaseUpdateConfig
	| GithubV11RepositoryGetConfig
	| GithubV11RepositoryGetIssuesConfig
	| GithubV11RepositoryGetLicenseConfig
	| GithubV11RepositoryGetProfileConfig
	| GithubV11RepositoryGetPullRequestsConfig
	| GithubV11RepositoryListPopularPathsConfig
	| GithubV11RepositoryListReferrersConfig
	| GithubV11ReviewCreateConfig
	| GithubV11ReviewGetConfig
	| GithubV11ReviewGetAllConfig
	| GithubV11ReviewUpdateConfig
	| GithubV11UserGetRepositoriesConfig
	| GithubV11UserGetUserIssuesConfig
	| GithubV11UserInviteConfig
	| GithubV11WorkflowDisableConfig
	| GithubV11WorkflowDispatchConfig
	| GithubV11WorkflowDispatchAndWaitConfig
	| GithubV11WorkflowEnableConfig
	| GithubV11WorkflowGetConfig
	| GithubV11WorkflowGetUsageConfig
	| GithubV11WorkflowListConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GithubV11Credentials {
	githubApi: CredentialReference;
	githubOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GithubNode = {
	type: 'n8n-nodes-base.github';
	version: 1 | 1.1;
	config: NodeConfig<GithubV11Params>;
	credentials?: GithubV11Credentials;
};
