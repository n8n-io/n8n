/**
 * TheHive 5 Node - Version 1
 * Consume TheHive 5 API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export type TheHiveProjectV1AlertCreateConfig = {
	resource: 'alert';
	operation: 'create';
	alertFields: unknown;
	observableUi?: {
		values?: Array<{
			/** Type of the observable. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			dataType?: string | Expression<string>;
			/** Data
			 * @displayOptions.hide { dataType: ["file"] }
			 */
			data?: string | Expression<string>;
			/** Input Binary Field
			 * @hint The name of the input binary field containing the file to be written
			 * @displayOptions.show { dataType: ["file"] }
			 * @default data
			 */
			binaryProperty?: string | Expression<string>;
			/** Message
			 */
			message?: string | Expression<string>;
			/** Tags
			 */
			tags?: string | Expression<string>;
		}>;
	};
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
 * @displayOptions.show { resource: ["alert"], operation: ["executeResponder"] }
 * @displayOptions.hide { id: [""] }
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
 * @displayOptions.show { resource: ["alert"], operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["alert"], operation: ["search"] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: {
		values?: Array<{
			/** Dot notation is also supported, e.g. customFields.field1
			 * @displayOptions.hide { /resource: ["alert", "case", "comment", "task", "observable", "log", "page"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["alert"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["case"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["task"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["observable"] }
			 */
			field?: string | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["log"] }
			 */
			field?: 'message' | 'date' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["comment"] }
			 */
			field?: 'message' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["page"] }
			 */
			field?: 'category' | 'content' | 'title' | Expression<string>;
			/** Operator
			 * @default _eq
			 */
			operator?: '_between' | '_like' | '_endsWith' | '_eq' | '_gt' | '_gte' | '_in' | '_lt' | '_lte' | '_match' | '_ne' | '_startsWith' | Expression<string>;
			/** Value
			 * @displayOptions.hide { operator: ["_between", "_in"] }
			 */
			value?: string | Expression<string>;
			/** Comma-separated list of values
			 * @displayOptions.show { operator: ["_in"] }
			 */
			values?: string | Expression<string>;
			/** From
			 * @displayOptions.show { operator: ["_between"] }
			 */
			from?: string | Expression<string>;
			/** To
			 * @displayOptions.show { operator: ["_between"] }
			 */
			to?: string | Expression<string>;
		}>;
	};
	sort?: {
		fields?: Array<{
			/** Dot notation is also supported, e.g. customFields.field1
			 * @displayOptions.hide { /resource: ["alert", "case", "comment", "task", "observable", "log", "page"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["alert"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["case"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["task"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["observable"] }
			 */
			field?: string | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["log"] }
			 */
			field?: 'message' | 'date' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["comment"] }
			 */
			field?: 'message' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["page"] }
			 */
			field?: 'category' | 'content' | 'title' | Expression<string>;
			/** Direction
			 * @default asc
			 */
			direction?: 'asc' | 'desc' | Expression<string>;
		}>;
	};
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
 * @displayOptions.show { resource: ["alert"], operation: ["status"] }
 */
		status: string | Expression<string>;
};

