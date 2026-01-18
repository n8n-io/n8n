/**
 * Jira Software Node - Version 1
 * Consume Jira Software API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Creates an issue or, where the option to create subtasks is enabled in Jira, a subtask */
export type JiraV1IssueChangelogConfig = {
	resource: 'issue';
	operation: 'changelog';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
	issueKey: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["issue"], operation: ["changelog"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["issue"], operation: ["changelog"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Creates an issue or, where the option to create subtasks is enabled in Jira, a subtask */
export type JiraV1IssueCreateConfig = {
	resource: 'issue';
	operation: 'create';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
	project: ResourceLocatorValue;
	issueType: ResourceLocatorValue;
	summary: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Creates an issue or, where the option to create subtasks is enabled in Jira, a subtask */
export type JiraV1IssueDeleteConfig = {
	resource: 'issue';
	operation: 'delete';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
	issueKey: string | Expression<string>;
	deleteSubtasks: boolean | Expression<boolean>;
};

/** Creates an issue or, where the option to create subtasks is enabled in Jira, a subtask */
export type JiraV1IssueGetConfig = {
	resource: 'issue';
	operation: 'get';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
	issueKey: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["issue"], operation: ["get"] }
 * @default false
 */
		simplifyOutput?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Creates an issue or, where the option to create subtasks is enabled in Jira, a subtask */
export type JiraV1IssueGetAllConfig = {
	resource: 'issue';
	operation: 'getAll';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Creates an issue or, where the option to create subtasks is enabled in Jira, a subtask */
export type JiraV1IssueNotifyConfig = {
	resource: 'issue';
	operation: 'notify';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
	issueKey: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
/**
 * The recipients of the email notification for the issue
 * @displayOptions.show { resource: ["issue"], operation: ["notify"], jsonParameters: [false] }
 * @default {}
 */
		notificationRecipientsUi?: {
		notificationRecipientsValues?: {
			/** Whether the notification should be sent to the issue's reporter
			 * @default false
			 */
			reporter?: boolean | Expression<boolean>;
			/** Whether the notification should be sent to the issue's assignees
			 * @default false
			 */
			assignee?: boolean | Expression<boolean>;
			/** Whether the notification should be sent to the issue's assignees
			 * @default false
			 */
			watchers?: boolean | Expression<boolean>;
			/** Whether the notification should be sent to the issue's voters
			 * @default false
			 */
			voters?: boolean | Expression<boolean>;
			/** List of users to receive the notification. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @default []
			 */
			users?: string[];
			/** List of groups to receive the notification. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @default []
			 */
			groups?: string[];
		};
	};
/**
 * The recipients of the email notification for the issue
 * @displayOptions.show { resource: ["issue"], operation: ["notify"], jsonParameters: [true] }
 */
		notificationRecipientsJson?: IDataObject | string | Expression<string>;
/**
 * Restricts the notifications to users with the specified permissions
 * @displayOptions.show { resource: ["issue"], operation: ["notify"], jsonParameters: [false] }
 * @default {}
 */
		notificationRecipientsRestrictionsUi?: {
		notificationRecipientsRestrictionsValues?: {
			/** List of users to receive the notification. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @default []
			 */
			users?: string[];
			/** List of groups to receive the notification. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @default []
			 */
			groups?: string[];
		};
	};
/**
 * Restricts the notifications to users with the specified permissions
 * @displayOptions.show { resource: ["issue"], operation: ["notify"], jsonParameters: [true] }
 */
		notificationRecipientsRestrictionsJson?: IDataObject | string | Expression<string>;
};

/** Creates an issue or, where the option to create subtasks is enabled in Jira, a subtask */
export type JiraV1IssueTransitionsConfig = {
	resource: 'issue';
	operation: 'transitions';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
	issueKey: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Creates an issue or, where the option to create subtasks is enabled in Jira, a subtask */
export type JiraV1IssueUpdateConfig = {
	resource: 'issue';
	operation: 'update';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
	issueKey: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Add, remove, and get an attachment from an issue */
export type JiraV1IssueAttachmentAddConfig = {
	resource: 'issueAttachment';
	operation: 'add';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
	issueKey: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Add, remove, and get an attachment from an issue */
export type JiraV1IssueAttachmentGetConfig = {
	resource: 'issueAttachment';
	operation: 'get';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
/**
 * The ID of the attachment
 * @displayOptions.show { resource: ["issueAttachment"], operation: ["get"] }
 */
		attachmentId: string | Expression<string>;
	download: boolean | Expression<boolean>;
	binaryProperty: string | Expression<string>;
};

/** Add, remove, and get an attachment from an issue */
export type JiraV1IssueAttachmentGetAllConfig = {
	resource: 'issueAttachment';
	operation: 'getAll';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
	issueKey: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["issueAttachment"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["issueAttachment"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	download: boolean | Expression<boolean>;
	binaryProperty: string | Expression<string>;
};

/** Add, remove, and get an attachment from an issue */
export type JiraV1IssueAttachmentRemoveConfig = {
	resource: 'issueAttachment';
	operation: 'remove';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
/**
 * The ID of the attachment
 * @displayOptions.show { resource: ["issueAttachment"], operation: ["remove"] }
 */
		attachmentId: string | Expression<string>;
};

/** Get, create, update, and delete a comment from an issue */
export type JiraV1IssueCommentAddConfig = {
	resource: 'issueComment';
	operation: 'add';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
/**
 * issueComment Key
 * @displayOptions.show { resource: ["issueComment"], operation: ["add"] }
 */
		issueKey: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Comment's text
 * @displayOptions.show { resource: ["issueComment"], operation: ["add"], jsonParameters: [false] }
 */
		comment?: string | Expression<string>;
/**
 * The Atlassian Document Format (ADF). Online builder can be found &lt;a href="https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/"&gt;here&lt;/a&gt;.
 * @displayOptions.show { resource: ["issueComment"], operation: ["add"], jsonParameters: [true] }
 */
		commentJson?: IDataObject | string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get, create, update, and delete a comment from an issue */
export type JiraV1IssueCommentGetConfig = {
	resource: 'issueComment';
	operation: 'get';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
/**
 * The ID or key of the issue
 * @displayOptions.show { resource: ["issueComment"], operation: ["get"] }
 */
		issueKey: string | Expression<string>;
/**
 * The ID of the comment
 * @displayOptions.show { resource: ["issueComment"], operation: ["get"] }
 */
		commentId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get, create, update, and delete a comment from an issue */
export type JiraV1IssueCommentGetAllConfig = {
	resource: 'issueComment';
	operation: 'getAll';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
/**
 * The ID or key of the issue
 * @displayOptions.show { resource: ["issueComment"], operation: ["getAll"] }
 */
		issueKey: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["issueComment"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["issueComment"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Get, create, update, and delete a comment from an issue */
export type JiraV1IssueCommentRemoveConfig = {
	resource: 'issueComment';
	operation: 'remove';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
/**
 * The ID or key of the issue
 * @displayOptions.show { resource: ["issueComment"], operation: ["remove"] }
 */
		issueKey: string | Expression<string>;
/**
 * The ID of the comment
 * @displayOptions.show { resource: ["issueComment"], operation: ["remove"] }
 */
		commentId: string | Expression<string>;
};

/** Get, create, update, and delete a comment from an issue */
export type JiraV1IssueCommentUpdateConfig = {
	resource: 'issueComment';
	operation: 'update';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
/**
 * The Issue Comment key
 * @displayOptions.show { resource: ["issueComment"], operation: ["update"] }
 */
		issueKey: string | Expression<string>;
/**
 * The ID of the comment
 * @displayOptions.show { resource: ["issueComment"], operation: ["update"] }
 */
		commentId: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Comment's text
 * @displayOptions.show { resource: ["issueComment"], operation: ["update"], jsonParameters: [false] }
 */
		comment?: string | Expression<string>;
/**
 * The Atlassian Document Format (ADF). Online builder can be found &lt;a href="https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/"&gt;here&lt;/a&gt;.
 * @displayOptions.show { resource: ["issueComment"], operation: ["update"], jsonParameters: [true] }
 */
		commentJson?: IDataObject | string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get, create and delete a user */
export type JiraV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
	username: string | Expression<string>;
	emailAddress: string | Expression<string>;
	displayName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get, create and delete a user */
export type JiraV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
/**
 * Account ID of the user to delete
 * @displayOptions.show { resource: ["user"], operation: ["delete"] }
 */
		accountId?: string | Expression<string>;
};

/** Get, create and delete a user */
export type JiraV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	jiraVersion?: 'cloud' | 'server' | 'serverPat' | Expression<string>;
/**
 * Account ID of the user to retrieve
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 */
		accountId?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type JiraV1Params =
	| JiraV1IssueChangelogConfig
	| JiraV1IssueCreateConfig
	| JiraV1IssueDeleteConfig
	| JiraV1IssueGetConfig
	| JiraV1IssueGetAllConfig
	| JiraV1IssueNotifyConfig
	| JiraV1IssueTransitionsConfig
	| JiraV1IssueUpdateConfig
	| JiraV1IssueAttachmentAddConfig
	| JiraV1IssueAttachmentGetConfig
	| JiraV1IssueAttachmentGetAllConfig
	| JiraV1IssueAttachmentRemoveConfig
	| JiraV1IssueCommentAddConfig
	| JiraV1IssueCommentGetConfig
	| JiraV1IssueCommentGetAllConfig
	| JiraV1IssueCommentRemoveConfig
	| JiraV1IssueCommentUpdateConfig
	| JiraV1UserCreateConfig
	| JiraV1UserDeleteConfig
	| JiraV1UserGetConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface JiraV1Credentials {
	jiraSoftwareCloudApi: CredentialReference;
	jiraSoftwareServerApi: CredentialReference;
	jiraSoftwareServerPatApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type JiraV1Node = {
	type: 'n8n-nodes-base.jira';
	version: 1;
	config: NodeConfig<JiraV1Params>;
	credentials?: JiraV1Credentials;
};