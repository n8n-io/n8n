/**
 * GitHub Node - Version 1
 * Consume GitHub API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new issue */
export type GithubV1FileCreateConfig = {
	resource: 'file';
	operation: 'create';
/**
 * The file path of the file. Has to contain the full path.
 * @displayOptions.show { resource: ["file"] }
 * @displayOptions.hide { operation: ["list"] }
 */
		filePath: string | Expression<string>;
/**
 * Whether the data to upload should be taken from binary field
 * @displayOptions.show { operation: ["create", "edit"], resource: ["file"] }
 * @default false
 */
		binaryData: boolean | Expression<boolean>;
/**
 * The text content of the file
 * @displayOptions.show { binaryData: [false], operation: ["create", "edit"], resource: ["file"] }
 */
		fileContent: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	commitMessage: string | Expression<string>;
/**
 * Additional fields to add
 * @displayOptions.show { operation: ["create", "delete", "edit"], resource: ["file"] }
 * @default {}
 */
		additionalParameters?: {
		author?: {
			/** The name of the author of the commit
			 */
			name?: string | Expression<string>;
			/** The email of the author of the commit
			 */
			email?: string | Expression<string>;
		};
		branch?: {
			/** The branch to commit to. If not set the repository’s default branch (usually master) is used.
			 */
			branch?: string | Expression<string>;
		};
		committer?: {
			/** The name of the committer of the commit
			 */
			name?: string | Expression<string>;
			/** The email of the committer of the commit
			 */
			email?: string | Expression<string>;
		};
	};
};

/** Delete a file in repository */
export type GithubV1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
/**
 * The file path of the file. Has to contain the full path.
 * @displayOptions.show { resource: ["file"] }
 * @displayOptions.hide { operation: ["list"] }
 */
		filePath: string | Expression<string>;
	commitMessage: string | Expression<string>;
/**
 * Additional fields to add
 * @displayOptions.show { operation: ["create", "delete", "edit"], resource: ["file"] }
 * @default {}
 */
		additionalParameters?: {
		author?: {
			/** The name of the author of the commit
			 */
			name?: string | Expression<string>;
			/** The email of the author of the commit
			 */
			email?: string | Expression<string>;
		};
		branch?: {
			/** The branch to commit to. If not set the repository’s default branch (usually master) is used.
			 */
			branch?: string | Expression<string>;
		};
		committer?: {
			/** The name of the committer of the commit
			 */
			name?: string | Expression<string>;
			/** The email of the committer of the commit
			 */
			email?: string | Expression<string>;
		};
	};
};

/** Edit an issue */
export type GithubV1FileEditConfig = {
	resource: 'file';
	operation: 'edit';
/**
 * The file path of the file. Has to contain the full path.
 * @displayOptions.show { resource: ["file"] }
 * @displayOptions.hide { operation: ["list"] }
 */
		filePath: string | Expression<string>;
/**
 * Whether the data to upload should be taken from binary field
 * @displayOptions.show { operation: ["create", "edit"], resource: ["file"] }
 * @default false
 */
		binaryData: boolean | Expression<boolean>;
/**
 * The text content of the file
 * @displayOptions.show { binaryData: [false], operation: ["create", "edit"], resource: ["file"] }
 */
		fileContent: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	commitMessage: string | Expression<string>;
/**
 * Additional fields to add
 * @displayOptions.show { operation: ["create", "delete", "edit"], resource: ["file"] }
 * @default {}
 */
		additionalParameters?: {
		author?: {
			/** The name of the author of the commit
			 */
			name?: string | Expression<string>;
			/** The email of the author of the commit
			 */
			email?: string | Expression<string>;
		};
		branch?: {
			/** The branch to commit to. If not set the repository’s default branch (usually master) is used.
			 */
			branch?: string | Expression<string>;
		};
		committer?: {
			/** The name of the committer of the commit
			 */
			name?: string | Expression<string>;
			/** The email of the committer of the commit
			 */
			email?: string | Expression<string>;
		};
	};
};

/** Get the data of a single issue */
export type GithubV1FileGetConfig = {
	resource: 'file';
	operation: 'get';
/**
 * The file path of the file. Has to contain the full path.
 * @displayOptions.show { resource: ["file"] }
 * @displayOptions.hide { operation: ["list"] }
 */
		filePath: string | Expression<string>;
/**
 * Whether to set the data of the file as binary property instead of returning the raw API response
 * @displayOptions.show { operation: ["get"], resource: ["file"] }
 * @default true
 */
		asBinaryProperty?: boolean | Expression<boolean>;
	binaryPropertyName: string | Expression<string>;
/**
 * Additional fields to add
 * @displayOptions.show { operation: ["get"], resource: ["file"] }
 * @default {}
 */
		additionalParameters?: Record<string, unknown>;
};

/** List contents of a folder */
export type GithubV1FileListConfig = {
	resource: 'file';
	operation: 'list';
/**
 * The file path of the file. Has to contain the full path.
 * @displayOptions.show { resource: ["file"] }
 * @displayOptions.hide { operation: ["list"] }
 */
		filePath: string | Expression<string>;
};

/** Create a new issue */
export type GithubV1IssueCreateConfig = {
	resource: 'issue';
	operation: 'create';
/**
 * The title of the issue
 * @displayOptions.show { operation: ["create"], resource: ["issue"] }
 */
		title: string | Expression<string>;
/**
 * The body of the issue
 * @displayOptions.show { operation: ["create"], resource: ["issue"] }
 */
		body?: string | Expression<string>;
	labels?: Record<string, unknown>;
	assignees?: Record<string, unknown>;
};

