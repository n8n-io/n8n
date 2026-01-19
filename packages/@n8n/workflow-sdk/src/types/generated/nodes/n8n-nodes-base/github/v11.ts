/**
 * GitHub Node - Version 1.1
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
export type GithubV11FileCreateConfig = {
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
export type GithubV11FileDeleteConfig = {
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
export type GithubV11FileEditConfig = {
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
export type GithubV11FileGetConfig = {
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
export type GithubV11FileListConfig = {
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
export type GithubV11IssueCreateConfig = {
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
export type GithubV11IssueCreateCommentConfig = {
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
export type GithubV11IssueEditConfig = {
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
export type GithubV11IssueGetConfig = {
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
export type GithubV11IssueLockConfig = {
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
export type GithubV11OrganizationGetRepositoriesConfig = {
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
export type GithubV11ReleaseCreateConfig = {
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
export type GithubV11ReviewGetConfig = {
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
export type GithubV11ReviewGetAllConfig = {
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
export type GithubV11ReviewUpdateConfig = {
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
export type GithubV11UserGetRepositoriesConfig = {
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
export type GithubV11UserGetUserIssuesConfig = {
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
export type GithubV11UserInviteConfig = {
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
export type GithubV11WorkflowDisableConfig = {
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
export type GithubV11WorkflowDispatchConfig = {
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
export type GithubV11WorkflowDispatchAndWaitConfig = {
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
export type GithubV11WorkflowEnableConfig = {
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
export type GithubV11WorkflowGetConfig = {
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
export type GithubV11WorkflowGetUsageConfig = {
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
export type GithubV11WorkflowListConfig = {
	resource: 'workflow';
	operation: 'list';
};


// ===========================================================================
// Output Types
// ===========================================================================

export type GithubV11FileCreateOutput = {
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

export type GithubV11FileDeleteOutput = {
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

export type GithubV11FileEditOutput = {
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

export type GithubV11FileGetOutput = {
	type?: string;
};

export type GithubV11FileListOutput = {
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

export type GithubV11IssueCreateOutput = {
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

export type GithubV11IssueCreateCommentOutput = {
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

export type GithubV11IssueGetOutput = {
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

export type GithubV11OrganizationGetRepositoriesOutput = {
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

export type GithubV11ReleaseGetAllOutput = {
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

export type GithubV11RepositoryGetOutput = {
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

export type GithubV11RepositoryGetIssuesOutput = {
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

export type GithubV11RepositoryGetLicenseOutput = {
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

export type GithubV11UserGetRepositoriesOutput = {
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

export type GithubV11WorkflowListOutput = {
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

export interface GithubV11Credentials {
	githubApi: CredentialReference;
	githubOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GithubV11NodeBase {
	type: 'n8n-nodes-base.github';
	version: 1.1;
	credentials?: GithubV11Credentials;
}

export type GithubV11FileCreateNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11FileCreateConfig>;
	output?: GithubV11FileCreateOutput;
};

export type GithubV11FileDeleteNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11FileDeleteConfig>;
	output?: GithubV11FileDeleteOutput;
};

export type GithubV11FileEditNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11FileEditConfig>;
	output?: GithubV11FileEditOutput;
};

export type GithubV11FileGetNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11FileGetConfig>;
	output?: GithubV11FileGetOutput;
};

export type GithubV11FileListNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11FileListConfig>;
	output?: GithubV11FileListOutput;
};

export type GithubV11IssueCreateNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11IssueCreateConfig>;
	output?: GithubV11IssueCreateOutput;
};

export type GithubV11IssueCreateCommentNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11IssueCreateCommentConfig>;
	output?: GithubV11IssueCreateCommentOutput;
};

export type GithubV11IssueEditNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11IssueEditConfig>;
};

export type GithubV11IssueGetNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11IssueGetConfig>;
	output?: GithubV11IssueGetOutput;
};

export type GithubV11IssueLockNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11IssueLockConfig>;
};

export type GithubV11OrganizationGetRepositoriesNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11OrganizationGetRepositoriesConfig>;
	output?: GithubV11OrganizationGetRepositoriesOutput;
};

export type GithubV11ReleaseCreateNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11ReleaseCreateConfig>;
};

export type GithubV11ReleaseDeleteNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11ReleaseDeleteConfig>;
};

export type GithubV11ReleaseGetNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11ReleaseGetConfig>;
};

export type GithubV11ReleaseGetAllNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11ReleaseGetAllConfig>;
	output?: GithubV11ReleaseGetAllOutput;
};

export type GithubV11ReleaseUpdateNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11ReleaseUpdateConfig>;
};

export type GithubV11RepositoryGetNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11RepositoryGetConfig>;
	output?: GithubV11RepositoryGetOutput;
};

export type GithubV11RepositoryGetIssuesNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11RepositoryGetIssuesConfig>;
	output?: GithubV11RepositoryGetIssuesOutput;
};

export type GithubV11RepositoryGetLicenseNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11RepositoryGetLicenseConfig>;
	output?: GithubV11RepositoryGetLicenseOutput;
};

export type GithubV11RepositoryGetProfileNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11RepositoryGetProfileConfig>;
};

export type GithubV11RepositoryGetPullRequestsNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11RepositoryGetPullRequestsConfig>;
};

export type GithubV11RepositoryListPopularPathsNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11RepositoryListPopularPathsConfig>;
};

export type GithubV11RepositoryListReferrersNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11RepositoryListReferrersConfig>;
};

export type GithubV11ReviewCreateNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11ReviewCreateConfig>;
};

export type GithubV11ReviewGetNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11ReviewGetConfig>;
};

export type GithubV11ReviewGetAllNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11ReviewGetAllConfig>;
};

export type GithubV11ReviewUpdateNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11ReviewUpdateConfig>;
};

export type GithubV11UserGetRepositoriesNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11UserGetRepositoriesConfig>;
	output?: GithubV11UserGetRepositoriesOutput;
};

export type GithubV11UserGetUserIssuesNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11UserGetUserIssuesConfig>;
};

export type GithubV11UserInviteNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11UserInviteConfig>;
};

export type GithubV11WorkflowDisableNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11WorkflowDisableConfig>;
};

export type GithubV11WorkflowDispatchNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11WorkflowDispatchConfig>;
};

export type GithubV11WorkflowDispatchAndWaitNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11WorkflowDispatchAndWaitConfig>;
};

export type GithubV11WorkflowEnableNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11WorkflowEnableConfig>;
};

export type GithubV11WorkflowGetNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11WorkflowGetConfig>;
};

export type GithubV11WorkflowGetUsageNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11WorkflowGetUsageConfig>;
};

export type GithubV11WorkflowListNode = GithubV11NodeBase & {
	config: NodeConfig<GithubV11WorkflowListConfig>;
	output?: GithubV11WorkflowListOutput;
};

export type GithubV11Node =
	| GithubV11FileCreateNode
	| GithubV11FileDeleteNode
	| GithubV11FileEditNode
	| GithubV11FileGetNode
	| GithubV11FileListNode
	| GithubV11IssueCreateNode
	| GithubV11IssueCreateCommentNode
	| GithubV11IssueEditNode
	| GithubV11IssueGetNode
	| GithubV11IssueLockNode
	| GithubV11OrganizationGetRepositoriesNode
	| GithubV11ReleaseCreateNode
	| GithubV11ReleaseDeleteNode
	| GithubV11ReleaseGetNode
	| GithubV11ReleaseGetAllNode
	| GithubV11ReleaseUpdateNode
	| GithubV11RepositoryGetNode
	| GithubV11RepositoryGetIssuesNode
	| GithubV11RepositoryGetLicenseNode
	| GithubV11RepositoryGetProfileNode
	| GithubV11RepositoryGetPullRequestsNode
	| GithubV11RepositoryListPopularPathsNode
	| GithubV11RepositoryListReferrersNode
	| GithubV11ReviewCreateNode
	| GithubV11ReviewGetNode
	| GithubV11ReviewGetAllNode
	| GithubV11ReviewUpdateNode
	| GithubV11UserGetRepositoriesNode
	| GithubV11UserGetUserIssuesNode
	| GithubV11UserInviteNode
	| GithubV11WorkflowDisableNode
	| GithubV11WorkflowDispatchNode
	| GithubV11WorkflowDispatchAndWaitNode
	| GithubV11WorkflowEnableNode
	| GithubV11WorkflowGetNode
	| GithubV11WorkflowGetUsageNode
	| GithubV11WorkflowListNode
	;