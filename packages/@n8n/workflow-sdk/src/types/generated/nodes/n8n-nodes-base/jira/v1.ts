/**
 * Jira Software Node - Version 1
 * Consume Jira Software API
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
// Output Types
// ===========================================================================

export type JiraV1IssueChangelogOutput = {
	author?: {
		accountId?: string;
		accountType?: string;
		active?: boolean;
		avatarUrls?: {
			'16x16'?: string;
			'24x24'?: string;
			'32x32'?: string;
			'48x48'?: string;
		};
		displayName?: string;
		emailAddress?: string;
		self?: string;
		timeZone?: string;
	};
	created?: string;
	id?: string;
	items?: Array<{
		field?: string;
		fieldId?: string;
		fieldtype?: string;
	}>;
};

export type JiraV1IssueCreateOutput = {
	id?: string;
	key?: string;
	self?: string;
};

export type JiraV1IssueDeleteOutput = {
	success?: boolean;
};

export type JiraV1IssueGetOutput = {
	expand?: string;
	fields?: {
		attachment?: Array<{
			author?: {
				accountId?: string;
				accountType?: string;
				active?: boolean;
				avatarUrls?: {
					'16x16'?: string;
					'24x24'?: string;
					'32x32'?: string;
					'48x48'?: string;
				};
				displayName?: string;
				emailAddress?: string;
				self?: string;
				timeZone?: string;
			};
			content?: string;
			created?: string;
			filename?: string;
			id?: string;
			mimeType?: string;
			self?: string;
			size?: number;
			thumbnail?: string;
		}>;
		comment?: {
			comments?: Array<{
				author?: {
					accountId?: string;
					accountType?: string;
					active?: boolean;
					avatarUrls?: {
						'16x16'?: string;
						'24x24'?: string;
						'32x32'?: string;
						'48x48'?: string;
					};
					displayName?: string;
					emailAddress?: string;
					self?: string;
					timeZone?: string;
				};
				body?: string;
				created?: string;
				id?: string;
				jsdPublic?: boolean;
				self?: string;
				updateAuthor?: {
					accountId?: string;
					accountType?: string;
					active?: boolean;
					avatarUrls?: {
						'16x16'?: string;
						'24x24'?: string;
						'32x32'?: string;
						'48x48'?: string;
					};
					displayName?: string;
					emailAddress?: string;
					self?: string;
					timeZone?: string;
				};
				updated?: string;
			}>;
			maxResults?: number;
			self?: string;
			startAt?: number;
			total?: number;
		};
		created?: string;
		creator?: {
			accountId?: string;
			accountType?: string;
			active?: boolean;
			avatarUrls?: {
				'16x16'?: string;
				'24x24'?: string;
				'32x32'?: string;
				'48x48'?: string;
			};
			displayName?: string;
			emailAddress?: string;
			self?: string;
			timeZone?: string;
		};
		issuetype?: {
			avatarId?: number;
			description?: string;
			entityId?: string;
			hierarchyLevel?: number;
			iconUrl?: string;
			id?: string;
			name?: string;
			self?: string;
			subtask?: boolean;
		};
		labels?: Array<string>;
		reporter?: {
			accountId?: string;
			accountType?: string;
			active?: boolean;
			avatarUrls?: {
				'16x16'?: string;
				'24x24'?: string;
				'32x32'?: string;
				'48x48'?: string;
			};
			displayName?: string;
			emailAddress?: string;
			self?: string;
			timeZone?: string;
		};
		status?: {
			description?: string;
			iconUrl?: string;
			id?: string;
			name?: string;
			self?: string;
			statusCategory?: {
				colorName?: string;
				id?: number;
				key?: string;
				name?: string;
				self?: string;
			};
		};
		subtasks?: Array<{
			fields?: {
				issuetype?: {
					avatarId?: number;
					description?: string;
					entityId?: string;
					hierarchyLevel?: number;
					iconUrl?: string;
					id?: string;
					name?: string;
					self?: string;
					subtask?: boolean;
				};
				priority?: {
					iconUrl?: string;
					id?: string;
					name?: string;
					self?: string;
				};
				status?: {
					description?: string;
					iconUrl?: string;
					id?: string;
					name?: string;
					self?: string;
					statusCategory?: {
						colorName?: string;
						id?: number;
						key?: string;
						name?: string;
						self?: string;
					};
				};
				summary?: string;
			};
			id?: string;
			key?: string;
			self?: string;
		}>;
		summary?: string;
		updated?: string;
	};
	id?: string;
	key?: string;
	self?: string;
};

export type JiraV1IssueGetAllOutput = {
	expand?: string;
	fields?: {
		aggregateprogress?: {
			progress?: number;
			total?: number;
		};
		components?: Array<{
			description?: string;
			id?: string;
			name?: string;
			self?: string;
		}>;
		created?: string;
		creator?: {
			accountId?: string;
			accountType?: string;
			active?: boolean;
			avatarUrls?: {
				'16x16'?: string;
				'24x24'?: string;
				'32x32'?: string;
				'48x48'?: string;
			};
			displayName?: string;
			emailAddress?: string;
			self?: string;
			timeZone?: string;
		};
		customfield_10001?: null;
		customfield_10019?: string;
		customfield_10021?: null;
		fixVersions?: Array<{
			archived?: boolean;
			description?: string;
			id?: string;
			name?: string;
			released?: boolean;
			releaseDate?: string;
			self?: string;
		}>;
		issuelinks?: Array<{
			id?: string;
			inwardIssue?: {
				fields?: {
					issuetype?: {
						avatarId?: number;
						description?: string;
						entityId?: string;
						hierarchyLevel?: number;
						iconUrl?: string;
						id?: string;
						name?: string;
						self?: string;
						subtask?: boolean;
					};
					priority?: {
						iconUrl?: string;
						id?: string;
						name?: string;
						self?: string;
					};
					status?: {
						description?: string;
						iconUrl?: string;
						id?: string;
						name?: string;
						self?: string;
						statusCategory?: {
							colorName?: string;
							id?: number;
							key?: string;
							name?: string;
							self?: string;
						};
					};
					summary?: string;
				};
				id?: string;
				key?: string;
				self?: string;
			};
			self?: string;
			type?: {
				id?: string;
				inward?: string;
				name?: string;
				outward?: string;
				self?: string;
			};
		}>;
		issuetype?: {
			avatarId?: number;
			description?: string;
			entityId?: string;
			hierarchyLevel?: number;
			iconUrl?: string;
			id?: string;
			name?: string;
			self?: string;
			subtask?: boolean;
		};
		labels?: Array<string>;
		priority?: {
			iconUrl?: string;
			id?: string;
			name?: string;
			self?: string;
		};
		progress?: {
			progress?: number;
			total?: number;
		};
		project?: {
			avatarUrls?: {
				'16x16'?: string;
				'24x24'?: string;
				'32x32'?: string;
				'48x48'?: string;
			};
			id?: string;
			key?: string;
			name?: string;
			projectTypeKey?: string;
			self?: string;
			simplified?: boolean;
		};
		reporter?: {
			accountId?: string;
			accountType?: string;
			active?: boolean;
			avatarUrls?: {
				'16x16'?: string;
				'24x24'?: string;
				'32x32'?: string;
				'48x48'?: string;
			};
			displayName?: string;
			emailAddress?: string;
			self?: string;
			timeZone?: string;
		};
		security?: null;
		status?: {
			description?: string;
			iconUrl?: string;
			id?: string;
			name?: string;
			self?: string;
			statusCategory?: {
				colorName?: string;
				id?: number;
				key?: string;
				name?: string;
				self?: string;
			};
		};
		statusCategory?: {
			colorName?: string;
			id?: number;
			key?: string;
			name?: string;
			self?: string;
		};
		statuscategorychangedate?: string;
		subtasks?: Array<{
			fields?: {
				issuetype?: {
					avatarId?: number;
					description?: string;
					entityId?: string;
					hierarchyLevel?: number;
					iconUrl?: string;
					id?: string;
					name?: string;
					self?: string;
					subtask?: boolean;
				};
				priority?: {
					iconUrl?: string;
					id?: string;
					name?: string;
					self?: string;
				};
				status?: {
					description?: string;
					iconUrl?: string;
					id?: string;
					name?: string;
					self?: string;
					statusCategory?: {
						colorName?: string;
						id?: number;
						key?: string;
						name?: string;
						self?: string;
					};
				};
				summary?: string;
			};
			id?: string;
			key?: string;
			self?: string;
		}>;
		summary?: string;
		updated?: string;
		votes?: {
			hasVoted?: boolean;
			self?: string;
			votes?: number;
		};
		watches?: {
			isWatching?: boolean;
			self?: string;
			watchCount?: number;
		};
		workratio?: number;
	};
	id?: string;
	key?: string;
	self?: string;
};

export type JiraV1IssueTransitionsOutput = {
	hasScreen?: boolean;
	id?: string;
	isAvailable?: boolean;
	isConditional?: boolean;
	isGlobal?: boolean;
	isInitial?: boolean;
	isLooped?: boolean;
	name?: string;
	to?: {
		description?: string;
		iconUrl?: string;
		id?: string;
		name?: string;
		self?: string;
		statusCategory?: {
			colorName?: string;
			id?: number;
			key?: string;
			name?: string;
			self?: string;
		};
	};
};

export type JiraV1IssueUpdateOutput = {
	success?: boolean;
};

export type JiraV1IssueAttachmentAddOutput = {
	author?: {
		accountId?: string;
		accountType?: string;
		active?: boolean;
		avatarUrls?: {
			'16x16'?: string;
			'24x24'?: string;
			'32x32'?: string;
			'48x48'?: string;
		};
		displayName?: string;
		emailAddress?: string;
		self?: string;
		timeZone?: string;
	};
	content?: string;
	created?: string;
	filename?: string;
	id?: string;
	mimeType?: string;
	self?: string;
	size?: number;
};

export type JiraV1IssueAttachmentGetOutput = {
	author?: {
		accountId?: string;
		active?: boolean;
		avatarUrls?: {
			'16x16'?: string;
			'24x24'?: string;
			'32x32'?: string;
			'48x48'?: string;
		};
		displayName?: string;
		self?: string;
	};
	content?: string;
	created?: string;
	filename?: string;
	id?: number;
	mimeType?: string;
	self?: string;
	size?: number;
};

export type JiraV1IssueAttachmentGetAllOutput = {
	author?: {
		accountId?: string;
		accountType?: string;
		active?: boolean;
		avatarUrls?: {
			'16x16'?: string;
			'24x24'?: string;
			'32x32'?: string;
			'48x48'?: string;
		};
		displayName?: string;
		emailAddress?: string;
		self?: string;
		timeZone?: string;
	};
	content?: string;
	created?: string;
	filename?: string;
	id?: string;
	mimeType?: string;
	self?: string;
	size?: number;
	thumbnail?: string;
};

export type JiraV1IssueCommentAddOutput = {
	author?: {
		accountId?: string;
		accountType?: string;
		active?: boolean;
		avatarUrls?: {
			'16x16'?: string;
			'24x24'?: string;
			'32x32'?: string;
			'48x48'?: string;
		};
		displayName?: string;
		emailAddress?: string;
		self?: string;
		timeZone?: string;
	};
	body?: {
		content?: Array<{
			content?: Array<{
				text?: string;
				type?: string;
			}>;
			type?: string;
		}>;
		type?: string;
		version?: number;
	};
	created?: string;
	id?: string;
	jsdPublic?: boolean;
	self?: string;
	updateAuthor?: {
		accountId?: string;
		accountType?: string;
		active?: boolean;
		avatarUrls?: {
			'16x16'?: string;
			'24x24'?: string;
			'32x32'?: string;
			'48x48'?: string;
		};
		displayName?: string;
		emailAddress?: string;
		self?: string;
		timeZone?: string;
	};
	updated?: string;
};

export type JiraV1IssueCommentGetAllOutput = {
	author?: {
		accountId?: string;
		accountType?: string;
		active?: boolean;
		avatarUrls?: {
			'16x16'?: string;
			'24x24'?: string;
			'32x32'?: string;
			'48x48'?: string;
		};
		displayName?: string;
		emailAddress?: string;
		self?: string;
		timeZone?: string;
	};
	body?: {
		content?: Array<{
			content?: Array<{
				attrs?: {
					accessLevel?: string;
					id?: string;
					localId?: string;
					text?: string;
				};
				text?: string;
				type?: string;
			}>;
			type?: string;
		}>;
		type?: string;
		version?: number;
	};
	created?: string;
	id?: string;
	jsdPublic?: boolean;
	self?: string;
	updateAuthor?: {
		accountId?: string;
		accountType?: string;
		active?: boolean;
		avatarUrls?: {
			'16x16'?: string;
			'24x24'?: string;
			'32x32'?: string;
			'48x48'?: string;
		};
		displayName?: string;
		emailAddress?: string;
		self?: string;
		timeZone?: string;
	};
	updated?: string;
};

export type JiraV1UserGetOutput = {
	accountId?: string;
	accountType?: string;
	active?: boolean;
	applicationRoles?: {
		items?: Array<{
			key?: string;
			name?: string;
		}>;
		size?: number;
	};
	avatarUrls?: {
		'16x16'?: string;
		'24x24'?: string;
		'32x32'?: string;
		'48x48'?: string;
	};
	displayName?: string;
	emailAddress?: string;
	expand?: string;
	groups?: {
		items?: Array<{
			groupId?: string;
			name?: string;
			self?: string;
		}>;
		size?: number;
	};
	locale?: string;
	self?: string;
	timeZone?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface JiraV1Credentials {
	jiraSoftwareCloudApi: CredentialReference;
	jiraSoftwareServerApi: CredentialReference;
	jiraSoftwareServerPatApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface JiraV1NodeBase {
	type: 'n8n-nodes-base.jira';
	version: 1;
	credentials?: JiraV1Credentials;
}

export type JiraV1IssueChangelogNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueChangelogConfig>;
	output?: JiraV1IssueChangelogOutput;
};

export type JiraV1IssueCreateNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueCreateConfig>;
	output?: JiraV1IssueCreateOutput;
};

export type JiraV1IssueDeleteNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueDeleteConfig>;
	output?: JiraV1IssueDeleteOutput;
};

export type JiraV1IssueGetNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueGetConfig>;
	output?: JiraV1IssueGetOutput;
};

export type JiraV1IssueGetAllNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueGetAllConfig>;
	output?: JiraV1IssueGetAllOutput;
};

export type JiraV1IssueNotifyNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueNotifyConfig>;
};

export type JiraV1IssueTransitionsNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueTransitionsConfig>;
	output?: JiraV1IssueTransitionsOutput;
};

export type JiraV1IssueUpdateNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueUpdateConfig>;
	output?: JiraV1IssueUpdateOutput;
};

export type JiraV1IssueAttachmentAddNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueAttachmentAddConfig>;
	output?: JiraV1IssueAttachmentAddOutput;
};

export type JiraV1IssueAttachmentGetNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueAttachmentGetConfig>;
	output?: JiraV1IssueAttachmentGetOutput;
};

export type JiraV1IssueAttachmentGetAllNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueAttachmentGetAllConfig>;
	output?: JiraV1IssueAttachmentGetAllOutput;
};

export type JiraV1IssueAttachmentRemoveNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueAttachmentRemoveConfig>;
};

export type JiraV1IssueCommentAddNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueCommentAddConfig>;
	output?: JiraV1IssueCommentAddOutput;
};

export type JiraV1IssueCommentGetNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueCommentGetConfig>;
};

export type JiraV1IssueCommentGetAllNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueCommentGetAllConfig>;
	output?: JiraV1IssueCommentGetAllOutput;
};

export type JiraV1IssueCommentRemoveNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueCommentRemoveConfig>;
};

export type JiraV1IssueCommentUpdateNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1IssueCommentUpdateConfig>;
};

export type JiraV1UserCreateNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1UserCreateConfig>;
};

export type JiraV1UserDeleteNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1UserDeleteConfig>;
};

export type JiraV1UserGetNode = JiraV1NodeBase & {
	config: NodeConfig<JiraV1UserGetConfig>;
	output?: JiraV1UserGetOutput;
};

export type JiraV1Node =
	| JiraV1IssueChangelogNode
	| JiraV1IssueCreateNode
	| JiraV1IssueDeleteNode
	| JiraV1IssueGetNode
	| JiraV1IssueGetAllNode
	| JiraV1IssueNotifyNode
	| JiraV1IssueTransitionsNode
	| JiraV1IssueUpdateNode
	| JiraV1IssueAttachmentAddNode
	| JiraV1IssueAttachmentGetNode
	| JiraV1IssueAttachmentGetAllNode
	| JiraV1IssueAttachmentRemoveNode
	| JiraV1IssueCommentAddNode
	| JiraV1IssueCommentGetNode
	| JiraV1IssueCommentGetAllNode
	| JiraV1IssueCommentRemoveNode
	| JiraV1IssueCommentUpdateNode
	| JiraV1UserCreateNode
	| JiraV1UserDeleteNode
	| JiraV1UserGetNode
	;