/** Create a new comment on an issue */
export type GithubV1IssueCreateCommentConfig = {
	resource: 'issue';
	operation: 'createComment';
/**
 * The number of the issue on which to create the comment on
 * @displayOptions.show { operation: ["createComment"], resource: ["issue"] }
 * @default 0
 */
		issueNumber: number | Expression<number>;
/**
 * The body of the comment
 * @displayOptions.show { operation: ["createComment"], resource: ["issue"] }
 */
		body?: string | Expression<string>;
};

/** Edit an issue */
export type GithubV1IssueEditConfig = {
	resource: 'issue';
	operation: 'edit';
/**
 * The number of the issue edit
 * @displayOptions.show { operation: ["edit"], resource: ["issue"] }
 * @default 0
 */
		issueNumber: number | Expression<number>;
	editFields?: Record<string, unknown>;
};

/** Get the data of a single issue */
export type GithubV1IssueGetConfig = {
	resource: 'issue';
	operation: 'get';
/**
 * The issue number to get data for
 * @displayOptions.show { operation: ["get"], resource: ["issue"] }
 * @default 0
 */
		issueNumber: number | Expression<number>;
};

/** Lock an issue */
export type GithubV1IssueLockConfig = {
	resource: 'issue';
	operation: 'lock';
/**
 * The issue number to lock
 * @displayOptions.show { operation: ["lock"], resource: ["issue"] }
 * @default 0
 */
		issueNumber: number | Expression<number>;
/**
 * The reason for locking the issue
 * @displayOptions.show { operation: ["lock"], resource: ["issue"] }
 * @default resolved
 */
		lockReason?: 'off-topic' | 'too heated' | 'resolved' | 'spam' | Expression<string>;
};