export type TheHiveProjectV1CaseAddAttachmentConfig = {
	resource: 'case';
	operation: 'addAttachment';
	caseId: ResourceLocatorValue;
/**
 * Array of supported attachments to add to the message
 * @displayOptions.show { resource: ["case"], operation: ["addAttachment"] }
 * @default {}
 */
		attachmentsUi?: {
		values?: Array<{
			/** Add the field name from the input node
			 * @hint The name of the field with the attachment in the node input
			 * @default data
			 */
			field?: string | Expression<string>;
		}>;
	};
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
 * @displayOptions.show { resource: ["case"], operation: ["deleteAttachment"] }
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
 * @displayOptions.show { resource: ["case"], operation: ["executeResponder"] }
 * @displayOptions.hide { id: [""] }
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
 * @displayOptions.show { resource: ["case"], operation: ["getAttachment"] }
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
 * @displayOptions.show { resource: ["case"], operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["case"], operation: ["search"] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: {
		values?: Array<{
			/** Dot notation is also supported, e.g. customFields.field1
			 * @displayOptions.hide { /resource: ["alert", "case", "comment", "task", "observable", "log", "page"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["alert"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["case"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["task"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["observable"] }
			 */
			field?: string | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["log"] }
			 */
			field?: 'message' | 'date' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["comment"] }
			 */
			field?: 'message' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["page"] }
			 */
			field?: 'category' | 'content' | 'title' | Expression<string>;
			/** Operator
			 * @default _eq
			 */
			operator?: '_between' | '_like' | '_endsWith' | '_eq' | '_gt' | '_gte' | '_in' | '_lt' | '_lte' | '_match' | '_ne' | '_startsWith' | Expression<string>;
			/** Value
			 * @displayOptions.hide { operator: ["_between", "_in"] }
			 */
			value?: string | Expression<string>;
			/** Comma-separated list of values
			 * @displayOptions.show { operator: ["_in"] }
			 */
			values?: string | Expression<string>;
			/** From
			 * @displayOptions.show { operator: ["_between"] }
			 */
			from?: string | Expression<string>;
			/** To
			 * @displayOptions.show { operator: ["_between"] }
			 */
			to?: string | Expression<string>;
		}>;
	};
	sort?: {
		fields?: Array<{
			/** Dot notation is also supported, e.g. customFields.field1
			 * @displayOptions.hide { /resource: ["alert", "case", "comment", "task", "observable", "log", "page"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["alert"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["case"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["task"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["observable"] }
			 */
			field?: string | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["log"] }
			 */
			field?: 'message' | 'date' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["comment"] }
			 */
			field?: 'message' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["page"] }
			 */
			field?: 'category' | 'content' | 'title' | Expression<string>;
			/** Direction
			 * @default asc
			 */
			direction?: 'asc' | 'desc' | Expression<string>;
		}>;
	};
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
 * @displayOptions.show { resource: ["comment"], operation: ["search"] }
 * @default all
 */
		searchIn?: 'all' | 'alert' | 'case' | Expression<string>;
	caseId: ResourceLocatorValue;
	alertId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["comment"], operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["comment"], operation: ["search"] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: {
		values?: Array<{
			/** Dot notation is also supported, e.g. customFields.field1
			 * @displayOptions.hide { /resource: ["alert", "case", "comment", "task", "observable", "log", "page"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["alert"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["case"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["task"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["observable"] }
			 */
			field?: string | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["log"] }
			 */
			field?: 'message' | 'date' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["comment"] }
			 */
			field?: 'message' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["page"] }
			 */
			field?: 'category' | 'content' | 'title' | Expression<string>;
			/** Operator
			 * @default _eq
			 */
			operator?: '_between' | '_like' | '_endsWith' | '_eq' | '_gt' | '_gte' | '_in' | '_lt' | '_lte' | '_match' | '_ne' | '_startsWith' | Expression<string>;
			/** Value
			 * @displayOptions.hide { operator: ["_between", "_in"] }
			 */
			value?: string | Expression<string>;
			/** Comma-separated list of values
			 * @displayOptions.show { operator: ["_in"] }
			 */
			values?: string | Expression<string>;
			/** From
			 * @displayOptions.show { operator: ["_between"] }
			 */
			from?: string | Expression<string>;
			/** To
			 * @displayOptions.show { operator: ["_between"] }
			 */
			to?: string | Expression<string>;
		}>;
	};
	sort?: {
		fields?: Array<{
			/** Dot notation is also supported, e.g. customFields.field1
			 * @displayOptions.hide { /resource: ["alert", "case", "comment", "task", "observable", "log", "page"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["alert"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["case"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["task"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["observable"] }
			 */
			field?: string | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["log"] }
			 */
			field?: 'message' | 'date' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["comment"] }
			 */
			field?: 'message' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["page"] }
			 */
			field?: 'category' | 'content' | 'title' | Expression<string>;
			/** Direction
			 * @default asc
			 */
			direction?: 'asc' | 'desc' | Expression<string>;
		}>;
	};
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
 * @displayOptions.show { resource: ["observable"], operation: ["create"] }
 * @default file
 */
		dataType: string | Expression<string>;
	data: string | Expression<string>;
