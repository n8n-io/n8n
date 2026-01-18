/**
 * GitLab Node - Version 1
 * Retrieve data from GitLab API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new issue */
export type GitlabV1FileCreateConfig = {
	resource: 'file';
	operation: 'create';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
/**
 * The file path of the file. Has to contain the full path or leave it empty for root folder.
 * @displayOptions.show { resource: ["file"] }
 * @displayOptions.hide { operation: ["list"] }
 */
		filePath?: string | Expression<string>;
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
 * Name of the new branch to create. The commit is added to this branch.
 * @displayOptions.show { operation: ["create", "delete", "edit"], resource: ["file"] }
 */
		branch: string | Expression<string>;
/**
 * Additional fields to add
 * @displayOptions.show { operation: ["create", "delete", "edit"], resource: ["file"] }
 * @default {}
 */
		additionalParameters?: {
		branchStart?: {
			/** Name of the base branch to create the new branch from
			 */
			branchStart?: string | Expression<string>;
		};
		author?: {
			/** The name of the author of the commit
			 */
			name?: string | Expression<string>;
			/** The email of the author of the commit
			 */
			email?: string | Expression<string>;
		};
		encoding?: {
			/** Change encoding to base64. Default is text.
			 * @default text
			 */
			encoding?: string | Expression<string>;
		};
	};
};

/** Delete a release */
export type GitlabV1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
/**
 * The file path of the file. Has to contain the full path or leave it empty for root folder.
 * @displayOptions.show { resource: ["file"] }
 * @displayOptions.hide { operation: ["list"] }
 */
		filePath?: string | Expression<string>;
	commitMessage: string | Expression<string>;
/**
 * Name of the new branch to create. The commit is added to this branch.
 * @displayOptions.show { operation: ["create", "delete", "edit"], resource: ["file"] }
 */
		branch: string | Expression<string>;
/**
 * Additional fields to add
 * @displayOptions.show { operation: ["create", "delete", "edit"], resource: ["file"] }
 * @default {}
 */
		additionalParameters?: {
		branchStart?: {
			/** Name of the base branch to create the new branch from
			 */
			branchStart?: string | Expression<string>;
		};
		author?: {
			/** The name of the author of the commit
			 */
			name?: string | Expression<string>;
			/** The email of the author of the commit
			 */
			email?: string | Expression<string>;
		};
		encoding?: {
			/** Change encoding to base64. Default is text.
			 * @default text
			 */
			encoding?: string | Expression<string>;
		};
	};
};

/** Edit an issue */
export type GitlabV1FileEditConfig = {
	resource: 'file';
	operation: 'edit';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
/**
 * The file path of the file. Has to contain the full path or leave it empty for root folder.
 * @displayOptions.show { resource: ["file"] }
 * @displayOptions.hide { operation: ["list"] }
 */
		filePath?: string | Expression<string>;
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
 * Name of the new branch to create. The commit is added to this branch.
 * @displayOptions.show { operation: ["create", "delete", "edit"], resource: ["file"] }
 */
		branch: string | Expression<string>;
/**
 * Additional fields to add
 * @displayOptions.show { operation: ["create", "delete", "edit"], resource: ["file"] }
 * @default {}
 */
		additionalParameters?: {
		branchStart?: {
			/** Name of the base branch to create the new branch from
			 */
			branchStart?: string | Expression<string>;
		};
		author?: {
			/** The name of the author of the commit
			 */
			name?: string | Expression<string>;
			/** The email of the author of the commit
			 */
			email?: string | Expression<string>;
		};
		encoding?: {
			/** Change encoding to base64. Default is text.
			 * @default text
			 */
			encoding?: string | Expression<string>;
		};
	};
};