/** Returns all repositories of an organization */
export type GithubV1OrganizationGetRepositoriesConfig = {
	resource: 'organization';
	operation: 'getRepositories';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["organization"], operation: ["getRepositories"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["organization"], operation: ["getRepositories"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Create a new issue */
export type GithubV1ReleaseCreateConfig = {
	resource: 'release';
	operation: 'create';
/**
 * The tag of the release
 * @displayOptions.show { operation: ["create"], resource: ["release"] }
 */
		releaseTag: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a file in repository */
export type GithubV1ReleaseDeleteConfig = {
	resource: 'release';
	operation: 'delete';
	release_id: string | Expression<string>;
};

/** Get the data of a single issue */
export type GithubV1ReleaseGetConfig = {
	resource: 'release';
	operation: 'get';
	release_id: string | Expression<string>;
};

/** Get many repository releases */
export type GithubV1ReleaseGetAllConfig = {
	resource: 'release';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["release"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["release"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update a release */
export type GithubV1ReleaseUpdateConfig = {
	resource: 'release';
	operation: 'update';
	release_id: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get the data of a single issue */
export type GithubV1RepositoryGetConfig = {
	resource: 'repository';
	operation: 'get';
};

/** Returns issues of a repository */
export type GithubV1RepositoryGetIssuesConfig = {
	resource: 'repository';
	operation: 'getIssues';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["repository"], operation: ["getIssues"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["repository"], operation: ["getIssues"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	getRepositoryIssuesFilters?: Record<string, unknown>;
};

/** Returns the contents of the repository's license file, if one is detected */
export type GithubV1RepositoryGetLicenseConfig = {
	resource: 'repository';
	operation: 'getLicense';
};

/** Get the community profile of a repository with metrics, health score, description, license, etc */
export type GithubV1RepositoryGetProfileConfig = {
	resource: 'repository';
	operation: 'getProfile';
};

/** Returns pull requests of a repository */
export type GithubV1RepositoryGetPullRequestsConfig = {
	resource: 'repository';
	operation: 'getPullRequests';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["repository"], operation: ["getPullRequests"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return. Maximum value is &lt;a href="https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#list-pull-requests"&gt;100&lt;/a&gt;.
 * @displayOptions.show { resource: ["repository"], operation: ["getPullRequests"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	getRepositoryPullRequestsFilters?: Record<string, unknown>;
};

/** Get the top 10 popular content paths over the last 14 days */
export type GithubV1RepositoryListPopularPathsConfig = {
	resource: 'repository';
	operation: 'listPopularPaths';
};

/** Get the top 10 referrering domains over the last 14 days */
export type GithubV1RepositoryListReferrersConfig = {
	resource: 'repository';
	operation: 'listReferrers';
};

/** Create a new issue */
export type GithubV1ReviewCreateConfig = {
	resource: 'review';
	operation: 'create';
/**
 * The number of the pull request to review
 * @displayOptions.show { operation: ["create"], resource: ["review"] }
 * @default 0
 */
		pullRequestNumber: number | Expression<number>;
/**
 * The review action you want to perform
 * @displayOptions.show { operation: ["create"], resource: ["review"] }
 * @default approve
 */
		event?: 'approve' | 'requestChanges' | 'comment' | 'pending' | Expression<string>;
/**
 * The body of the review (required for events Request Changes or Comment)
 * @displayOptions.show { operation: ["create"], resource: ["review"], event: ["requestChanges", "comment"] }
 */
		body?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get the data of a single issue */
export type GithubV1ReviewGetConfig = {
	resource: 'review';
	operation: 'get';
/**
 * The number of the pull request
 * @displayOptions.show { operation: ["get", "update"], resource: ["review"] }
 * @default 0
 */
		pullRequestNumber: number | Expression<number>;
/**
 * ID of the review
 * @displayOptions.show { operation: ["get", "update"], resource: ["review"] }
 */
		reviewId: string | Expression<string>;
};

/** Get many repository releases */
export type GithubV1ReviewGetAllConfig = {
	resource: 'review';
	operation: 'getAll';
/**
 * The number of the pull request
 * @displayOptions.show { operation: ["getAll"], resource: ["review"] }
 * @default 0
 */
		pullRequestNumber: number | Expression<number>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["review"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["review"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update a release */
export type GithubV1ReviewUpdateConfig = {
	resource: 'review';
	operation: 'update';
/**
 * The number of the pull request
 * @displayOptions.show { operation: ["get", "update"], resource: ["review"] }
 * @default 0
 */
		pullRequestNumber: number | Expression<number>;
/**
 * ID of the review
 * @displayOptions.show { operation: ["get", "update"], resource: ["review"] }
 */
		reviewId: string | Expression<string>;
/**
 * The body of the review
 * @displayOptions.show { operation: ["update"], resource: ["review"] }
 */
		body?: string | Expression<string>;
};

/** Returns all repositories of an organization */
export type GithubV1UserGetRepositoriesConfig = {
	resource: 'user';
	operation: 'getRepositories';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["getRepositories"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getRepositories"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Returns the issues assigned to the user */
export type GithubV1UserGetUserIssuesConfig = {
	resource: 'user';
	operation: 'getUserIssues';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getUserIssues"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getUserIssues"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	getUserIssuesFilters?: Record<string, unknown>;
};

/** Invites a user to an organization */
export type GithubV1UserInviteConfig = {
	resource: 'user';
	operation: 'invite';
/**
 * The GitHub organization that the user is being invited to
 * @displayOptions.show { operation: ["invite"], resource: ["user"] }
 */
		organization: string | Expression<string>;
/**
 * The email address of the invited user
 * @displayOptions.show { operation: ["invite"], resource: ["user"] }
 */
		email: string | Expression<string>;
};

/** Disable a workflow */
export type GithubV1WorkflowDisableConfig = {
	resource: 'workflow';
	operation: 'disable';
/**
 * The workflow to dispatch
 * @displayOptions.show { resource: ["workflow"], operation: ["disable", "dispatch", "dispatchAndWait", "get", "getUsage", "enable"] }
 * @default {"mode":"list","value":""}
 */
		workflowId: ResourceLocatorValue;
};

/** Dispatch a workflow event */
export type GithubV1WorkflowDispatchConfig = {
	resource: 'workflow';
	operation: 'dispatch';
/**
 * The workflow to dispatch
 * @displayOptions.show { resource: ["workflow"], operation: ["disable", "dispatch", "dispatchAndWait", "get", "getUsage", "enable"] }
 * @default {"mode":"list","value":""}
 */
		workflowId: ResourceLocatorValue;
/**
 * JSON object with input parameters for the workflow
 * @displayOptions.show { resource: ["workflow"], operation: ["dispatch", "dispatchAndWait"] }
 * @default {}
 */
		inputs?: IDataObject | string | Expression<string>;
};

/** Dispatch a workflow event and wait for a webhook to be called before proceeding */
export type GithubV1WorkflowDispatchAndWaitConfig = {
	resource: 'workflow';
	operation: 'dispatchAndWait';
/**
 * The workflow to dispatch
 * @displayOptions.show { resource: ["workflow"], operation: ["disable", "dispatch", "dispatchAndWait", "get", "getUsage", "enable"] }
 * @default {"mode":"list","value":""}
 */
		workflowId: ResourceLocatorValue;
/**
 * JSON object with input parameters for the workflow
 * @displayOptions.show { resource: ["workflow"], operation: ["dispatch", "dispatchAndWait"] }
 * @default {}
 */
		inputs?: IDataObject | string | Expression<string>;
};

/** Enable a workflow */
export type GithubV1WorkflowEnableConfig = {
	resource: 'workflow';
	operation: 'enable';
/**
 * The workflow to dispatch
 * @displayOptions.show { resource: ["workflow"], operation: ["disable", "dispatch", "dispatchAndWait", "get", "getUsage", "enable"] }
 * @default {"mode":"list","value":""}
 */
		workflowId: ResourceLocatorValue;
};

/** Get the data of a single issue */
export type GithubV1WorkflowGetConfig = {
	resource: 'workflow';
	operation: 'get';
/**
 * The workflow to dispatch
 * @displayOptions.show { resource: ["workflow"], operation: ["disable", "dispatch", "dispatchAndWait", "get", "getUsage", "enable"] }
 * @default {"mode":"list","value":""}
 */
		workflowId: ResourceLocatorValue;
};

/** Get the usage of a workflow */
export type GithubV1WorkflowGetUsageConfig = {
	resource: 'workflow';
	operation: 'getUsage';
/**
 * The workflow to dispatch
 * @displayOptions.show { resource: ["workflow"], operation: ["disable", "dispatch", "dispatchAndWait", "get", "getUsage", "enable"] }
 * @default {"mode":"list","value":""}
 */
		workflowId: ResourceLocatorValue;
};

/** List contents of a folder */
export type GithubV1WorkflowListConfig = {
	resource: 'workflow';
	operation: 'list';
};

export type GithubV1Params =
	| GithubV1FileCreateConfig
	| GithubV1FileDeleteConfig
	| GithubV1FileEditConfig
	| GithubV1FileGetConfig
	| GithubV1FileListConfig
	| GithubV1IssueCreateConfig
	| GithubV1IssueCreateCommentConfig
	| GithubV1IssueEditConfig
	| GithubV1IssueGetConfig
	| GithubV1IssueLockConfig
	| GithubV1OrganizationGetRepositoriesConfig
	| GithubV1ReleaseCreateConfig
	| GithubV1ReleaseDeleteConfig
	| GithubV1ReleaseGetConfig
	| GithubV1ReleaseGetAllConfig
	| GithubV1ReleaseUpdateConfig
	| GithubV1RepositoryGetConfig
	| GithubV1RepositoryGetIssuesConfig
	| GithubV1RepositoryGetLicenseConfig
	| GithubV1RepositoryGetProfileConfig
	| GithubV1RepositoryGetPullRequestsConfig
	| GithubV1RepositoryListPopularPathsConfig
	| GithubV1RepositoryListReferrersConfig
	| GithubV1ReviewCreateConfig
	| GithubV1ReviewGetConfig
	| GithubV1ReviewGetAllConfig
	| GithubV1ReviewUpdateConfig
	| GithubV1UserGetRepositoriesConfig
	| GithubV1UserGetUserIssuesConfig
	| GithubV1UserInviteConfig
	| GithubV1WorkflowDisableConfig
	| GithubV1WorkflowDispatchConfig
	| GithubV1WorkflowDispatchAndWaitConfig
	| GithubV1WorkflowEnableConfig
	| GithubV1WorkflowGetConfig
	| GithubV1WorkflowGetUsageConfig
	| GithubV1WorkflowListConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type GithubV1FileCreateOutput = {
	commit?: {
		author?: {
			date?: string;
			email?: string;
			name?: string;
		};
		committer?: {
			date?: string;
			email?: string;
			name?: string;
		};
		html_url?: string;
		message?: string;
		node_id?: string;
		parents?: Array<{
			html_url?: string;
			sha?: string;
			url?: string;
		}>;
		sha?: string;
		tree?: {
			sha?: string;
			url?: string;
		};
		url?: string;
		verification?: {
			payload?: null;
			reason?: string;
			signature?: null;
			verified?: boolean;
			verified_at?: null;
		};
	};
	content?: {
		_links?: {
			git?: string;
			html?: string;
			self?: string;
		};
		download_url?: string;
		git_url?: string;
		html_url?: string;
		name?: string;
		path?: string;
		sha?: string;
		size?: number;
		type?: string;
		url?: string;
	};
};

export type GithubV1FileDeleteOutput = {
	commit?: {
		author?: {
			date?: string;
			email?: string;
			name?: string;
		};
		committer?: {
			date?: string;
			email?: string;
			name?: string;
		};
		html_url?: string;
		message?: string;
		node_id?: string;
		parents?: Array<{
			html_url?: string;
			sha?: string;
			url?: string;
		}>;
		sha?: string;
		tree?: {
			sha?: string;
			url?: string;
		};
		url?: string;
		verification?: {
			payload?: null;
			reason?: string;
			signature?: null;
			verified?: boolean;
			verified_at?: null;
		};
	};
	content?: null;
};

export type GithubV1FileEditOutput = {
	commit?: {
		author?: {
			date?: string;
			email?: string;
			name?: string;
		};
		committer?: {
			date?: string;
			email?: string;
			name?: string;
		};
		html_url?: string;
		message?: string;
		node_id?: string;
		parents?: Array<{
			html_url?: string;
			sha?: string;
			url?: string;
		}>;
		sha?: string;
		tree?: {
			sha?: string;
			url?: string;
		};
		url?: string;
		verification?: {
			payload?: null;
			reason?: string;
			signature?: null;
			verified?: boolean;
			verified_at?: null;
		};
	};
	content?: {
		_links?: {
			git?: string;
			html?: string;
			self?: string;
		};
		download_url?: string;
		git_url?: string;
		html_url?: string;
		name?: string;
		path?: string;
		sha?: string;
		size?: number;
		type?: string;
		url?: string;
	};
};

export type GithubV1FileGetOutput = {
	type?: string;
};

export type GithubV1FileListOutput = {
	_links?: {
		git?: string;
		html?: string;
		self?: string;
	};
	git_url?: string;
	html_url?: string;
	name?: string;
	path?: string;
	sha?: string;
	size?: number;
	type?: string;
	url?: string;
};

export type GithubV1IssueCreateOutput = {
	active_lock_reason?: null;
	assignees?: Array<{
		avatar_url?: string;
		events_url?: string;
		followers_url?: string;
		following_url?: string;
		gists_url?: string;
		gravatar_id?: string;
		html_url?: string;
		id?: number;
		login?: string;
		node_id?: string;
		organizations_url?: string;
		received_events_url?: string;
		repos_url?: string;
		site_admin?: boolean;
		starred_url?: string;
		subscriptions_url?: string;
		type?: string;
		url?: string;
	}>;
	author_association?: string;
	closed_at?: null;
	closed_by?: null;
	comments?: number;
	comments_url?: string;
	created_at?: string;
	events_url?: string;
	html_url?: string;
	id?: number;
	labels?: Array<{
		color?: string;
		'default'?: boolean;
		id?: number;
		name?: string;
		node_id?: string;
		url?: string;
	}>;
	labels_url?: string;
	locked?: boolean;
	milestone?: null;
	node_id?: string;
	number?: number;
	performed_via_github_app?: null;
	reactions?: {
		'-1'?: number;
		'+1'?: number;
		confused?: number;
		eyes?: number;
		heart?: number;
		hooray?: number;
		laugh?: number;
		rocket?: number;
		total_count?: number;
		url?: string;
	};
	repository_url?: string;
	state?: string;
	state_reason?: null;
	timeline_url?: string;
	title?: string;
	updated_at?: string;
	url?: string;
	user?: {
		avatar_url?: string;
		events_url?: string;
		followers_url?: string;
		following_url?: string;
		gists_url?: string;
		gravatar_id?: string;
		html_url?: string;
		id?: number;
		login?: string;
		node_id?: string;
		organizations_url?: string;
		received_events_url?: string;
		repos_url?: string;
		site_admin?: boolean;
		starred_url?: string;
		subscriptions_url?: string;
		type?: string;
		url?: string;
		user_view_type?: string;
	};
};

export type GithubV1IssueCreateCommentOutput = {
	author_association?: string;
	body?: string;
	created_at?: string;
	html_url?: string;
	id?: number;
	issue_url?: string;
	node_id?: string;
	performed_via_github_app?: null;
	reactions?: {
		'-1'?: number;
		'+1'?: number;
		confused?: number;
		eyes?: number;
		heart?: number;
		hooray?: number;
		laugh?: number;
		rocket?: number;
		total_count?: number;
		url?: string;
	};
	updated_at?: string;
	url?: string;
	user?: {
		avatar_url?: string;
		events_url?: string;
		followers_url?: string;
		following_url?: string;
		gists_url?: string;
		gravatar_id?: string;
		html_url?: string;
		id?: number;
		login?: string;
		node_id?: string;
		organizations_url?: string;
		received_events_url?: string;
		repos_url?: string;
		site_admin?: boolean;
		starred_url?: string;
		subscriptions_url?: string;
		type?: string;
		url?: string;
		user_view_type?: string;
	};
};

export type GithubV1IssueGetOutput = {
	active_lock_reason?: null;
	assignee?: {
		avatar_url?: string;
		events_url?: string;
		followers_url?: string;
		following_url?: string;
		gists_url?: string;
		gravatar_id?: string;
		html_url?: string;
		id?: number;
		login?: string;
		node_id?: string;
		organizations_url?: string;
		received_events_url?: string;
		repos_url?: string;
		site_admin?: boolean;
		starred_url?: string;
		subscriptions_url?: string;
		type?: string;
		url?: string;
		user_view_type?: string;
	};
	assignees?: Array<{
		avatar_url?: string;
		events_url?: string;
		followers_url?: string;
		following_url?: string;
		gists_url?: string;
		gravatar_id?: string;
		html_url?: string;
		id?: number;
		login?: string;
		node_id?: string;
		organizations_url?: string;
		received_events_url?: string;
		repos_url?: string;
		site_admin?: boolean;
		starred_url?: string;
		subscriptions_url?: string;
		type?: string;
		url?: string;
		user_view_type?: string;
	}>;
	author_association?: string;
	comments?: number;
	comments_url?: string;
	created_at?: string;
	events_url?: string;
	html_url?: string;
	id?: number;
	labels?: Array<{
		color?: string;
		'default'?: boolean;
		id?: number;
		name?: string;
		node_id?: string;
		url?: string;
	}>;
	labels_url?: string;
	locked?: boolean;
	node_id?: string;
	number?: number;
	performed_via_github_app?: null;
	reactions?: {
		'-1'?: number;
		'+1'?: number;
		confused?: number;
		eyes?: number;
		heart?: number;
		hooray?: number;
		laugh?: number;
		rocket?: number;
		total_count?: number;
		url?: string;
	};
	repository_url?: string;
	state?: string;
	timeline_url?: string;
	title?: string;
	updated_at?: string;
	url?: string;
	user?: {
		avatar_url?: string;
		events_url?: string;
		followers_url?: string;
		following_url?: string;
		gists_url?: string;
		gravatar_id?: string;
		html_url?: string;
		id?: number;
		login?: string;
		node_id?: string;
		organizations_url?: string;
		received_events_url?: string;
		repos_url?: string;
		site_admin?: boolean;
		starred_url?: string;
		subscriptions_url?: string;
		type?: string;
		url?: string;
		user_view_type?: string;
	};
};

export type GithubV1OrganizationGetRepositoriesOutput = {
	allow_forking?: boolean;
	archive_url?: string;
	archived?: boolean;
	assignees_url?: string;
	blobs_url?: string;
	branches_url?: string;
	clone_url?: string;
	collaborators_url?: string;
	comments_url?: string;
	commits_url?: string;
	compare_url?: string;
	contents_url?: string;
	contributors_url?: string;
	created_at?: string;
	default_branch?: string;
	deployments_url?: string;
	disabled?: boolean;
	downloads_url?: string;
	events_url?: string;
	fork?: boolean;
	forks?: number;
	forks_count?: number;
	forks_url?: string;
	full_name?: string;
	git_commits_url?: string;
	git_refs_url?: string;
	git_tags_url?: string;
	git_url?: string;
	has_discussions?: boolean;
	has_downloads?: boolean;
	has_issues?: boolean;
	has_pages?: boolean;
	has_projects?: boolean;
	has_wiki?: boolean;
	hooks_url?: string;
	html_url?: string;
	id?: number;
	is_template?: boolean;
	issue_comment_url?: string;
	issue_events_url?: string;
	issues_url?: string;
	keys_url?: string;
	labels_url?: string;
	languages_url?: string;
	merges_url?: string;
	milestones_url?: string;
	mirror_url?: null;
	name?: string;
	node_id?: string;
	notifications_url?: string;
	open_issues?: number;
	open_issues_count?: number;
	owner?: {
		avatar_url?: string;
		events_url?: string;
		followers_url?: string;
		following_url?: string;
		gists_url?: string;
		gravatar_id?: string;
		html_url?: string;
		id?: number;
		login?: string;
		node_id?: string;
		organizations_url?: string;
		received_events_url?: string;
		repos_url?: string;
		site_admin?: boolean;
		starred_url?: string;
		subscriptions_url?: string;
		type?: string;
		url?: string;
		user_view_type?: string;
	};
	permissions?: {
		admin?: boolean;
		maintain?: boolean;
		pull?: boolean;
		push?: boolean;
		triage?: boolean;
	};
	private?: boolean;
	pulls_url?: string;
	pushed_at?: string;
	releases_url?: string;
	security_and_analysis?: {
		advanced_security?: {
			status?: string;
		};
		dependabot_security_updates?: {
			status?: string;
		};
		secret_scanning?: {
			status?: string;
		};
		secret_scanning_non_provider_patterns?: {
			status?: string;
		};
		secret_scanning_push_protection?: {
			status?: string;
		};
		secret_scanning_validity_checks?: {
			status?: string;
		};
	};
	size?: number;
	ssh_url?: string;
	stargazers_count?: number;
	stargazers_url?: string;
	statuses_url?: string;
	subscribers_url?: string;
	subscription_url?: string;
	svn_url?: string;
	tags_url?: string;
	teams_url?: string;
	topics?: Array<string>;
	trees_url?: string;
	updated_at?: string;
	url?: string;
	visibility?: string;
	watchers?: number;
	watchers_count?: number;
	web_commit_signoff_required?: boolean;
};

export type GithubV1ReleaseGetAllOutput = {
	assets?: Array<{
		browser_download_url?: string;
		content_type?: string;
		created_at?: string;
		download_count?: number;
		id?: number;
		label?: null;
		name?: string;
		node_id?: string;
		size?: number;
		state?: string;
		updated_at?: string;
		uploader?: {
			avatar_url?: string;
			events_url?: string;
			followers_url?: string;
			following_url?: string;
			gists_url?: string;
			gravatar_id?: string;
			html_url?: string;
			id?: number;
			login?: string;
			node_id?: string;
			organizations_url?: string;
			received_events_url?: string;
			repos_url?: string;
			site_admin?: boolean;
			starred_url?: string;
			subscriptions_url?: string;
			type?: string;
			url?: string;
			user_view_type?: string;
		};
		url?: string;
	}>;
	assets_url?: string;
	author?: {
		avatar_url?: string;
		events_url?: string;
		followers_url?: string;
		following_url?: string;
		gists_url?: string;
		gravatar_id?: string;
		html_url?: string;
		id?: number;
		login?: string;
		node_id?: string;
		organizations_url?: string;
		received_events_url?: string;
		repos_url?: string;
		site_admin?: boolean;
		starred_url?: string;
		subscriptions_url?: string;
		type?: string;
		url?: string;
		user_view_type?: string;
	};
	body?: string;
	created_at?: string;
	draft?: boolean;
	html_url?: string;
	id?: number;
	mentions_count?: number;
	name?: string;
	node_id?: string;
	prerelease?: boolean;
	tag_name?: string;
	target_commitish?: string;
	upload_url?: string;
	url?: string;
};

export type GithubV1RepositoryGetOutput = {
	allow_auto_merge?: boolean;
	allow_forking?: boolean;
	allow_merge_commit?: boolean;
	allow_rebase_merge?: boolean;
	allow_squash_merge?: boolean;
	allow_update_branch?: boolean;
	archive_url?: string;
	archived?: boolean;
	assignees_url?: string;
	blobs_url?: string;
	branches_url?: string;
	clone_url?: string;
	collaborators_url?: string;
	comments_url?: string;
	commits_url?: string;
	compare_url?: string;
	contents_url?: string;
	contributors_url?: string;
	created_at?: string;
	default_branch?: string;
	delete_branch_on_merge?: boolean;
	deployments_url?: string;
	disabled?: boolean;
	downloads_url?: string;
	events_url?: string;
	fork?: boolean;
	forks?: number;
	forks_count?: number;
	forks_url?: string;
	full_name?: string;
	git_commits_url?: string;
	git_refs_url?: string;
	git_tags_url?: string;
	git_url?: string;
	has_discussions?: boolean;
	has_downloads?: boolean;
	has_issues?: boolean;
	has_pages?: boolean;
	has_projects?: boolean;
	has_wiki?: boolean;
	hooks_url?: string;
	html_url?: string;
	id?: number;
	is_template?: boolean;
	issue_comment_url?: string;
	issue_events_url?: string;
	issues_url?: string;
	keys_url?: string;
	labels_url?: string;
	languages_url?: string;
	merge_commit_message?: string;
	merge_commit_title?: string;
	merges_url?: string;
	milestones_url?: string;
	mirror_url?: null;
	name?: string;
	network_count?: number;
	node_id?: string;
	notifications_url?: string;
	open_issues?: number;
	open_issues_count?: number;
	owner?: {
		avatar_url?: string;
		events_url?: string;
		followers_url?: string;
		following_url?: string;
		gists_url?: string;
		gravatar_id?: string;
		html_url?: string;
		id?: number;
		login?: string;
		node_id?: string;
		organizations_url?: string;
		received_events_url?: string;
		repos_url?: string;
		site_admin?: boolean;
		starred_url?: string;
		subscriptions_url?: string;
		type?: string;
		url?: string;
		user_view_type?: string;
	};
	permissions?: {
		admin?: boolean;
		maintain?: boolean;
		pull?: boolean;
		push?: boolean;
		triage?: boolean;
	};
	private?: boolean;
	pulls_url?: string;
	pushed_at?: string;
	releases_url?: string;
	size?: number;
	squash_merge_commit_message?: string;
	squash_merge_commit_title?: string;
	ssh_url?: string;
	stargazers_count?: number;
	stargazers_url?: string;
	statuses_url?: string;
	subscribers_count?: number;
	subscribers_url?: string;
	subscription_url?: string;
	svn_url?: string;
	tags_url?: string;
	teams_url?: string;
	temp_clone_token?: string;
	topics?: Array<string>;
	trees_url?: string;
	updated_at?: string;
	url?: string;
	use_squash_pr_title_as_default?: boolean;
	visibility?: string;
	watchers?: number;
	watchers_count?: number;
	web_commit_signoff_required?: boolean;
};

export type GithubV1RepositoryGetIssuesOutput = {
	active_lock_reason?: null;
	assignees?: Array<{
		avatar_url?: string;
		events_url?: string;
		followers_url?: string;
		following_url?: string;
		gists_url?: string;
		gravatar_id?: string;
		html_url?: string;
		id?: number;
		login?: string;
		node_id?: string;
		organizations_url?: string;
		received_events_url?: string;
		repos_url?: string;
		site_admin?: boolean;
		starred_url?: string;
		subscriptions_url?: string;
		type?: string;
		url?: string;
		user_view_type?: string;
	}>;
	author_association?: string;
	comments?: number;
	comments_url?: string;
	created_at?: string;
	events_url?: string;
	html_url?: string;
	id?: number;
	labels?: Array<{
		color?: string;
		'default'?: boolean;
		id?: number;
		name?: string;
		node_id?: string;
		url?: string;
	}>;
	labels_url?: string;
	locked?: boolean;
	node_id?: string;
	number?: number;
	performed_via_github_app?: null;
	reactions?: {
		'-1'?: number;
		'+1'?: number;
		confused?: number;
		eyes?: number;
		heart?: number;
		hooray?: number;
		laugh?: number;
		rocket?: number;
		total_count?: number;
		url?: string;
	};
	repository_url?: string;
	state?: string;
	timeline_url?: string;
	title?: string;
	updated_at?: string;
	url?: string;
	user?: {
		avatar_url?: string;
		events_url?: string;
		followers_url?: string;
		following_url?: string;
		gists_url?: string;
		gravatar_id?: string;
		html_url?: string;
		id?: number;
		login?: string;
		node_id?: string;
		organizations_url?: string;
		received_events_url?: string;
		repos_url?: string;
		site_admin?: boolean;
		starred_url?: string;
		subscriptions_url?: string;
		type?: string;
		url?: string;
		user_view_type?: string;
	};
};

export type GithubV1RepositoryGetLicenseOutput = {
	_links?: {
		git?: string;
		html?: string;
		self?: string;
	};
	content?: string;
	download_url?: string;
	encoding?: string;
	git_url?: string;
	html_url?: string;
	license?: {
		key?: string;
		name?: string;
		node_id?: string;
		spdx_id?: string;
	};
	name?: string;
	path?: string;
	sha?: string;
	size?: number;
	type?: string;
	url?: string;
};

export type GithubV1UserGetRepositoriesOutput = {
	allow_forking?: boolean;
	archive_url?: string;
	archived?: boolean;
	assignees_url?: string;
	blobs_url?: string;
	branches_url?: string;
	clone_url?: string;
	collaborators_url?: string;
	comments_url?: string;
	commits_url?: string;
	compare_url?: string;
	contents_url?: string;
	contributors_url?: string;
	created_at?: string;
	default_branch?: string;
	deployments_url?: string;
	disabled?: boolean;
	downloads_url?: string;
	events_url?: string;
	fork?: boolean;
	forks?: number;
	forks_count?: number;
	forks_url?: string;
	full_name?: string;
	git_commits_url?: string;
	git_refs_url?: string;
	git_tags_url?: string;
	git_url?: string;
	has_discussions?: boolean;
	has_downloads?: boolean;
	has_issues?: boolean;
	has_pages?: boolean;
	has_projects?: boolean;
	has_wiki?: boolean;
	hooks_url?: string;
	html_url?: string;
	id?: number;
	is_template?: boolean;
	issue_comment_url?: string;
	issue_events_url?: string;
	issues_url?: string;
	keys_url?: string;
	labels_url?: string;
	languages_url?: string;
	merges_url?: string;
	milestones_url?: string;
	mirror_url?: null;
	name?: string;
	node_id?: string;
	notifications_url?: string;
	open_issues?: number;
	open_issues_count?: number;
	owner?: {
		avatar_url?: string;
		events_url?: string;
		followers_url?: string;
		following_url?: string;
		gists_url?: string;
		gravatar_id?: string;
		html_url?: string;
		id?: number;
		login?: string;
		node_id?: string;
		organizations_url?: string;
		received_events_url?: string;
		repos_url?: string;
		site_admin?: boolean;
		starred_url?: string;
		subscriptions_url?: string;
		type?: string;
		url?: string;
		user_view_type?: string;
	};
	permissions?: {
		admin?: boolean;
		maintain?: boolean;
		pull?: boolean;
		push?: boolean;
		triage?: boolean;
	};
	private?: boolean;
	pulls_url?: string;
	pushed_at?: string;
	releases_url?: string;
	size?: number;
	ssh_url?: string;
	stargazers_count?: number;
	stargazers_url?: string;
	statuses_url?: string;
	subscribers_url?: string;
	subscription_url?: string;
	svn_url?: string;
	tags_url?: string;
	teams_url?: string;
	topics?: Array<string>;
	trees_url?: string;
	updated_at?: string;
	url?: string;
	visibility?: string;
	watchers?: number;
	watchers_count?: number;
	web_commit_signoff_required?: boolean;
};

export type GithubV1WorkflowListOutput = {
	total_count?: number;
	workflows?: Array<{
		badge_url?: string;
		created_at?: string;
		html_url?: string;
		id?: number;
		name?: string;
		node_id?: string;
		path?: string;
		state?: string;
		updated_at?: string;
		url?: string;
	}>;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface GithubV1Credentials {
	githubApi: CredentialReference;
	githubOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GithubV1NodeBase {
	type: 'n8n-nodes-base.github';
	version: 1;
	credentials?: GithubV1Credentials;
}

export type GithubV1FileCreateNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1FileCreateConfig>;
	output?: GithubV1FileCreateOutput;
};

export type GithubV1FileDeleteNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1FileDeleteConfig>;
	output?: GithubV1FileDeleteOutput;
};

export type GithubV1FileEditNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1FileEditConfig>;
	output?: GithubV1FileEditOutput;
};

export type GithubV1FileGetNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1FileGetConfig>;
	output?: GithubV1FileGetOutput;
};

export type GithubV1FileListNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1FileListConfig>;
	output?: GithubV1FileListOutput;
};

export type GithubV1IssueCreateNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1IssueCreateConfig>;
	output?: GithubV1IssueCreateOutput;
};

export type GithubV1IssueCreateCommentNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1IssueCreateCommentConfig>;
	output?: GithubV1IssueCreateCommentOutput;
};

export type GithubV1IssueEditNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1IssueEditConfig>;
};

export type GithubV1IssueGetNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1IssueGetConfig>;
	output?: GithubV1IssueGetOutput;
};

export type GithubV1IssueLockNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1IssueLockConfig>;
};

export type GithubV1OrganizationGetRepositoriesNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1OrganizationGetRepositoriesConfig>;
	output?: GithubV1OrganizationGetRepositoriesOutput;
};

export type GithubV1ReleaseCreateNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1ReleaseCreateConfig>;
};

export type GithubV1ReleaseDeleteNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1ReleaseDeleteConfig>;
};

export type GithubV1ReleaseGetNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1ReleaseGetConfig>;
};

export type GithubV1ReleaseGetAllNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1ReleaseGetAllConfig>;
	output?: GithubV1ReleaseGetAllOutput;
};

export type GithubV1ReleaseUpdateNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1ReleaseUpdateConfig>;
};

export type GithubV1RepositoryGetNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1RepositoryGetConfig>;
	output?: GithubV1RepositoryGetOutput;
};

export type GithubV1RepositoryGetIssuesNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1RepositoryGetIssuesConfig>;
	output?: GithubV1RepositoryGetIssuesOutput;
};

export type GithubV1RepositoryGetLicenseNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1RepositoryGetLicenseConfig>;
	output?: GithubV1RepositoryGetLicenseOutput;
};

export type GithubV1RepositoryGetProfileNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1RepositoryGetProfileConfig>;
};

export type GithubV1RepositoryGetPullRequestsNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1RepositoryGetPullRequestsConfig>;
};

export type GithubV1RepositoryListPopularPathsNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1RepositoryListPopularPathsConfig>;
};

export type GithubV1RepositoryListReferrersNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1RepositoryListReferrersConfig>;
};

export type GithubV1ReviewCreateNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1ReviewCreateConfig>;
};

export type GithubV1ReviewGetNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1ReviewGetConfig>;
};

export type GithubV1ReviewGetAllNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1ReviewGetAllConfig>;
};

export type GithubV1ReviewUpdateNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1ReviewUpdateConfig>;
};

export type GithubV1UserGetRepositoriesNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1UserGetRepositoriesConfig>;
	output?: GithubV1UserGetRepositoriesOutput;
};

export type GithubV1UserGetUserIssuesNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1UserGetUserIssuesConfig>;
};

export type GithubV1UserInviteNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1UserInviteConfig>;
};

export type GithubV1WorkflowDisableNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1WorkflowDisableConfig>;
};

export type GithubV1WorkflowDispatchNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1WorkflowDispatchConfig>;
};

export type GithubV1WorkflowDispatchAndWaitNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1WorkflowDispatchAndWaitConfig>;
};

export type GithubV1WorkflowEnableNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1WorkflowEnableConfig>;
};

export type GithubV1WorkflowGetNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1WorkflowGetConfig>;
};