/**
 * Array of supported attachments to add to the message
 * @displayOptions.show { dataType: ["file"], resource: ["observable"], operation: ["create"] }
 * @default {}
 */
		attachmentsUi: {
		values?: Array<{
			/** Add the field name from the input node
			 * @hint The name of the field with the attachment in the node input
			 * @default data
			 */
			field?: string | Expression<string>;
		}>;
	};
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
 * @displayOptions.show { resource: ["observable"], operation: ["executeAnalyzer"] }
 */
		dataType?: string | Expression<string>;
/**
 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["observable"], operation: ["executeAnalyzer"] }
 * @displayOptions.hide { id: [""] }
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
 * @displayOptions.show { resource: ["observable"], operation: ["executeResponder"] }
 * @displayOptions.hide { id: [""] }
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
 * @displayOptions.show { resource: ["observable"], operation: ["search"] }
 * @default all
 */
		searchIn?: 'all' | 'alert' | 'case' | Expression<string>;
	caseId: ResourceLocatorValue;
	alertId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["observable"], operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["observable"], operation: ["search"] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: {
		values?: Array<{
			/** Dot notation is also supported, e.g. customFields.field1
			 * @displayOptions.hide { /resource: ["alert", "case", "comment", "task", "observable", "log", "page"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["alert"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["case"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["task"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["observable"] }
			 */
			field?: string | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["log"] }
			 */
			field?: 'message' | 'date' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["comment"] }
			 */
			field?: 'message' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["page"] }
			 */
			field?: 'category' | 'content' | 'title' | Expression<string>;
			/** Operator
			 * @default _eq
			 */
			operator?: '_between' | '_like' | '_endsWith' | '_eq' | '_gt' | '_gte' | '_in' | '_lt' | '_lte' | '_match' | '_ne' | '_startsWith' | Expression<string>;
			/** Value
			 * @displayOptions.hide { operator: ["_between", "_in"] }
			 */
			value?: string | Expression<string>;
			/** Comma-separated list of values
			 * @displayOptions.show { operator: ["_in"] }
			 */
			values?: string | Expression<string>;
			/** From
			 * @displayOptions.show { operator: ["_between"] }
			 */
			from?: string | Expression<string>;
			/** To
			 * @displayOptions.show { operator: ["_between"] }
			 */
			to?: string | Expression<string>;
		}>;
	};
	sort?: {
		fields?: Array<{
			/** Dot notation is also supported, e.g. customFields.field1
			 * @displayOptions.hide { /resource: ["alert", "case", "comment", "task", "observable", "log", "page"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["alert"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["case"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["task"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["observable"] }
			 */
			field?: string | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["log"] }
			 */
			field?: 'message' | 'date' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["comment"] }
			 */
			field?: 'message' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["page"] }
			 */
			field?: 'category' | 'content' | 'title' | Expression<string>;
			/** Direction
			 * @default asc
			 */
			direction?: 'asc' | 'desc' | Expression<string>;
		}>;
	};
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
 * @displayOptions.show { resource: ["page"], operation: ["search"] }
 * @default true
 */
		searchInKnowledgeBase?: boolean | Expression<boolean>;
	caseId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["page"], operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["page"], operation: ["search"] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: {
		values?: Array<{
			/** Dot notation is also supported, e.g. customFields.field1
			 * @displayOptions.hide { /resource: ["alert", "case", "comment", "task", "observable", "log", "page"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["alert"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["case"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["task"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["observable"] }
			 */
			field?: string | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["log"] }
			 */
			field?: 'message' | 'date' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["comment"] }
			 */
			field?: 'message' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["page"] }
			 */
			field?: 'category' | 'content' | 'title' | Expression<string>;
			/** Operator
			 * @default _eq
			 */
			operator?: '_between' | '_like' | '_endsWith' | '_eq' | '_gt' | '_gte' | '_in' | '_lt' | '_lte' | '_match' | '_ne' | '_startsWith' | Expression<string>;
			/** Value
			 * @displayOptions.hide { operator: ["_between", "_in"] }
			 */
			value?: string | Expression<string>;
			/** Comma-separated list of values
			 * @displayOptions.show { operator: ["_in"] }
			 */
			values?: string | Expression<string>;
			/** From
			 * @displayOptions.show { operator: ["_between"] }
			 */
			from?: string | Expression<string>;
			/** To
			 * @displayOptions.show { operator: ["_between"] }
			 */
			to?: string | Expression<string>;
		}>;
	};
	sort?: {
		fields?: Array<{
			/** Dot notation is also supported, e.g. customFields.field1
			 * @displayOptions.hide { /resource: ["alert", "case", "comment", "task", "observable", "log", "page"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["alert"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["case"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["task"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["observable"] }
			 */
			field?: string | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["log"] }
			 */
			field?: 'message' | 'date' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["comment"] }
			 */
			field?: 'message' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["page"] }
			 */
			field?: 'category' | 'content' | 'title' | Expression<string>;
			/** Direction
			 * @default asc
			 */
			direction?: 'asc' | 'desc' | Expression<string>;
		}>;
	};
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
 * @hint The query should be an array of operations with the required selection and optional filtering, sorting, and pagination. See &lt;a href="https://docs.strangebee.com/thehive/api-docs/#operation/Query%20API" target="_blank"&gt;Query API&lt;/a&gt; for more information.
 * @displayOptions.show { resource: ["query"], operation: ["executeQuery"] }
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
 * @displayOptions.show { resource: ["task"], operation: ["executeResponder"] }
 * @displayOptions.hide { id: [""] }
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
 * @displayOptions.show { resource: ["task"], operation: ["search"] }
 * @default true
 */
		allCases?: boolean | Expression<boolean>;
	caseId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["task"], operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["task"], operation: ["search"] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: {
		values?: Array<{
			/** Dot notation is also supported, e.g. customFields.field1
			 * @displayOptions.hide { /resource: ["alert", "case", "comment", "task", "observable", "log", "page"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["alert"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["case"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["task"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["observable"] }
			 */
			field?: string | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["log"] }
			 */
			field?: 'message' | 'date' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["comment"] }
			 */
			field?: 'message' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["page"] }
			 */
			field?: 'category' | 'content' | 'title' | Expression<string>;
			/** Operator
			 * @default _eq
			 */
			operator?: '_between' | '_like' | '_endsWith' | '_eq' | '_gt' | '_gte' | '_in' | '_lt' | '_lte' | '_match' | '_ne' | '_startsWith' | Expression<string>;
			/** Value
			 * @displayOptions.hide { operator: ["_between", "_in"] }
			 */
			value?: string | Expression<string>;
			/** Comma-separated list of values
			 * @displayOptions.show { operator: ["_in"] }
			 */
			values?: string | Expression<string>;
			/** From
			 * @displayOptions.show { operator: ["_between"] }
			 */
			from?: string | Expression<string>;
			/** To
			 * @displayOptions.show { operator: ["_between"] }
			 */
			to?: string | Expression<string>;
		}>;
	};
	sort?: {
		fields?: Array<{
			/** Dot notation is also supported, e.g. customFields.field1
			 * @displayOptions.hide { /resource: ["alert", "case", "comment", "task", "observable", "log", "page"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["alert"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["case"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["task"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["observable"] }
			 */
			field?: string | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["log"] }
			 */
			field?: 'message' | 'date' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["comment"] }
			 */
			field?: 'message' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["page"] }
			 */
			field?: 'category' | 'content' | 'title' | Expression<string>;
			/** Direction
			 * @default asc
			 */
			direction?: 'asc' | 'desc' | Expression<string>;
		}>;
	};
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
 * @displayOptions.show { resource: ["log"], operation: ["addAttachment"] }
 * @default {}
 */
		attachmentsUi?: {
		values?: Array<{
			/** Add the field name from the input node
			 * @hint The name of the field with the attachment in the node input
			 * @default data
			 */
			field?: string | Expression<string>;
		}>;
	};
};

