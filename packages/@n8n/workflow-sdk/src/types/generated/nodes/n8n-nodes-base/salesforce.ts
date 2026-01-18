/**
 * Salesforce Node Types
 *
 * Consume Salesforce API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/salesforce/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Represents an individual account, which is an organization or person involved with your business (such as customers, competitors, and partners) */
export type SalesforceV1AccountAddNoteConfig = {
	resource: 'account';
	operation: 'addNote';
	/**
	 * ID of account that needs to be fetched
	 */
	accountId: string | Expression<string>;
	/**
	 * Title of the note
	 */
	title: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Represents an individual account, which is an organization or person involved with your business (such as customers, competitors, and partners) */
export type SalesforceV1AccountCreateConfig = {
	resource: 'account';
	operation: 'create';
	/**
	 * Name of the account. Maximum size is 255 characters.
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Represents an individual account, which is an organization or person involved with your business (such as customers, competitors, and partners) */
export type SalesforceV1AccountUpsertConfig = {
	resource: 'account';
	operation: 'upsert';
	/**
	 * The field to check to see if the account already exists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	externalId: string | Expression<string>;
	/**
	 * If this value exists in the 'match against' field, update the account. Otherwise create a new one.
	 */
	externalIdValue: string | Expression<string>;
	/**
	 * Name of the account. Maximum size is 255 characters.
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Represents an individual account, which is an organization or person involved with your business (such as customers, competitors, and partners) */
export type SalesforceV1AccountDeleteConfig = {
	resource: 'account';
	operation: 'delete';
	/**
	 * ID of account that needs to be fetched
	 */
	accountId: string | Expression<string>;
};

/** Represents an individual account, which is an organization or person involved with your business (such as customers, competitors, and partners) */
export type SalesforceV1AccountGetConfig = {
	resource: 'account';
	operation: 'get';
	/**
	 * ID of account that needs to be fetched
	 */
	accountId: string | Expression<string>;
};

/** Represents an individual account, which is an organization or person involved with your business (such as customers, competitors, and partners) */
export type SalesforceV1AccountGetAllConfig = {
	resource: 'account';
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
	options?: Record<string, unknown>;
};

/** Represents an individual account, which is an organization or person involved with your business (such as customers, competitors, and partners) */
export type SalesforceV1AccountGetSummaryConfig = {
	resource: 'account';
	operation: 'getSummary';
};

/** Represents an individual account, which is an organization or person involved with your business (such as customers, competitors, and partners) */
export type SalesforceV1AccountUpdateConfig = {
	resource: 'account';
	operation: 'update';
	/**
	 * ID of account that needs to be fetched
	 */
	accountId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Represents a file that a has uploaded and attached to a parent object */
export type SalesforceV1AttachmentCreateConfig = {
	resource: 'attachment';
	operation: 'create';
	parentId: string | Expression<string>;
	/**
	 * Required. Name of the attached file. Maximum size is 255 characters. Label is File Name.
	 */
	name: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Represents a file that a has uploaded and attached to a parent object */
export type SalesforceV1AttachmentDeleteConfig = {
	resource: 'attachment';
	operation: 'delete';
	/**
	 * ID of attachment that needs to be fetched
	 */
	attachmentId: string | Expression<string>;
};

/** Represents a file that a has uploaded and attached to a parent object */
export type SalesforceV1AttachmentGetConfig = {
	resource: 'attachment';
	operation: 'get';
	/**
	 * ID of attachment that needs to be fetched
	 */
	attachmentId: string | Expression<string>;
};

/** Represents a file that a has uploaded and attached to a parent object */
export type SalesforceV1AttachmentGetAllConfig = {
	resource: 'attachment';
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
	options?: Record<string, unknown>;
};

/** Represents a file that a has uploaded and attached to a parent object */
export type SalesforceV1AttachmentGetSummaryConfig = {
	resource: 'attachment';
	operation: 'getSummary';
};

/** Represents a file that a has uploaded and attached to a parent object */
export type SalesforceV1AttachmentUpdateConfig = {
	resource: 'attachment';
	operation: 'update';
	/**
	 * ID of attachment that needs to be fetched
	 */
	attachmentId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Represents a case, which is a customer issue or problem */
export type SalesforceV1CaseAddCommentConfig = {
	resource: 'case';
	operation: 'addComment';
	/**
	 * ID of case that needs to be fetched
	 */
	caseId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Represents a case, which is a customer issue or problem */
export type SalesforceV1CaseCreateConfig = {
	resource: 'case';
	operation: 'create';
	/**
	 * The type of case. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	type: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Represents a case, which is a customer issue or problem */
export type SalesforceV1CaseDeleteConfig = {
	resource: 'case';
	operation: 'delete';
	/**
	 * ID of case that needs to be fetched
	 */
	caseId: string | Expression<string>;
};

/** Represents a case, which is a customer issue or problem */
export type SalesforceV1CaseGetConfig = {
	resource: 'case';
	operation: 'get';
	/**
	 * ID of case that needs to be fetched
	 */
	caseId: string | Expression<string>;
};

/** Represents a case, which is a customer issue or problem */
export type SalesforceV1CaseGetAllConfig = {
	resource: 'case';
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
	options?: Record<string, unknown>;
};

/** Represents a case, which is a customer issue or problem */
export type SalesforceV1CaseGetSummaryConfig = {
	resource: 'case';
	operation: 'getSummary';
};

/** Represents a case, which is a customer issue or problem */
export type SalesforceV1CaseUpdateConfig = {
	resource: 'case';
	operation: 'update';
	/**
	 * ID of case that needs to be fetched
	 */
	caseId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Represents a contact, which is an individual associated with an account */
export type SalesforceV1ContactAddToCampaignConfig = {
	resource: 'contact';
	operation: 'addToCampaign';
	/**
	 * ID of contact that needs to be fetched
	 */
	contactId: string | Expression<string>;
	/**
	 * ID of the campaign that needs to be fetched. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	campaignId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Represents a contact, which is an individual associated with an account */
export type SalesforceV1ContactAddNoteConfig = {
	resource: 'contact';
	operation: 'addNote';
	/**
	 * ID of contact that needs to be fetched
	 */
	contactId: string | Expression<string>;
	/**
	 * Title of the note
	 */
	title: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Represents a contact, which is an individual associated with an account */
export type SalesforceV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	/**
	 * Required. Last name of the contact. Limited to 80 characters.
	 */
	lastname: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Represents a contact, which is an individual associated with an account */
export type SalesforceV1ContactUpsertConfig = {
	resource: 'contact';
	operation: 'upsert';
	/**
	 * The field to check to see if the contact already exists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	externalId: string | Expression<string>;
	/**
	 * If this value exists in the 'match against' field, update the contact. Otherwise create a new one.
	 */
	externalIdValue: string | Expression<string>;
	/**
	 * Required. Last name of the contact. Limited to 80 characters.
	 */
	lastname: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Represents a contact, which is an individual associated with an account */
export type SalesforceV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	/**
	 * ID of contact that needs to be fetched
	 */
	contactId: string | Expression<string>;
};

/** Represents a contact, which is an individual associated with an account */
export type SalesforceV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	/**
	 * ID of contact that needs to be fetched
	 */
	contactId: string | Expression<string>;
};

/** Represents a contact, which is an individual associated with an account */
export type SalesforceV1ContactGetAllConfig = {
	resource: 'contact';
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
	options?: Record<string, unknown>;
};

/** Represents a contact, which is an individual associated with an account */
export type SalesforceV1ContactGetSummaryConfig = {
	resource: 'contact';
	operation: 'getSummary';
};

/** Represents a contact, which is an individual associated with an account */
export type SalesforceV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	/**
	 * ID of contact that needs to be fetched
	 */
	contactId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Represents a custom object */
export type SalesforceV1CustomObjectCreateConfig = {
	resource: 'customObject';
	operation: 'create';
	/**
	 * Name of the custom object. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	customObject: string | Expression<string>;
	/**
	 * Filter by custom fields
	 * @default {}
	 */
	customFieldsUi?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Represents a custom object */
export type SalesforceV1CustomObjectUpsertConfig = {
	resource: 'customObject';
	operation: 'upsert';
	/**
	 * Name of the custom object. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	customObject: string | Expression<string>;
	/**
	 * The field to check to see if the object already exists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	externalId: string | Expression<string>;
	/**
	 * If this value exists in the 'match against' field, update the object. Otherwise create a new one.
	 */
	externalIdValue: string | Expression<string>;
	/**
	 * Filter by custom fields
	 * @default {}
	 */
	customFieldsUi?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Represents a custom object */
export type SalesforceV1CustomObjectDeleteConfig = {
	resource: 'customObject';
	operation: 'delete';
	/**
	 * Name of the custom object. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	customObject: string | Expression<string>;
	/**
	 * Record ID to be deleted
	 */
	recordId: string | Expression<string>;
};

/** Represents a custom object */
export type SalesforceV1CustomObjectGetConfig = {
	resource: 'customObject';
	operation: 'get';
	/**
	 * Name of the custom object. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	customObject: string | Expression<string>;
	/**
	 * Record ID to be retrieved
	 */
	recordId: string | Expression<string>;
};

/** Represents a custom object */
export type SalesforceV1CustomObjectGetAllConfig = {
	resource: 'customObject';
	operation: 'getAll';
	/**
	 * Name of the custom object. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	customObject: string | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Represents a custom object */
export type SalesforceV1CustomObjectUpdateConfig = {
	resource: 'customObject';
	operation: 'update';
	/**
	 * Name of the custom object. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	customObject: string | Expression<string>;
	/**
	 * Record ID to be updated
	 */
	recordId: string | Expression<string>;
	/**
	 * Filter by custom fields
	 * @default {}
	 */
	customFieldsUi?: Record<string, unknown>;
	updateFields?: Record<string, unknown>;
};

/** Represents a document */
export type SalesforceV1DocumentUploadConfig = {
	resource: 'document';
	operation: 'upload';
	/**
	 * Name of the file
	 */
	title: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Represents an autolaunched flow */
export type SalesforceV1FlowGetAllConfig = {
	resource: 'flow';
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

/** Represents an autolaunched flow */
export type SalesforceV1FlowInvokeConfig = {
	resource: 'flow';
	operation: 'invoke';
	/**
	 * Required. API name of the flow.
	 */
	apiName: string | Expression<string>;
	/**
	 * Whether the input variables should be set via the value-key pair UI or JSON/RAW
	 * @default false
	 */
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Input variables as JSON object
	 */
	variablesJson?: IDataObject | string | Expression<string>;
	/**
	 * The input variable to send
	 * @default {}
	 */
	variablesUi?: Record<string, unknown>;
};

/** Represents a prospect or potential */
export type SalesforceV1LeadAddToCampaignConfig = {
	resource: 'lead';
	operation: 'addToCampaign';
	/**
	 * ID of contact that needs to be fetched
	 */
	leadId: string | Expression<string>;
	/**
	 * ID of the campaign that needs to be fetched. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	campaignId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Represents a prospect or potential */
export type SalesforceV1LeadAddNoteConfig = {
	resource: 'lead';
	operation: 'addNote';
	/**
	 * ID of lead that needs to be fetched
	 */
	leadId: string | Expression<string>;
	/**
	 * Title of the note
	 */
	title: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Represents a prospect or potential */
export type SalesforceV1LeadCreateConfig = {
	resource: 'lead';
	operation: 'create';
	/**
	 * Company of the lead. If person account record types have been enabled, and if the value of Company is null, the lead converts to a person account.
	 */
	company: string | Expression<string>;
	/**
	 * Required. Last name of the lead. Limited to 80 characters.
	 */
	lastname: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Represents a prospect or potential */
export type SalesforceV1LeadUpsertConfig = {
	resource: 'lead';
	operation: 'upsert';
	/**
	 * The field to check to see if the lead already exists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	externalId: string | Expression<string>;
	/**
	 * If this value exists in the 'match against' field, update the lead. Otherwise create a new one.
	 */
	externalIdValue: string | Expression<string>;
	/**
	 * Company of the lead. If person account record types have been enabled, and if the value of Company is null, the lead converts to a person account.
	 */
	company: string | Expression<string>;
	/**
	 * Required. Last name of the lead. Limited to 80 characters.
	 */
	lastname: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Represents a prospect or potential */
export type SalesforceV1LeadDeleteConfig = {
	resource: 'lead';
	operation: 'delete';
	/**
	 * ID of Lead that needs to be fetched
	 */
	leadId: string | Expression<string>;
};

/** Represents a prospect or potential */
export type SalesforceV1LeadGetConfig = {
	resource: 'lead';
	operation: 'get';
	/**
	 * ID of Lead that needs to be fetched
	 */
	leadId: string | Expression<string>;
};

/** Represents a prospect or potential */
export type SalesforceV1LeadGetAllConfig = {
	resource: 'lead';
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
	options?: Record<string, unknown>;
};

/** Represents a prospect or potential */
export type SalesforceV1LeadGetSummaryConfig = {
	resource: 'lead';
	operation: 'getSummary';
};

/** Represents a prospect or potential */
export type SalesforceV1LeadUpdateConfig = {
	resource: 'lead';
	operation: 'update';
	/**
	 * ID of Lead that needs to be fetched
	 */
	leadId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Represents an opportunity, which is a sale or pending deal */
export type SalesforceV1OpportunityAddNoteConfig = {
	resource: 'opportunity';
	operation: 'addNote';
	/**
	 * ID of opportunity that needs to be fetched
	 */
	opportunityId: string | Expression<string>;
	/**
	 * Title of the note
	 */
	title: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Represents an opportunity, which is a sale or pending deal */
export type SalesforceV1OpportunityCreateConfig = {
	resource: 'opportunity';
	operation: 'create';
	/**
	 * Required. Last name of the opportunity. Limited to 80 characters.
	 */
	name: string | Expression<string>;
	/**
	 * Required. Date when the opportunity is expected to close.
	 */
	closeDate: string | Expression<string>;
	/**
	 * Required. Date when the opportunity is expected to close. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	stageName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Represents an opportunity, which is a sale or pending deal */
export type SalesforceV1OpportunityUpsertConfig = {
	resource: 'opportunity';
	operation: 'upsert';
	/**
	 * The field to check to see if the opportunity already exists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	externalId: string | Expression<string>;
	/**
	 * If this value exists in the 'match against' field, update the opportunity. Otherwise create a new one.
	 */
	externalIdValue: string | Expression<string>;
	/**
	 * Required. Last name of the opportunity. Limited to 80 characters.
	 */
	name: string | Expression<string>;
	/**
	 * Required. Date when the opportunity is expected to close.
	 */
	closeDate: string | Expression<string>;
	/**
	 * Required. Date when the opportunity is expected to close. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	stageName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Represents an opportunity, which is a sale or pending deal */
export type SalesforceV1OpportunityDeleteConfig = {
	resource: 'opportunity';
	operation: 'delete';
	/**
	 * ID of opportunity that needs to be fetched
	 */
	opportunityId: string | Expression<string>;
};

/** Represents an opportunity, which is a sale or pending deal */
export type SalesforceV1OpportunityGetConfig = {
	resource: 'opportunity';
	operation: 'get';
	/**
	 * ID of opportunity that needs to be fetched
	 */
	opportunityId: string | Expression<string>;
};

/** Represents an opportunity, which is a sale or pending deal */
export type SalesforceV1OpportunityGetAllConfig = {
	resource: 'opportunity';
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
	options?: Record<string, unknown>;
};

/** Represents an opportunity, which is a sale or pending deal */
export type SalesforceV1OpportunityGetSummaryConfig = {
	resource: 'opportunity';
	operation: 'getSummary';
};

/** Represents an opportunity, which is a sale or pending deal */
export type SalesforceV1OpportunityUpdateConfig = {
	resource: 'opportunity';
	operation: 'update';
	/**
	 * ID of opportunity that needs to be fetched
	 */
	opportunityId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Search records */
export type SalesforceV1SearchQueryConfig = {
	resource: 'search';
	operation: 'query';
	/**
	 * A SOQL query. An example query parameter string might look like: “SELECT+Name+FROM+MyObject”. If the SOQL query string is invalid, a MALFORMED_QUERY response is returned.
	 */
	query: string | Expression<string>;
};

/** Represents a business activity such as making a phone call or other to-do items. In the user interface, and records are collectively referred to as activities. */
export type SalesforceV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	/**
	 * The current status of the task, such as In Progress or Completed. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	status: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Represents a business activity such as making a phone call or other to-do items. In the user interface, and records are collectively referred to as activities. */
export type SalesforceV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	/**
	 * ID of task that needs to be fetched
	 */
	taskId: string | Expression<string>;
};

/** Represents a business activity such as making a phone call or other to-do items. In the user interface, and records are collectively referred to as activities. */
export type SalesforceV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	/**
	 * ID of task that needs to be fetched
	 */
	taskId: string | Expression<string>;
};

/** Represents a business activity such as making a phone call or other to-do items. In the user interface, and records are collectively referred to as activities. */
export type SalesforceV1TaskGetAllConfig = {
	resource: 'task';
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
	options?: Record<string, unknown>;
};

/** Represents a business activity such as making a phone call or other to-do items. In the user interface, and records are collectively referred to as activities. */
export type SalesforceV1TaskGetSummaryConfig = {
	resource: 'task';
	operation: 'getSummary';
};

/** Represents a business activity such as making a phone call or other to-do items. In the user interface, and records are collectively referred to as activities. */
export type SalesforceV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	/**
	 * ID of task that needs to be fetched
	 */
	taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Represents a person, which is one user in system */
export type SalesforceV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	/**
	 * ID of user that needs to be fetched
	 */
	userId: string | Expression<string>;
};

/** Represents a person, which is one user in system */
export type SalesforceV1UserGetAllConfig = {
	resource: 'user';
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
	options?: Record<string, unknown>;
};

export type SalesforceV1Params =
	| SalesforceV1AccountAddNoteConfig
	| SalesforceV1AccountCreateConfig
	| SalesforceV1AccountUpsertConfig
	| SalesforceV1AccountDeleteConfig
	| SalesforceV1AccountGetConfig
	| SalesforceV1AccountGetAllConfig
	| SalesforceV1AccountGetSummaryConfig
	| SalesforceV1AccountUpdateConfig
	| SalesforceV1AttachmentCreateConfig
	| SalesforceV1AttachmentDeleteConfig
	| SalesforceV1AttachmentGetConfig
	| SalesforceV1AttachmentGetAllConfig
	| SalesforceV1AttachmentGetSummaryConfig
	| SalesforceV1AttachmentUpdateConfig
	| SalesforceV1CaseAddCommentConfig
	| SalesforceV1CaseCreateConfig
	| SalesforceV1CaseDeleteConfig
	| SalesforceV1CaseGetConfig
	| SalesforceV1CaseGetAllConfig
	| SalesforceV1CaseGetSummaryConfig
	| SalesforceV1CaseUpdateConfig
	| SalesforceV1ContactAddToCampaignConfig
	| SalesforceV1ContactAddNoteConfig
	| SalesforceV1ContactCreateConfig
	| SalesforceV1ContactUpsertConfig
	| SalesforceV1ContactDeleteConfig
	| SalesforceV1ContactGetConfig
	| SalesforceV1ContactGetAllConfig
	| SalesforceV1ContactGetSummaryConfig
	| SalesforceV1ContactUpdateConfig
	| SalesforceV1CustomObjectCreateConfig
	| SalesforceV1CustomObjectUpsertConfig
	| SalesforceV1CustomObjectDeleteConfig
	| SalesforceV1CustomObjectGetConfig
	| SalesforceV1CustomObjectGetAllConfig
	| SalesforceV1CustomObjectUpdateConfig
	| SalesforceV1DocumentUploadConfig
	| SalesforceV1FlowGetAllConfig
	| SalesforceV1FlowInvokeConfig
	| SalesforceV1LeadAddToCampaignConfig
	| SalesforceV1LeadAddNoteConfig
	| SalesforceV1LeadCreateConfig
	| SalesforceV1LeadUpsertConfig
	| SalesforceV1LeadDeleteConfig
	| SalesforceV1LeadGetConfig
	| SalesforceV1LeadGetAllConfig
	| SalesforceV1LeadGetSummaryConfig
	| SalesforceV1LeadUpdateConfig
	| SalesforceV1OpportunityAddNoteConfig
	| SalesforceV1OpportunityCreateConfig
	| SalesforceV1OpportunityUpsertConfig
	| SalesforceV1OpportunityDeleteConfig
	| SalesforceV1OpportunityGetConfig
	| SalesforceV1OpportunityGetAllConfig
	| SalesforceV1OpportunityGetSummaryConfig
	| SalesforceV1OpportunityUpdateConfig
	| SalesforceV1SearchQueryConfig
	| SalesforceV1TaskCreateConfig
	| SalesforceV1TaskDeleteConfig
	| SalesforceV1TaskGetConfig
	| SalesforceV1TaskGetAllConfig
	| SalesforceV1TaskGetSummaryConfig
	| SalesforceV1TaskUpdateConfig
	| SalesforceV1UserGetConfig
	| SalesforceV1UserGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SalesforceV1Credentials {
	salesforceOAuth2Api: CredentialReference;
	salesforceJwtApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type SalesforceNode = {
	type: 'n8n-nodes-base.salesforce';
	version: 1;
	config: NodeConfig<SalesforceV1Params>;
	credentials?: SalesforceV1Credentials;
};
