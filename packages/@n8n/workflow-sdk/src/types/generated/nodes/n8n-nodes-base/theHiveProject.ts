/**
 * TheHive 5 Node Types
 *
 * Consume TheHive 5 API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/thehiveproject/
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

export type TheHiveProjectV1AlertCreateConfig = {
	resource: 'alert';
	operation: 'create';
	alertFields: unknown;
	observableUi?: Record<string, unknown>;
};

export type TheHiveProjectV1AlertDeleteAlertConfig = {
	resource: 'alert';
	operation: 'deleteAlert';
	alertId: ResourceLocatorValue;
};

export type TheHiveProjectV1AlertExecuteResponderConfig = {
	resource: 'alert';
	operation: 'executeResponder';
	id: ResourceLocatorValue;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	responder: string | Expression<string>;
};

export type TheHiveProjectV1AlertGetConfig = {
	resource: 'alert';
	operation: 'get';
	alertId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

export type TheHiveProjectV1AlertMergeConfig = {
	resource: 'alert';
	operation: 'merge';
	alertId: ResourceLocatorValue;
	caseId: ResourceLocatorValue;
};

export type TheHiveProjectV1AlertPromoteConfig = {
	resource: 'alert';
	operation: 'promote';
	alertId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

export type TheHiveProjectV1AlertSearchConfig = {
	resource: 'alert';
	operation: 'search';
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
	filters?: Record<string, unknown>;
	sort?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type TheHiveProjectV1AlertUpdateConfig = {
	resource: 'alert';
	operation: 'update';
	alertUpdateFields: unknown;
};

export type TheHiveProjectV1AlertStatusConfig = {
	resource: 'alert';
	operation: 'status';
	alertId: ResourceLocatorValue;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	status: string | Expression<string>;
};

export type TheHiveProjectV1CaseAddAttachmentConfig = {
	resource: 'case';
	operation: 'addAttachment';
	caseId: ResourceLocatorValue;
	/**
	 * Array of supported attachments to add to the message
	 * @default {}
	 */
	attachmentsUi?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type TheHiveProjectV1CaseCreateConfig = {
	resource: 'case';
	operation: 'create';
	caseFields: unknown;
};