export type TheHiveProjectV1LogCreateConfig = {
	resource: 'log';
	operation: 'create';
	taskId: ResourceLocatorValue;
	logFields: unknown;
/**
 * Array of supported attachments to add to the message
 * @displayOptions.show { resource: ["log"], operation: ["create"] }
 * @default {}
 */
		attachmentsUi?: {
		values?: Array<{
			/** Add the field name from the input node
			 * @hint The name of the field with the attachment in the node input
			 * @default data
			 */
			field?: string | Expression<string>;
		}>;
	};
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
 * @displayOptions.show { resource: ["log"], operation: ["deleteAttachment"] }
 */
		attachmentId: string | Expression<string>;
};

export type TheHiveProjectV1LogExecuteResponderConfig = {
	resource: 'log';
	operation: 'executeResponder';
	id: ResourceLocatorValue;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["log"], operation: ["executeResponder"] }
 * @displayOptions.hide { id: [""] }
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
 * @displayOptions.show { resource: ["log"], operation: ["search"] }
 * @default true
 */
		allTasks?: boolean | Expression<boolean>;
	taskId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["log"], operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["log"], operation: ["search"] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: {
		values?: Array<{
			/** Dot notation is also supported, e.g. customFields.field1
			 * @displayOptions.hide { /resource: ["alert", "case", "comment", "task", "observable", "log", "page"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["alert"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["case"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["task"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["observable"] }
			 */
			field?: string | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["log"] }
			 */
			field?: 'message' | 'date' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["comment"] }
			 */
			field?: 'message' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["page"] }
			 */
			field?: 'category' | 'content' | 'title' | Expression<string>;
			/** Operator
			 * @default _eq
			 */
			operator?: '_between' | '_like' | '_endsWith' | '_eq' | '_gt' | '_gte' | '_in' | '_lt' | '_lte' | '_match' | '_ne' | '_startsWith' | Expression<string>;
			/** Value
			 * @displayOptions.hide { operator: ["_between", "_in"] }
			 */
			value?: string | Expression<string>;
			/** Comma-separated list of values
			 * @displayOptions.show { operator: ["_in"] }
			 */
			values?: string | Expression<string>;
			/** From
			 * @displayOptions.show { operator: ["_between"] }
			 */
			from?: string | Expression<string>;
			/** To
			 * @displayOptions.show { operator: ["_between"] }
			 */
			to?: string | Expression<string>;
		}>;
	};
	sort?: {
		fields?: Array<{
			/** Dot notation is also supported, e.g. customFields.field1
			 * @displayOptions.hide { /resource: ["alert", "case", "comment", "task", "observable", "log", "page"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["alert"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["case"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["task"] }
			 */
			field?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { /resource: ["observable"] }
			 */
			field?: string | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["log"] }
			 */
			field?: 'message' | 'date' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["comment"] }
			 */
			field?: 'message' | Expression<string>;
			/** Field
			 * @displayOptions.show { /resource: ["page"] }
			 */
			field?: 'category' | 'content' | 'title' | Expression<string>;
			/** Direction
			 * @default asc
			 */
			direction?: 'asc' | 'desc' | Expression<string>;
		}>;
	};
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
	| TheHiveProjectV1LogSearchConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface TheHiveProjectV1Credentials {
	theHiveProjectApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TheHiveProjectV1NodeBase {
	type: 'n8n-nodes-base.theHiveProject';
	version: 1;
	credentials?: TheHiveProjectV1Credentials;
}

export type TheHiveProjectV1AlertCreateNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1AlertCreateConfig>;
};