/** Get the data of a single issue */
export type GitlabV1FileGetConfig = {
	resource: 'file';
	operation: 'get';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
/**
 * The file path of the file. Has to contain the full path or leave it empty for root folder.
 * @displayOptions.show { resource: ["file"] }
 * @displayOptions.hide { operation: ["list"] }
 */
		filePath?: string | Expression<string>;
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
export type GitlabV1FileListConfig = {
	resource: 'file';
	operation: 'list';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["release", "file", "repository"], operation: ["getAll", "list", "getIssues"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["release", "file", "repository"], operation: ["getAll", "list", "getIssues"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
/**
 * The file path of the file. Has to contain the full path or leave it empty for root folder.
 * @displayOptions.show { resource: ["file"] }
 * @displayOptions.hide { operation: ["list"] }
 */
		filePath?: string | Expression<string>;
/**
 * Page of results to display
 * @displayOptions.show { resource: ["file"], operation: ["list"], returnAll: [false] }
 * @default 1
 */
		page?: number | Expression<number>;
/**
 * Additional fields to add
 * @displayOptions.show { resource: ["file"], operation: ["list"] }
 * @default {}
 */
		additionalParameters?: Record<string, unknown>;
};

/** Create a new issue */
export type GitlabV1IssueCreateConfig = {
	resource: 'issue';
	operation: 'create';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
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
/**
 * Due Date for issue
 * @displayOptions.show { operation: ["create"], resource: ["issue"] }
 */
		due_date?: string | Expression<string>;
	labels?: Record<string, unknown>;
	assignee_ids?: Record<string, unknown>;
};

/** Create a new comment on an issue */
export type GitlabV1IssueCreateCommentConfig = {
	resource: 'issue';
	operation: 'createComment';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
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
export type GitlabV1IssueEditConfig = {
	resource: 'issue';
	operation: 'edit';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
/**
 * The number of the issue edit
 * @displayOptions.show { operation: ["edit"], resource: ["issue"] }
 * @default 0
 */
		issueNumber: number | Expression<number>;
	editFields?: Record<string, unknown>;
};

/** Get the data of a single issue */
export type GitlabV1IssueGetConfig = {
	resource: 'issue';
	operation: 'get';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
/**
 * The number of the issue get data of
 * @displayOptions.show { operation: ["get"], resource: ["issue"] }
 * @default 0
 */
		issueNumber: number | Expression<number>;
};

/** Lock an issue */
export type GitlabV1IssueLockConfig = {
	resource: 'issue';
	operation: 'lock';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
/**
 * The number of the issue to lock
 * @displayOptions.show { operation: ["lock"], resource: ["issue"] }
 * @default 0
 */
		issueNumber: number | Expression<number>;
/**
 * The reason to lock the issue
 * @displayOptions.show { operation: ["lock"], resource: ["issue"] }
 * @default resolved
 */
		lockReason?: 'off-topic' | 'too heated' | 'resolved' | 'spam' | Expression<string>;
};

/** Create a new issue */
export type GitlabV1ReleaseCreateConfig = {
	resource: 'release';
	operation: 'create';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
/**
 * The tag of the release
 * @displayOptions.show { operation: ["create"], resource: ["release"] }
 */
		releaseTag: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a release */
export type GitlabV1ReleaseDeleteConfig = {
	resource: 'release';
	operation: 'delete';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
/**
 * The ID or URL-encoded path of the project
 * @displayOptions.show { operation: ["delete", "get"], resource: ["release"] }
 */
		projectId: string | Expression<string>;
/**
 * The Git tag the release is associated with
 * @displayOptions.show { operation: ["delete", "get"], resource: ["release"] }
 */
		tag_name: string | Expression<string>;
};

/** Get the data of a single issue */
export type GitlabV1ReleaseGetConfig = {
	resource: 'release';
	operation: 'get';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
/**
 * The ID or URL-encoded path of the project
 * @displayOptions.show { operation: ["delete", "get"], resource: ["release"] }
 */
		projectId: string | Expression<string>;
/**
 * The Git tag the release is associated with
 * @displayOptions.show { operation: ["delete", "get"], resource: ["release"] }
 */
		tag_name: string | Expression<string>;
};

/** Get many releases */
export type GitlabV1ReleaseGetAllConfig = {
	resource: 'release';
	operation: 'getAll';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
/**
 * The ID or URL-encoded path of the project
 * @displayOptions.show { operation: ["getAll"], resource: ["release"] }
 */
		projectId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["release", "file", "repository"], operation: ["getAll", "list", "getIssues"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["release", "file", "repository"], operation: ["getAll", "list", "getIssues"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Update a release */
export type GitlabV1ReleaseUpdateConfig = {
	resource: 'release';
	operation: 'update';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
/**
 * The ID or URL-encoded path of the project
 * @displayOptions.show { operation: ["update"], resource: ["release"] }
 */
		projectId: string | Expression<string>;
/**
 * The Git tag the release is associated with
 * @displayOptions.show { operation: ["update"], resource: ["release"] }
 */
		tag_name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get the data of a single issue */
export type GitlabV1RepositoryGetConfig = {
	resource: 'repository';
	operation: 'get';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
};

/** Returns issues of a repository */
export type GitlabV1RepositoryGetIssuesConfig = {
	resource: 'repository';
	operation: 'getIssues';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["release", "file", "repository"], operation: ["getAll", "list", "getIssues"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["release", "file", "repository"], operation: ["getAll", "list", "getIssues"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
	getRepositoryIssuesFilters?: Record<string, unknown>;
};

/** Returns the repositories of a user */
export type GitlabV1UserGetRepositoriesConfig = {
	resource: 'user';
	operation: 'getRepositories';
/**
 * User, group or namespace of the project
 */
		owner: string | Expression<string>;
};

export type GitlabV1Params =
	| GitlabV1FileCreateConfig
	| GitlabV1FileDeleteConfig
	| GitlabV1FileEditConfig
	| GitlabV1FileGetConfig
	| GitlabV1FileListConfig
	| GitlabV1IssueCreateConfig
	| GitlabV1IssueCreateCommentConfig
	| GitlabV1IssueEditConfig
	| GitlabV1IssueGetConfig
	| GitlabV1IssueLockConfig
	| GitlabV1ReleaseCreateConfig
	| GitlabV1ReleaseDeleteConfig
	| GitlabV1ReleaseGetConfig
	| GitlabV1ReleaseGetAllConfig
	| GitlabV1ReleaseUpdateConfig
	| GitlabV1RepositoryGetConfig
	| GitlabV1RepositoryGetIssuesConfig
	| GitlabV1UserGetRepositoriesConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GitlabV1Credentials {
	gitlabApi: CredentialReference;
	gitlabOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GitlabV1Node = {
	type: 'n8n-nodes-base.gitlab';
	version: 1;
	config: NodeConfig<GitlabV1Params>;
	credentials?: GitlabV1Credentials;
};