export type TheHiveProjectV1CaseDeleteAttachmentConfig = {
	resource: 'case';
	operation: 'deleteAttachment';
	caseId: ResourceLocatorValue;
	/**
	 * ID of the attachment. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	attachmentId: string | Expression<string>;
};

export type TheHiveProjectV1CaseDeleteCaseConfig = {
	resource: 'case';
	operation: 'deleteCase';
	caseId: ResourceLocatorValue;
};

export type TheHiveProjectV1CaseExecuteResponderConfig = {
	resource: 'case';
	operation: 'executeResponder';
	id: ResourceLocatorValue;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	responder: string | Expression<string>;
};

export type TheHiveProjectV1CaseGetConfig = {
	resource: 'case';
	operation: 'get';
	caseId: ResourceLocatorValue;
};

export type TheHiveProjectV1CaseGetAttachmentConfig = {
	resource: 'case';
	operation: 'getAttachment';
	caseId: ResourceLocatorValue;
	/**
	 * ID of the attachment. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	attachmentId: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type TheHiveProjectV1CaseGetTimelineConfig = {
	resource: 'case';
	operation: 'getTimeline';
	caseId: ResourceLocatorValue;
};

export type TheHiveProjectV1CaseSearchConfig = {
	resource: 'case';
	operation: 'search';
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
	filters?: Record<string, unknown>;
	sort?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type TheHiveProjectV1CaseUpdateConfig = {
	resource: 'case';
	operation: 'update';
	caseUpdateFields: unknown;
};

export type TheHiveProjectV1CommentAddConfig = {
	resource: 'comment';
	operation: 'add';
	addTo?: 'alert' | 'case' | Expression<string>;
	id: ResourceLocatorValue;
	message: string | Expression<string>;
};

export type TheHiveProjectV1CommentDeleteCommentConfig = {
	resource: 'comment';
	operation: 'deleteComment';
	commentId: ResourceLocatorValue;
};

export type TheHiveProjectV1CommentSearchConfig = {
	resource: 'comment';
	operation: 'search';
	/**
	 * Whether to search for comments in all alerts and cases or in a specific case or alert
	 * @default all
	 */
	searchIn?: 'all' | 'alert' | 'case' | Expression<string>;
	caseId: ResourceLocatorValue;
	alertId: ResourceLocatorValue;
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
	filters?: Record<string, unknown>;
	sort?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type TheHiveProjectV1CommentUpdateConfig = {
	resource: 'comment';
	operation: 'update';
	commentId: ResourceLocatorValue;
	message: string | Expression<string>;
};

export type TheHiveProjectV1ObservableCreateConfig = {
	resource: 'observable';
	operation: 'create';
	createIn?: 'case' | 'alert' | Expression<string>;
	id: ResourceLocatorValue;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @default file
	 */
	dataType: string | Expression<string>;
	data: string | Expression<string>;
	/**
	 * Array of supported attachments to add to the message
	 * @default {}
	 */
	attachmentsUi: Record<string, unknown>;
	observableFields: unknown;
};

export type TheHiveProjectV1ObservableDeleteObservableConfig = {
	resource: 'observable';
	operation: 'deleteObservable';
	observableId: ResourceLocatorValue;
};

export type TheHiveProjectV1ObservableExecuteAnalyzerConfig = {
	resource: 'observable';
	operation: 'executeAnalyzer';
	observableId: ResourceLocatorValue;
	/**
	 * Type of the observable. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	dataType?: string | Expression<string>;
	/**
	 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @default []
	 */
	analyzers: string[];
};

export type TheHiveProjectV1ObservableExecuteResponderConfig = {
	resource: 'observable';
	operation: 'executeResponder';
	id: ResourceLocatorValue;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	responder: string | Expression<string>;
};

export type TheHiveProjectV1ObservableGetConfig = {
	resource: 'observable';
	operation: 'get';
	observableId: ResourceLocatorValue;
};

export type TheHiveProjectV1ObservableSearchConfig = {
	resource: 'observable';
	operation: 'search';
	/**
	 * Whether to search for observables in all alerts and cases or in a specific case or alert
	 * @default all
	 */
	searchIn?: 'all' | 'alert' | 'case' | Expression<string>;
	caseId: ResourceLocatorValue;
	alertId: ResourceLocatorValue;
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
	filters?: Record<string, unknown>;
	sort?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type TheHiveProjectV1ObservableUpdateConfig = {
	resource: 'observable';
	operation: 'update';
	observableUpdateFields: unknown;
};

export type TheHiveProjectV1PageCreateConfig = {
	resource: 'page';
	operation: 'create';
	location?: 'case' | 'knowledgeBase' | Expression<string>;
	caseId: ResourceLocatorValue;
	title: string | Expression<string>;
	category: string | Expression<string>;
	content: string | Expression<string>;
};

export type TheHiveProjectV1PageDeletePageConfig = {
	resource: 'page';
	operation: 'deletePage';
	location?: 'case' | 'knowledgeBase' | Expression<string>;
	caseId: ResourceLocatorValue;
	pageId: string | Expression<string>;
};

export type TheHiveProjectV1PageSearchConfig = {
	resource: 'page';
	operation: 'search';
	/**
	 * Whether to search in knowledge base or only in the selected case
	 * @default true
	 */
	searchInKnowledgeBase?: boolean | Expression<boolean>;
	caseId: ResourceLocatorValue;
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
	filters?: Record<string, unknown>;
	sort?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type TheHiveProjectV1PageUpdateConfig = {
	resource: 'page';
	operation: 'update';
	location?: 'case' | 'knowledgeBase' | Expression<string>;
	caseId: ResourceLocatorValue;
	pageId: string | Expression<string>;
	content?: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type TheHiveProjectV1QueryExecuteQueryConfig = {
	resource: 'query';
	operation: 'executeQuery';
	/**
 * Search for objects with filtering and sorting capabilities
 * @default =[
  {
    "_name": "listOrganisation"
  }
]
 */
	queryJson: IDataObject | string | Expression<string>;
};

export type TheHiveProjectV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	caseId: ResourceLocatorValue;
	taskFields: unknown;
};

export type TheHiveProjectV1TaskDeleteTaskConfig = {
	resource: 'task';
	operation: 'deleteTask';
	taskId: ResourceLocatorValue;
};

export type TheHiveProjectV1TaskExecuteResponderConfig = {
	resource: 'task';
	operation: 'executeResponder';
	id: ResourceLocatorValue;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	responder: string | Expression<string>;
};

export type TheHiveProjectV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	taskId: ResourceLocatorValue;
};

export type TheHiveProjectV1TaskSearchConfig = {
	resource: 'task';
	operation: 'search';
	/**
	 * Whether to search in all cases or only in a selected case
	 * @default true
	 */
	allCases?: boolean | Expression<boolean>;
	caseId: ResourceLocatorValue;
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
	filters?: Record<string, unknown>;
	sort?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type TheHiveProjectV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	taskUpdateFields: unknown;
};

export type TheHiveProjectV1LogAddAttachmentConfig = {
	resource: 'log';
	operation: 'addAttachment';
	logId: ResourceLocatorValue;
	/**
	 * Array of supported attachments to add to the message
	 * @default {}
	 */
	attachmentsUi?: Record<string, unknown>;
};

export type TheHiveProjectV1LogCreateConfig = {
	resource: 'log';
	operation: 'create';
	taskId: ResourceLocatorValue;
	logFields: unknown;
	/**
	 * Array of supported attachments to add to the message
	 * @default {}
	 */
	attachmentsUi?: Record<string, unknown>;
};

export type TheHiveProjectV1LogDeleteLogConfig = {
	resource: 'log';
	operation: 'deleteLog';
	logId: ResourceLocatorValue;
};

export type TheHiveProjectV1LogDeleteAttachmentConfig = {
	resource: 'log';
	operation: 'deleteAttachment';
	logId: ResourceLocatorValue;
	/**
	 * ID of the attachment. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	attachmentId: string | Expression<string>;
};

export type TheHiveProjectV1LogExecuteResponderConfig = {
	resource: 'log';
	operation: 'executeResponder';
	id: ResourceLocatorValue;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	responder: string | Expression<string>;
};

export type TheHiveProjectV1LogGetConfig = {
	resource: 'log';
	operation: 'get';
	logId: ResourceLocatorValue;
};

export type TheHiveProjectV1LogSearchConfig = {
	resource: 'log';
	operation: 'search';
	/**
	 * Whether to search in all tasks or only in selected task
	 * @default true
	 */
	allTasks?: boolean | Expression<boolean>;
	taskId: ResourceLocatorValue;
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
	filters?: Record<string, unknown>;
	sort?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type TheHiveProjectV1Params =
	| TheHiveProjectV1AlertCreateConfig
	| TheHiveProjectV1AlertDeleteAlertConfig
	| TheHiveProjectV1AlertExecuteResponderConfig
	| TheHiveProjectV1AlertGetConfig
	| TheHiveProjectV1AlertMergeConfig
	| TheHiveProjectV1AlertPromoteConfig
	| TheHiveProjectV1AlertSearchConfig
	| TheHiveProjectV1AlertUpdateConfig
	| TheHiveProjectV1AlertStatusConfig
	| TheHiveProjectV1CaseAddAttachmentConfig
	| TheHiveProjectV1CaseCreateConfig
	| TheHiveProjectV1CaseDeleteAttachmentConfig
	| TheHiveProjectV1CaseDeleteCaseConfig
	| TheHiveProjectV1CaseExecuteResponderConfig
	| TheHiveProjectV1CaseGetConfig
	| TheHiveProjectV1CaseGetAttachmentConfig
	| TheHiveProjectV1CaseGetTimelineConfig
	| TheHiveProjectV1CaseSearchConfig
	| TheHiveProjectV1CaseUpdateConfig
	| TheHiveProjectV1CommentAddConfig
	| TheHiveProjectV1CommentDeleteCommentConfig
	| TheHiveProjectV1CommentSearchConfig
	| TheHiveProjectV1CommentUpdateConfig
	| TheHiveProjectV1ObservableCreateConfig
	| TheHiveProjectV1ObservableDeleteObservableConfig
	| TheHiveProjectV1ObservableExecuteAnalyzerConfig
	| TheHiveProjectV1ObservableExecuteResponderConfig
	| TheHiveProjectV1ObservableGetConfig
	| TheHiveProjectV1ObservableSearchConfig
	| TheHiveProjectV1ObservableUpdateConfig
	| TheHiveProjectV1PageCreateConfig
	| TheHiveProjectV1PageDeletePageConfig
	| TheHiveProjectV1PageSearchConfig
	| TheHiveProjectV1PageUpdateConfig
	| TheHiveProjectV1QueryExecuteQueryConfig
	| TheHiveProjectV1TaskCreateConfig
	| TheHiveProjectV1TaskDeleteTaskConfig
	| TheHiveProjectV1TaskExecuteResponderConfig
	| TheHiveProjectV1TaskGetConfig
	| TheHiveProjectV1TaskSearchConfig
	| TheHiveProjectV1TaskUpdateConfig
	| TheHiveProjectV1LogAddAttachmentConfig
	| TheHiveProjectV1LogCreateConfig
	| TheHiveProjectV1LogDeleteLogConfig
	| TheHiveProjectV1LogDeleteAttachmentConfig
	| TheHiveProjectV1LogExecuteResponderConfig
	| TheHiveProjectV1LogGetConfig
	| TheHiveProjectV1LogSearchConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface TheHiveProjectV1Credentials {
	theHiveProjectApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type TheHiveProjectNode = {
	type: 'n8n-nodes-base.theHiveProject';
	version: 1;
	config: NodeConfig<TheHiveProjectV1Params>;
	credentials?: TheHiveProjectV1Credentials;
};