export type TheHiveProjectV1AlertDeleteAlertNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1AlertDeleteAlertConfig>;
};

export type TheHiveProjectV1AlertExecuteResponderNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1AlertExecuteResponderConfig>;
};

export type TheHiveProjectV1AlertGetNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1AlertGetConfig>;
};

export type TheHiveProjectV1AlertMergeNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1AlertMergeConfig>;
};

export type TheHiveProjectV1AlertPromoteNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1AlertPromoteConfig>;
};

export type TheHiveProjectV1AlertSearchNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1AlertSearchConfig>;
};

export type TheHiveProjectV1AlertUpdateNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1AlertUpdateConfig>;
};

export type TheHiveProjectV1AlertStatusNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1AlertStatusConfig>;
};

export type TheHiveProjectV1CaseAddAttachmentNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1CaseAddAttachmentConfig>;
};

export type TheHiveProjectV1CaseCreateNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1CaseCreateConfig>;
};

export type TheHiveProjectV1CaseDeleteAttachmentNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1CaseDeleteAttachmentConfig>;
};

export type TheHiveProjectV1CaseDeleteCaseNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1CaseDeleteCaseConfig>;
};

export type TheHiveProjectV1CaseExecuteResponderNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1CaseExecuteResponderConfig>;
};

export type TheHiveProjectV1CaseGetNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1CaseGetConfig>;
};