export type GithubV1WorkflowGetUsageNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1WorkflowGetUsageConfig>;
};

export type GithubV1WorkflowListNode = GithubV1NodeBase & {
	config: NodeConfig<GithubV1WorkflowListConfig>;
	output?: GithubV1WorkflowListOutput;
};

export type GithubV1Node =
	| GithubV1FileCreateNode
	| GithubV1FileDeleteNode
	| GithubV1FileEditNode
	| GithubV1FileGetNode
	| GithubV1FileListNode
	| GithubV1IssueCreateNode
	| GithubV1IssueCreateCommentNode
	| GithubV1IssueEditNode
	| GithubV1IssueGetNode
	| GithubV1IssueLockNode
	| GithubV1OrganizationGetRepositoriesNode
	| GithubV1ReleaseCreateNode
	| GithubV1ReleaseDeleteNode
	| GithubV1ReleaseGetNode
	| GithubV1ReleaseGetAllNode
	| GithubV1ReleaseUpdateNode
	| GithubV1RepositoryGetNode
	| GithubV1RepositoryGetIssuesNode
	| GithubV1RepositoryGetLicenseNode
	| GithubV1RepositoryGetProfileNode
	| GithubV1RepositoryGetPullRequestsNode
	| GithubV1RepositoryListPopularPathsNode
	| GithubV1RepositoryListReferrersNode
	| GithubV1ReviewCreateNode
	| GithubV1ReviewGetNode
	| GithubV1ReviewGetAllNode
	| GithubV1ReviewUpdateNode
	| GithubV1UserGetRepositoriesNode
	| GithubV1UserGetUserIssuesNode
	| GithubV1UserInviteNode
	| GithubV1WorkflowDisableNode
	| GithubV1WorkflowDispatchNode
	| GithubV1WorkflowDispatchAndWaitNode
	| GithubV1WorkflowEnableNode
	| GithubV1WorkflowGetNode
	| GithubV1WorkflowGetUsageNode
	| GithubV1WorkflowListNode
	;