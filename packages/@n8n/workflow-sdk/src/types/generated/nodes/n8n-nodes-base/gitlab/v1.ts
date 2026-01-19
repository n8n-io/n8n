/**
 * GitLab Node - Version 1
 * Retrieve data from GitLab API
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
// Output Types
// ===========================================================================

export type GitlabV1FileCreateOutput = {
	branch?: string;
	file_path?: string;
};

export type GitlabV1FileGetOutput = {
	blob_id?: string;
	commit_id?: string;
	content?: string;
	content_sha256?: string;
	encoding?: string;
	execute_filemode?: boolean;
	file_name?: string;
	file_path?: string;
	last_commit_id?: string;
	ref?: string;
	size?: number;
};

export type GitlabV1FileListOutput = {
	id?: string;
	mode?: string;
	name?: string;
	path?: string;
	type?: string;
};

export type GitlabV1IssueCreateOutput = {
	_links?: {
		award_emoji?: string;
		closed_as_duplicate_of?: null;
		notes?: string;
		project?: string;
		self?: string;
	};
	assignees?: Array<{
		avatar_url?: string;
		id?: number;
		locked?: boolean;
		name?: string;
		state?: string;
		username?: string;
		web_url?: string;
	}>;
	author?: {
		id?: number;
		locked?: boolean;
		name?: string;
		state?: string;
		username?: string;
		web_url?: string;
	};
	blocking_issues_count?: number;
	closed_at?: null;
	closed_by?: null;
	confidential?: boolean;
	created_at?: string;
	discussion_locked?: null;
	downvotes?: number;
	has_tasks?: boolean;
	id?: number;
	iid?: number;
	imported?: boolean;
	imported_from?: string;
	issue_type?: string;
	labels?: Array<string>;
	merge_requests_count?: number;
	milestone?: null;
	moved_to_id?: null;
	project_id?: number;
	references?: {
		full?: string;
		relative?: string;
		short?: string;
	};
	service_desk_reply_to?: null;
	severity?: string;
	state?: string;
	subscribed?: boolean;
	task_completion_status?: {
		completed_count?: number;
		count?: number;
	};
	task_status?: string;
	time_stats?: {
		human_time_estimate?: null;
		human_total_time_spent?: null;
		time_estimate?: number;
		total_time_spent?: number;
	};
	title?: string;
	type?: string;
	updated_at?: string;
	upvotes?: number;
	user_notes_count?: number;
	web_url?: string;
	weight?: null;
};

export type GitlabV1IssueEditOutput = {
	_links?: {
		award_emoji?: string;
		closed_as_duplicate_of?: null;
		notes?: string;
		project?: string;
		self?: string;
	};
	assignees?: Array<{
		avatar_url?: string;
		id?: number;
		locked?: boolean;
		name?: string;
		state?: string;
		username?: string;
		web_url?: string;
	}>;
	author?: {
		avatar_url?: string;
		id?: number;
		locked?: boolean;
		name?: string;
		state?: string;
		username?: string;
		web_url?: string;
	};
	blocking_issues_count?: number;
	confidential?: boolean;
	created_at?: string;
	description?: string;
	downvotes?: number;
	epic?: null;
	epic_iid?: null;
	has_tasks?: boolean;
	id?: number;
	iid?: number;
	issue_type?: string;
	iteration?: null;
	labels?: Array<string>;
	merge_requests_count?: number;
	milestone?: null;
	moved_to_id?: null;
	project_id?: number;
	references?: {
		full?: string;
		relative?: string;
		short?: string;
	};
	service_desk_reply_to?: null;
	severity?: string;
	state?: string;
	subscribed?: boolean;
	task_completion_status?: {
		completed_count?: number;
		count?: number;
	};
	task_status?: string;
	time_stats?: {
		human_time_estimate?: null;
		human_total_time_spent?: null;
		time_estimate?: number;
		total_time_spent?: number;
	};
	title?: string;
	type?: string;
	updated_at?: string;
	upvotes?: number;
	user_notes_count?: number;
	web_url?: string;
	weight?: null;
};

export type GitlabV1IssueGetOutput = {
	_links?: {
		award_emoji?: string;
		closed_as_duplicate_of?: null;
		notes?: string;
		project?: string;
		self?: string;
	};
	assignee?: {
		avatar_url?: string;
		id?: number;
		locked?: boolean;
		name?: string;
		state?: string;
		username?: string;
		web_url?: string;
	};
	assignees?: Array<{
		avatar_url?: string;
		id?: number;
		locked?: boolean;
		name?: string;
		state?: string;
		username?: string;
		web_url?: string;
	}>;
	author?: {
		id?: number;
		locked?: boolean;
		name?: string;
		state?: string;
		username?: string;
		web_url?: string;
	};
	blocking_issues_count?: number;
	confidential?: boolean;
	created_at?: string;
	downvotes?: number;
	epic?: {
		group_id?: number;
		id?: number;
		iid?: number;
		title?: string;
		url?: string;
	};
	has_tasks?: boolean;
	id?: number;
	iid?: number;
	imported?: boolean;
	imported_from?: string;
	issue_type?: string;
	iteration?: {
		created_at?: string;
		description?: string;
		due_date?: string;
		group_id?: number;
		id?: number;
		iid?: number;
		sequence?: number;
		start_date?: string;
		state?: number;
		title?: string;
		updated_at?: string;
		web_url?: string;
	};
	labels?: Array<string>;
	merge_requests_count?: number;
	moved_to_id?: null;
	project_id?: number;
	references?: {
		full?: string;
		relative?: string;
		short?: string;
	};
	service_desk_reply_to?: null;
	severity?: string;
	state?: string;
	subscribed?: boolean;
	task_completion_status?: {
		completed_count?: number;
		count?: number;
	};
	task_status?: string;
	time_stats?: {
		time_estimate?: number;
		total_time_spent?: number;
	};
	title?: string;
	type?: string;
	updated_at?: string;
	upvotes?: number;
	user_notes_count?: number;
	web_url?: string;
};

export type GitlabV1RepositoryGetOutput = {
	_links?: {
		cluster_agents?: string;
		events?: string;
		issues?: string;
		labels?: string;
		members?: string;
		merge_requests?: string;
		repo_branches?: string;
		self?: string;
	};
	allow_pipeline_trigger_approve_deployment?: boolean;
	analytics_access_level?: string;
	approvals_before_merge?: number;
	archived?: boolean;
	auto_cancel_pending_pipelines?: string;
	auto_devops_deploy_strategy?: string;
	auto_devops_enabled?: boolean;
	autoclose_referenced_issues?: boolean;
	build_git_strategy?: string;
	build_timeout?: number;
	builds_access_level?: string;
	can_create_merge_request_in?: boolean;
	ci_allow_fork_pipelines_to_run_in_parent_project?: boolean;
	ci_delete_pipelines_in_seconds?: null;
	ci_forward_deployment_rollback_allowed?: boolean;
	ci_id_token_sub_claim_components?: Array<string>;
	ci_job_token_scope_enabled?: boolean;
	ci_pipeline_variables_minimum_override_role?: string;
	ci_push_repository_for_job_token_allowed?: boolean;
	ci_restrict_pipeline_cancellation_role?: string;
	ci_separated_caches?: boolean;
	container_registry_access_level?: string;
	container_registry_enabled?: boolean;
	container_registry_image_prefix?: string;
	created_at?: string;
	creator_id?: number;
	default_branch?: string;
	description_html?: string;
	emails_enabled?: boolean;
	empty_repo?: boolean;
	enforce_auth_checks_on_uploads?: boolean;
	environments_access_level?: string;
	feature_flags_access_level?: string;
	forking_access_level?: string;
	forks_count?: number;
	group_runners_enabled?: boolean;
	http_url_to_repo?: string;
	id?: number;
	import_error?: null;
	import_status?: string;
	infrastructure_access_level?: string;
	issues_access_level?: string;
	issues_enabled?: boolean;
	jobs_enabled?: boolean;
	keep_latest_artifact?: boolean;
	last_activity_at?: string;
	lfs_enabled?: boolean;
	marked_for_deletion_at?: null;
	marked_for_deletion_on?: null;
	max_artifacts_size?: null;
	merge_method?: string;
	merge_pipelines_enabled?: boolean;
	merge_requests_access_level?: string;
	merge_requests_enabled?: boolean;
	merge_trains_enabled?: boolean;
	merge_trains_skip_train_allowed?: boolean;
	mirror?: boolean;
	model_experiments_access_level?: string;
	model_registry_access_level?: string;
	monitor_access_level?: string;
	name?: string;
	name_with_namespace?: string;
	namespace?: {
		full_path?: string;
		id?: number;
		kind?: string;
		name?: string;
		path?: string;
		web_url?: string;
	};
	only_allow_merge_if_all_discussions_are_resolved?: boolean;
	only_allow_merge_if_pipeline_succeeds?: boolean;
	open_issues_count?: number;
	pages_access_level?: string;
	path?: string;
	path_with_namespace?: string;
	permissions?: {
		group_access?: {
			access_level?: number;
			notification_level?: number;
		};
	};
	printing_merge_request_link_enabled?: boolean;
	public_jobs?: boolean;
	releases_access_level?: string;
	repository_access_level?: string;
	repository_object_format?: string;
	request_access_enabled?: boolean;
	requirements_access_level?: string;
	requirements_enabled?: boolean;
	restrict_user_defined_variables?: boolean;
	runner_token_expiration_interval?: null;
	security_and_compliance_access_level?: string;
	security_and_compliance_enabled?: boolean;
	service_desk_enabled?: boolean;
	shared_runners_enabled?: boolean;
	shared_with_groups?: Array<{
		expires_at?: null;
		group_access_level?: number;
		group_full_path?: string;
		group_id?: number;
		group_name?: string;
	}>;
	snippets_access_level?: string;
	snippets_enabled?: boolean;
	squash_commit_template?: null;
	squash_option?: string;
	ssh_url_to_repo?: string;
	star_count?: number;
	updated_at?: string;
	visibility?: string;
	warn_about_potentially_unwanted_characters?: boolean;
	web_url?: string;
	wiki_access_level?: string;
	wiki_enabled?: boolean;
};

export type GitlabV1RepositoryGetIssuesOutput = {
	_links?: {
		award_emoji?: string;
		closed_as_duplicate_of?: null;
		notes?: string;
		project?: string;
		self?: string;
	};
	assignees?: Array<{
		avatar_url?: string;
		id?: number;
		name?: string;
		state?: string;
		username?: string;
		web_url?: string;
	}>;
	author?: {
		avatar_url?: string;
		id?: number;
		locked?: boolean;
		name?: string;
		state?: string;
		username?: string;
		web_url?: string;
	};
	confidential?: boolean;
	created_at?: string;
	discussion_locked?: null;
	downvotes?: number;
	has_tasks?: boolean;
	id?: number;
	iid?: number;
	imported?: boolean;
	imported_from?: string;
	issue_type?: string;
	labels?: Array<string>;
	merge_requests_count?: number;
	moved_to_id?: null;
	project_id?: number;
	references?: {
		full?: string;
		relative?: string;
		short?: string;
	};
	service_desk_reply_to?: null;
	severity?: string;
	state?: string;
	task_completion_status?: {
		completed_count?: number;
		count?: number;
	};
	task_status?: string;
	time_stats?: {
		human_total_time_spent?: null;
		time_estimate?: number;
		total_time_spent?: number;
	};
	title?: string;
	type?: string;
	updated_at?: string;
	upvotes?: number;
	user_notes_count?: number;
	web_url?: string;
};

export type GitlabV1UserGetRepositoriesOutput = {
	_links?: {
		cluster_agents?: string;
		events?: string;
		issues?: string;
		labels?: string;
		members?: string;
		merge_requests?: string;
		repo_branches?: string;
		self?: string;
	};
	allow_merge_on_skipped_pipeline?: null;
	analytics_access_level?: string;
	archived?: boolean;
	auto_cancel_pending_pipelines?: string;
	auto_devops_deploy_strategy?: string;
	auto_devops_enabled?: boolean;
	autoclose_referenced_issues?: boolean;
	avatar_url?: null;
	build_git_strategy?: string;
	build_timeout?: number;
	builds_access_level?: string;
	can_create_merge_request_in?: boolean;
	ci_allow_fork_pipelines_to_run_in_parent_project?: boolean;
	ci_default_git_depth?: number;
	ci_delete_pipelines_in_seconds?: null;
	ci_forward_deployment_enabled?: boolean;
	ci_forward_deployment_rollback_allowed?: boolean;
	ci_id_token_sub_claim_components?: Array<string>;
	ci_job_token_scope_enabled?: boolean;
	ci_pipeline_variables_minimum_override_role?: string;
	ci_push_repository_for_job_token_allowed?: boolean;
	ci_separated_caches?: boolean;
	container_expiration_policy?: {
		cadence?: string;
		enabled?: boolean;
		keep_n?: number;
		name_regex?: string;
		name_regex_keep?: null;
		next_run_at?: string;
		older_than?: string;
	};
	container_registry_access_level?: string;
	container_registry_enabled?: boolean;
	container_registry_image_prefix?: string;
	created_at?: string;
	creator_id?: number;
	default_branch?: string;
	description_html?: string;
	emails_enabled?: boolean;
	empty_repo?: boolean;
	enforce_auth_checks_on_uploads?: boolean;
	environments_access_level?: string;
	external_authorization_classification_label?: string;
	feature_flags_access_level?: string;
	forking_access_level?: string;
	forks_count?: number;
	group_runners_enabled?: boolean;
	http_url_to_repo?: string;
	id?: number;
	import_status?: string;
	infrastructure_access_level?: string;
	issue_branch_template?: null;
	issues_access_level?: string;
	issues_enabled?: boolean;
	jobs_enabled?: boolean;
	keep_latest_artifact?: boolean;
	last_activity_at?: string;
	lfs_enabled?: boolean;
	max_artifacts_size?: null;
	merge_commit_template?: null;
	merge_method?: string;
	merge_requests_access_level?: string;
	merge_requests_enabled?: boolean;
	model_experiments_access_level?: string;
	model_registry_access_level?: string;
	monitor_access_level?: string;
	name?: string;
	name_with_namespace?: string;
	namespace?: {
		avatar_url?: string;
		full_path?: string;
		id?: number;
		kind?: string;
		name?: string;
		parent_id?: null;
		path?: string;
		web_url?: string;
	};
	only_allow_merge_if_all_discussions_are_resolved?: boolean;
	only_allow_merge_if_pipeline_succeeds?: boolean;
	open_issues_count?: number;
	owner?: {
		avatar_url?: string;
		id?: number;
		locked?: boolean;
		name?: string;
		state?: string;
		username?: string;
		web_url?: string;
	};
	packages_enabled?: boolean;
	pages_access_level?: string;
	path?: string;
	path_with_namespace?: string;
	permissions?: {
		group_access?: null;
		project_access?: {
			access_level?: number;
			notification_level?: number;
		};
	};
	printing_merge_request_link_enabled?: boolean;
	public_jobs?: boolean;
	releases_access_level?: string;
	remove_source_branch_after_merge?: boolean;
	repository_access_level?: string;
	repository_object_format?: string;
	request_access_enabled?: boolean;
	requirements_access_level?: string;
	requirements_enabled?: boolean;
	resolve_outdated_diff_discussions?: boolean;
	restrict_user_defined_variables?: boolean;
	runner_token_expiration_interval?: null;
	runners_token?: string;
	security_and_compliance_access_level?: string;
	security_and_compliance_enabled?: boolean;
	service_desk_enabled?: boolean;
	shared_runners_enabled?: boolean;
	snippets_access_level?: string;
	snippets_enabled?: boolean;
	squash_commit_template?: null;
	squash_option?: string;
	ssh_url_to_repo?: string;
	star_count?: number;
	suggestion_commit_message?: null;
	updated_at?: string;
	visibility?: string;
	warn_about_potentially_unwanted_characters?: boolean;
	web_url?: string;
	wiki_access_level?: string;
	wiki_enabled?: boolean;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface GitlabV1Credentials {
	gitlabApi: CredentialReference;
	gitlabOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GitlabV1NodeBase {
	type: 'n8n-nodes-base.gitlab';
	version: 1;
	credentials?: GitlabV1Credentials;
}

export type GitlabV1FileCreateNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1FileCreateConfig>;
	output?: GitlabV1FileCreateOutput;
};

export type GitlabV1FileDeleteNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1FileDeleteConfig>;
};

export type GitlabV1FileEditNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1FileEditConfig>;
};

export type GitlabV1FileGetNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1FileGetConfig>;
	output?: GitlabV1FileGetOutput;
};

export type GitlabV1FileListNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1FileListConfig>;
	output?: GitlabV1FileListOutput;
};

export type GitlabV1IssueCreateNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1IssueCreateConfig>;
	output?: GitlabV1IssueCreateOutput;
};

export type GitlabV1IssueCreateCommentNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1IssueCreateCommentConfig>;
};

export type GitlabV1IssueEditNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1IssueEditConfig>;
	output?: GitlabV1IssueEditOutput;
};

export type GitlabV1IssueGetNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1IssueGetConfig>;
	output?: GitlabV1IssueGetOutput;
};

export type GitlabV1IssueLockNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1IssueLockConfig>;
};

export type GitlabV1ReleaseCreateNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1ReleaseCreateConfig>;
};

export type GitlabV1ReleaseDeleteNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1ReleaseDeleteConfig>;
};

export type GitlabV1ReleaseGetNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1ReleaseGetConfig>;
};

export type GitlabV1ReleaseGetAllNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1ReleaseGetAllConfig>;
};

export type GitlabV1ReleaseUpdateNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1ReleaseUpdateConfig>;
};

export type GitlabV1RepositoryGetNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1RepositoryGetConfig>;
	output?: GitlabV1RepositoryGetOutput;
};

export type GitlabV1RepositoryGetIssuesNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1RepositoryGetIssuesConfig>;
	output?: GitlabV1RepositoryGetIssuesOutput;
};

export type GitlabV1UserGetRepositoriesNode = GitlabV1NodeBase & {
	config: NodeConfig<GitlabV1UserGetRepositoriesConfig>;
	output?: GitlabV1UserGetRepositoriesOutput;
};

export type GitlabV1Node =
	| GitlabV1FileCreateNode
	| GitlabV1FileDeleteNode
	| GitlabV1FileEditNode
	| GitlabV1FileGetNode
	| GitlabV1FileListNode
	| GitlabV1IssueCreateNode
	| GitlabV1IssueCreateCommentNode
	| GitlabV1IssueEditNode
	| GitlabV1IssueGetNode
	| GitlabV1IssueLockNode
	| GitlabV1ReleaseCreateNode
	| GitlabV1ReleaseDeleteNode
	| GitlabV1ReleaseGetNode
	| GitlabV1ReleaseGetAllNode
	| GitlabV1ReleaseUpdateNode
	| GitlabV1RepositoryGetNode
	| GitlabV1RepositoryGetIssuesNode
	| GitlabV1UserGetRepositoriesNode
	;