export type TheHiveProjectV1CaseGetAttachmentNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1CaseGetAttachmentConfig>;
};

export type TheHiveProjectV1CaseGetTimelineNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1CaseGetTimelineConfig>;
};

export type TheHiveProjectV1CaseSearchNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1CaseSearchConfig>;
};

export type TheHiveProjectV1CaseUpdateNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1CaseUpdateConfig>;
};

export type TheHiveProjectV1CommentAddNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1CommentAddConfig>;
};

export type TheHiveProjectV1CommentDeleteCommentNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1CommentDeleteCommentConfig>;
};

export type TheHiveProjectV1CommentSearchNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1CommentSearchConfig>;
};

export type TheHiveProjectV1CommentUpdateNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1CommentUpdateConfig>;
};

export type TheHiveProjectV1ObservableCreateNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1ObservableCreateConfig>;
};

export type TheHiveProjectV1ObservableDeleteObservableNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1ObservableDeleteObservableConfig>;
};

export type TheHiveProjectV1ObservableExecuteAnalyzerNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1ObservableExecuteAnalyzerConfig>;
};

export type TheHiveProjectV1ObservableExecuteResponderNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1ObservableExecuteResponderConfig>;
};

export type TheHiveProjectV1ObservableGetNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1ObservableGetConfig>;
};

export type TheHiveProjectV1ObservableSearchNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1ObservableSearchConfig>;
};

export type TheHiveProjectV1ObservableUpdateNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1ObservableUpdateConfig>;
};

export type TheHiveProjectV1PageCreateNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1PageCreateConfig>;
};

export type TheHiveProjectV1PageDeletePageNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1PageDeletePageConfig>;
};

export type TheHiveProjectV1PageSearchNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1PageSearchConfig>;
};

export type TheHiveProjectV1PageUpdateNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1PageUpdateConfig>;
};

export type TheHiveProjectV1QueryExecuteQueryNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1QueryExecuteQueryConfig>;
};

export type TheHiveProjectV1TaskCreateNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1TaskCreateConfig>;
};

export type TheHiveProjectV1TaskDeleteTaskNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1TaskDeleteTaskConfig>;
};

export type TheHiveProjectV1TaskExecuteResponderNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1TaskExecuteResponderConfig>;
};

export type TheHiveProjectV1TaskGetNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1TaskGetConfig>;
};

export type TheHiveProjectV1TaskSearchNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1TaskSearchConfig>;
};

export type TheHiveProjectV1TaskUpdateNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1TaskUpdateConfig>;
};

export type TheHiveProjectV1LogAddAttachmentNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1LogAddAttachmentConfig>;
};

export type TheHiveProjectV1LogCreateNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1LogCreateConfig>;
};

export type TheHiveProjectV1LogDeleteLogNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1LogDeleteLogConfig>;
};

export type TheHiveProjectV1LogDeleteAttachmentNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1LogDeleteAttachmentConfig>;
};

export type TheHiveProjectV1LogExecuteResponderNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1LogExecuteResponderConfig>;
};

export type TheHiveProjectV1LogGetNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1LogGetConfig>;
};

export type TheHiveProjectV1LogSearchNode = TheHiveProjectV1NodeBase & {
	config: NodeConfig<TheHiveProjectV1LogSearchConfig>;
};

export type TheHiveProjectV1Node =
	| TheHiveProjectV1AlertCreateNode
	| TheHiveProjectV1AlertDeleteAlertNode
	| TheHiveProjectV1AlertExecuteResponderNode
	| TheHiveProjectV1AlertGetNode
	| TheHiveProjectV1AlertMergeNode
	| TheHiveProjectV1AlertPromoteNode
	| TheHiveProjectV1AlertSearchNode
	| TheHiveProjectV1AlertUpdateNode
	| TheHiveProjectV1AlertStatusNode
	| TheHiveProjectV1CaseAddAttachmentNode
	| TheHiveProjectV1CaseCreateNode
	| TheHiveProjectV1CaseDeleteAttachmentNode
	| TheHiveProjectV1CaseDeleteCaseNode
	| TheHiveProjectV1CaseExecuteResponderNode
	| TheHiveProjectV1CaseGetNode
	| TheHiveProjectV1CaseGetAttachmentNode
	| TheHiveProjectV1CaseGetTimelineNode
	| TheHiveProjectV1CaseSearchNode
	| TheHiveProjectV1CaseUpdateNode
	| TheHiveProjectV1CommentAddNode
	| TheHiveProjectV1CommentDeleteCommentNode
	| TheHiveProjectV1CommentSearchNode
	| TheHiveProjectV1CommentUpdateNode
	| TheHiveProjectV1ObservableCreateNode
	| TheHiveProjectV1ObservableDeleteObservableNode
	| TheHiveProjectV1ObservableExecuteAnalyzerNode
	| TheHiveProjectV1ObservableExecuteResponderNode
	| TheHiveProjectV1ObservableGetNode
	| TheHiveProjectV1ObservableSearchNode
	| TheHiveProjectV1ObservableUpdateNode
	| TheHiveProjectV1PageCreateNode
	| TheHiveProjectV1PageDeletePageNode
	| TheHiveProjectV1PageSearchNode
	| TheHiveProjectV1PageUpdateNode
	| TheHiveProjectV1QueryExecuteQueryNode
	| TheHiveProjectV1TaskCreateNode
	| TheHiveProjectV1TaskDeleteTaskNode
	| TheHiveProjectV1TaskExecuteResponderNode
	| TheHiveProjectV1TaskGetNode
	| TheHiveProjectV1TaskSearchNode
	| TheHiveProjectV1TaskUpdateNode
	| TheHiveProjectV1LogAddAttachmentNode
	| TheHiveProjectV1LogCreateNode
	| TheHiveProjectV1LogDeleteLogNode
	| TheHiveProjectV1LogDeleteAttachmentNode
	| TheHiveProjectV1LogExecuteResponderNode
	| TheHiveProjectV1LogGetNode
	| TheHiveProjectV1LogSearchNode
	;