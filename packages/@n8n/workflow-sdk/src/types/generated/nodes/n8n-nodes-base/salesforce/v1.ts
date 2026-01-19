/**
 * Salesforce Node - Version 1
 * Consume Salesforce API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Represents an individual account, which is an organization or person involved with your business (such as customers, competitors, and partners) */
export type SalesforceV1AccountAddNoteConfig = {
	resource: 'account';
	operation: 'addNote';
/**
 * ID of account that needs to be fetched
 * @displayOptions.show { resource: ["account"], operation: ["addNote"] }
 */
		accountId: string | Expression<string>;
/**
 * Title of the note
 * @displayOptions.show { resource: ["account"], operation: ["addNote"] }
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
 * @displayOptions.show { resource: ["account"], operation: ["create", "upsert"] }
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
 * @displayOptions.show { resource: ["account"], operation: ["upsert"] }
 */
		externalId: string | Expression<string>;
/**
 * If this value exists in the 'match against' field, update the account. Otherwise create a new one.
 * @displayOptions.show { resource: ["account"], operation: ["upsert"] }
 */
		externalIdValue: string | Expression<string>;
/**
 * Name of the account. Maximum size is 255 characters.
 * @displayOptions.show { resource: ["account"], operation: ["create", "upsert"] }
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
 * @displayOptions.show { resource: ["account"], operation: ["delete"] }
 */
		accountId: string | Expression<string>;
};

/** Represents an individual account, which is an organization or person involved with your business (such as customers, competitors, and partners) */
export type SalesforceV1AccountGetConfig = {
	resource: 'account';
	operation: 'get';
/**
 * ID of account that needs to be fetched
 * @displayOptions.show { resource: ["account"], operation: ["get"] }
 */
		accountId: string | Expression<string>;
};

/** Represents an individual account, which is an organization or person involved with your business (such as customers, competitors, and partners) */
export type SalesforceV1AccountGetAllConfig = {
	resource: 'account';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["account"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["account"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["account"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["attachment"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["attachment"], operation: ["delete"] }
 */
		attachmentId: string | Expression<string>;
};

/** Represents a file that a has uploaded and attached to a parent object */
export type SalesforceV1AttachmentGetConfig = {
	resource: 'attachment';
	operation: 'get';
/**
 * ID of attachment that needs to be fetched
 * @displayOptions.show { resource: ["attachment"], operation: ["get"] }
 */
		attachmentId: string | Expression<string>;
};

/** Represents a file that a has uploaded and attached to a parent object */
export type SalesforceV1AttachmentGetAllConfig = {
	resource: 'attachment';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["attachment"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["attachment"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["attachment"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["case"], operation: ["addComment"] }
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
 * @displayOptions.show { resource: ["case"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["case"], operation: ["delete"] }
 */
		caseId: string | Expression<string>;
};

/** Represents a case, which is a customer issue or problem */
export type SalesforceV1CaseGetConfig = {
	resource: 'case';
	operation: 'get';
/**
 * ID of case that needs to be fetched
 * @displayOptions.show { resource: ["case"], operation: ["get"] }
 */
		caseId: string | Expression<string>;
};

/** Represents a case, which is a customer issue or problem */
export type SalesforceV1CaseGetAllConfig = {
	resource: 'case';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["case"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["case"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["case"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["contact"], operation: ["addToCampaign"] }
 */
		contactId: string | Expression<string>;
/**
 * ID of the campaign that needs to be fetched. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["contact"], operation: ["addToCampaign"] }
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
 * @displayOptions.show { resource: ["contact"], operation: ["addNote"] }
 */
		contactId: string | Expression<string>;
/**
 * Title of the note
 * @displayOptions.show { resource: ["contact"], operation: ["addNote"] }
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
 * @displayOptions.show { resource: ["contact"], operation: ["create", "upsert"] }
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
 * @displayOptions.show { resource: ["contact"], operation: ["upsert"] }
 */
		externalId: string | Expression<string>;
/**
 * If this value exists in the 'match against' field, update the contact. Otherwise create a new one.
 * @displayOptions.show { resource: ["contact"], operation: ["upsert"] }
 */
		externalIdValue: string | Expression<string>;
/**
 * Required. Last name of the contact. Limited to 80 characters.
 * @displayOptions.show { resource: ["contact"], operation: ["create", "upsert"] }
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
 * @displayOptions.show { resource: ["contact"], operation: ["delete"] }
 */
		contactId: string | Expression<string>;
};

/** Represents a contact, which is an individual associated with an account */
export type SalesforceV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
/**
 * ID of contact that needs to be fetched
 * @displayOptions.show { resource: ["contact"], operation: ["get"] }
 */
		contactId: string | Expression<string>;
};

/** Represents a contact, which is an individual associated with an account */
export type SalesforceV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["contact"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["customObject"], operation: ["create", "upsert"] }
 */
		customObject: string | Expression<string>;
/**
 * Filter by custom fields
 * @displayOptions.show { resource: ["customObject"], operation: ["create", "upsert"] }
 * @default {}
 */
		customFieldsUi?: {
		customFieldsValues?: Array<{
			/** The ID of the field. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			fieldId?: string | Expression<string>;
			/** The value to set on custom field
			 */
			value?: string | Expression<string>;
		}>;
	};
	additionalFields?: Record<string, unknown>;
};

/** Represents a custom object */
export type SalesforceV1CustomObjectUpsertConfig = {
	resource: 'customObject';
	operation: 'upsert';
/**
 * Name of the custom object. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["customObject"], operation: ["create", "upsert"] }
 */
		customObject: string | Expression<string>;
/**
 * The field to check to see if the object already exists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["customObject"], operation: ["upsert"] }
 */
		externalId: string | Expression<string>;
/**
 * If this value exists in the 'match against' field, update the object. Otherwise create a new one.
 * @displayOptions.show { resource: ["customObject"], operation: ["upsert"] }
 */
		externalIdValue: string | Expression<string>;
/**
 * Filter by custom fields
 * @displayOptions.show { resource: ["customObject"], operation: ["create", "upsert"] }
 * @default {}
 */
		customFieldsUi?: {
		customFieldsValues?: Array<{
			/** The ID of the field. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			fieldId?: string | Expression<string>;
			/** The value to set on custom field
			 */
			value?: string | Expression<string>;
		}>;
	};
	additionalFields?: Record<string, unknown>;
};

/** Represents a custom object */
export type SalesforceV1CustomObjectDeleteConfig = {
	resource: 'customObject';
	operation: 'delete';
/**
 * Name of the custom object. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["customObject"], operation: ["delete"] }
 */
		customObject: string | Expression<string>;
/**
 * Record ID to be deleted
 * @displayOptions.show { resource: ["customObject"], operation: ["delete"] }
 */
		recordId: string | Expression<string>;
};

/** Represents a custom object */
export type SalesforceV1CustomObjectGetConfig = {
	resource: 'customObject';
	operation: 'get';
/**
 * Name of the custom object. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["customObject"], operation: ["get"] }
 */
		customObject: string | Expression<string>;
/**
 * Record ID to be retrieved
 * @displayOptions.show { resource: ["customObject"], operation: ["get"] }
 */
		recordId: string | Expression<string>;
};

/** Represents a custom object */
export type SalesforceV1CustomObjectGetAllConfig = {
	resource: 'customObject';
	operation: 'getAll';
/**
 * Name of the custom object. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["customObject"], operation: ["getAll"] }
 */
		customObject: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["customObject"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["customObject"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["customObject"], operation: ["update"] }
 */
		customObject: string | Expression<string>;
/**
 * Record ID to be updated
 * @displayOptions.show { resource: ["customObject"], operation: ["update"] }
 */
		recordId: string | Expression<string>;
/**
 * Filter by custom fields
 * @displayOptions.show { resource: ["customObject"], operation: ["update"] }
 * @default {}
 */
		customFieldsUi?: {
		customFieldsValues?: Array<{
			/** The ID of the field. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			fieldId?: string | Expression<string>;
			/** The value to set on custom field
			 */
			value?: string | Expression<string>;
		}>;
	};
	updateFields?: Record<string, unknown>;
};

/** Represents a document */
export type SalesforceV1DocumentUploadConfig = {
	resource: 'document';
	operation: 'upload';
/**
 * Name of the file
 * @displayOptions.show { resource: ["document"], operation: ["upload"] }
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
 * @displayOptions.show { operation: ["getAll"], resource: ["flow"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["flow"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["flow"], operation: ["invoke"] }
 */
		apiName: string | Expression<string>;
/**
 * Whether the input variables should be set via the value-key pair UI or JSON/RAW
 * @displayOptions.show { resource: ["flow"], operation: ["invoke"] }
 * @default false
 */
		jsonParameters?: boolean | Expression<boolean>;
/**
 * Input variables as JSON object
 * @displayOptions.show { resource: ["flow"], operation: ["invoke"], jsonParameters: [true] }
 */
		variablesJson?: IDataObject | string | Expression<string>;
/**
 * The input variable to send
 * @displayOptions.show { resource: ["flow"], operation: ["invoke"], jsonParameters: [false] }
 * @default {}
 */
		variablesUi?: {
		variablesValues?: Array<{
			/** Name of the input variable
			 */
			name?: string | Expression<string>;
			/** Value of the input variable
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Represents a prospect or potential */
export type SalesforceV1LeadAddToCampaignConfig = {
	resource: 'lead';
	operation: 'addToCampaign';
/**
 * ID of contact that needs to be fetched
 * @displayOptions.show { resource: ["lead"], operation: ["addToCampaign"] }
 */
		leadId: string | Expression<string>;
/**
 * ID of the campaign that needs to be fetched. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["lead"], operation: ["addToCampaign"] }
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
 * @displayOptions.show { resource: ["lead"], operation: ["addNote"] }
 */
		leadId: string | Expression<string>;
/**
 * Title of the note
 * @displayOptions.show { resource: ["lead"], operation: ["addNote"] }
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
 * @displayOptions.show { resource: ["lead"], operation: ["create", "upsert"] }
 */
		company: string | Expression<string>;
/**
 * Required. Last name of the lead. Limited to 80 characters.
 * @displayOptions.show { resource: ["lead"], operation: ["create", "upsert"] }
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
 * @displayOptions.show { resource: ["lead"], operation: ["upsert"] }
 */
		externalId: string | Expression<string>;
/**
 * If this value exists in the 'match against' field, update the lead. Otherwise create a new one.
 * @displayOptions.show { resource: ["lead"], operation: ["upsert"] }
 */
		externalIdValue: string | Expression<string>;
/**
 * Company of the lead. If person account record types have been enabled, and if the value of Company is null, the lead converts to a person account.
 * @displayOptions.show { resource: ["lead"], operation: ["create", "upsert"] }
 */
		company: string | Expression<string>;
/**
 * Required. Last name of the lead. Limited to 80 characters.
 * @displayOptions.show { resource: ["lead"], operation: ["create", "upsert"] }
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
 * @displayOptions.show { resource: ["lead"], operation: ["delete"] }
 */
		leadId: string | Expression<string>;
};

/** Represents a prospect or potential */
export type SalesforceV1LeadGetConfig = {
	resource: 'lead';
	operation: 'get';
/**
 * ID of Lead that needs to be fetched
 * @displayOptions.show { resource: ["lead"], operation: ["get"] }
 */
		leadId: string | Expression<string>;
};

/** Represents a prospect or potential */
export type SalesforceV1LeadGetAllConfig = {
	resource: 'lead';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["lead"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["lead"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["lead"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["opportunity"], operation: ["addNote"] }
 */
		opportunityId: string | Expression<string>;
/**
 * Title of the note
 * @displayOptions.show { resource: ["opportunity"], operation: ["addNote"] }
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
 * @displayOptions.show { resource: ["opportunity"], operation: ["create", "upsert"] }
 */
		name: string | Expression<string>;
/**
 * Required. Date when the opportunity is expected to close.
 * @displayOptions.show { resource: ["opportunity"], operation: ["create", "upsert"] }
 */
		closeDate: string | Expression<string>;
/**
 * Required. Date when the opportunity is expected to close. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["opportunity"], operation: ["create", "upsert"] }
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
 * @displayOptions.show { resource: ["opportunity"], operation: ["upsert"] }
 */
		externalId: string | Expression<string>;
/**
 * If this value exists in the 'match against' field, update the opportunity. Otherwise create a new one.
 * @displayOptions.show { resource: ["opportunity"], operation: ["upsert"] }
 */
		externalIdValue: string | Expression<string>;
/**
 * Required. Last name of the opportunity. Limited to 80 characters.
 * @displayOptions.show { resource: ["opportunity"], operation: ["create", "upsert"] }
 */
		name: string | Expression<string>;
/**
 * Required. Date when the opportunity is expected to close.
 * @displayOptions.show { resource: ["opportunity"], operation: ["create", "upsert"] }
 */
		closeDate: string | Expression<string>;
/**
 * Required. Date when the opportunity is expected to close. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["opportunity"], operation: ["create", "upsert"] }
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
 * @displayOptions.show { resource: ["opportunity"], operation: ["delete"] }
 */
		opportunityId: string | Expression<string>;
};

/** Represents an opportunity, which is a sale or pending deal */
export type SalesforceV1OpportunityGetConfig = {
	resource: 'opportunity';
	operation: 'get';
/**
 * ID of opportunity that needs to be fetched
 * @displayOptions.show { resource: ["opportunity"], operation: ["get"] }
 */
		opportunityId: string | Expression<string>;
};

/** Represents an opportunity, which is a sale or pending deal */
export type SalesforceV1OpportunityGetAllConfig = {
	resource: 'opportunity';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["opportunity"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["opportunity"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["opportunity"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["search"], operation: ["query"] }
 */
		query: string | Expression<string>;
};

/** Represents a business activity such as making a phone call or other to-do items. In the user interface, and records are collectively referred to as activities. */
export type SalesforceV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
/**
 * The current status of the task, such as In Progress or Completed. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["task"], operation: ["delete"] }
 */
		taskId: string | Expression<string>;
};

/** Represents a business activity such as making a phone call or other to-do items. In the user interface, and records are collectively referred to as activities. */
export type SalesforceV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
/**
 * ID of task that needs to be fetched
 * @displayOptions.show { resource: ["task"], operation: ["get"] }
 */
		taskId: string | Expression<string>;
};

/** Represents a business activity such as making a phone call or other to-do items. In the user interface, and records are collectively referred to as activities. */
export type SalesforceV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["task"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["task"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 */
		userId: string | Expression<string>;
};

/** Represents a person, which is one user in system */
export type SalesforceV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type SalesforceV1AccountCreateOutput = {
	id?: string;
	success?: boolean;
};

export type SalesforceV1AccountDeleteOutput = {
	success?: boolean;
};

export type SalesforceV1AccountGetOutput = {
	attributes?: {
		type?: string;
		url?: string;
	};
	BillingAddress?: {
		geocodeAccuracy?: null;
	};
	BillingGeocodeAccuracy?: null;
	CreatedById?: string;
	CreatedDate?: string;
	error?: string;
	Id?: string;
	IsDeleted?: boolean;
	Jigsaw?: null;
	JigsawCompanyId?: null;
	LastModifiedById?: string;
	LastModifiedDate?: string;
	MasterRecordId?: null;
	Name?: string;
	OwnerId?: string;
	ShippingGeocodeAccuracy?: null;
	SicDesc?: null;
	SystemModstamp?: string;
};

export type SalesforceV1AccountGetAllOutput = {
	attributes?: {
		type?: string;
		url?: string;
	};
	Id?: string;
	Name?: string;
};

export type SalesforceV1AccountUpdateOutput = {
	success?: boolean;
};

export type SalesforceV1AttachmentGetAllOutput = {
	attributes?: {
		type?: string;
		url?: string;
	};
	Id?: string;
	Name?: string;
};

export type SalesforceV1CaseCreateOutput = {
	id?: string;
	success?: boolean;
};

export type SalesforceV1CaseGetOutput = {
	AssetId?: null;
	attributes?: {
		type?: string;
		url?: string;
	};
	BusinessHoursId?: string;
	CaseNumber?: string;
	Comments?: null;
	CreatedById?: string;
	CreatedDate?: string;
	Id?: string;
	IsClosed?: boolean;
	IsDeleted?: boolean;
	IsEscalated?: boolean;
	Language?: null;
	LastModifiedById?: string;
	LastModifiedDate?: string;
	MasterRecordId?: null;
	OwnerId?: string;
	RecordTypeId?: string;
	Status?: string;
	SystemModstamp?: string;
};

export type SalesforceV1CaseGetAllOutput = {
	attributes?: {
		type?: string;
		url?: string;
	};
	Id?: string;
	OwnerId?: string;
	Status?: string;
};

export type SalesforceV1CaseUpdateOutput = {
	success?: boolean;
};

export type SalesforceV1ContactAddToCampaignOutput = {
	error?: string;
};

export type SalesforceV1ContactCreateOutput = {
	id?: string;
	success?: boolean;
};

export type SalesforceV1ContactUpsertOutput = {
	created?: boolean;
	id?: string;
	success?: boolean;
};

export type SalesforceV1ContactDeleteOutput = {
	success?: boolean;
};

export type SalesforceV1ContactGetOutput = {
	attributes?: {
		type?: string;
		url?: string;
	};
	CreatedById?: string;
	CreatedDate?: string;
	HomePhone?: null;
	Id?: string;
	IsDeleted?: boolean;
	IsEmailBounced?: boolean;
	IsPriorityRecord?: boolean;
	Jigsaw?: null;
	JigsawContactId?: null;
	LastCURequestDate?: null;
	LastCUUpdateDate?: null;
	LastModifiedById?: string;
	LastModifiedDate?: string;
	LastName?: string;
	MasterRecordId?: null;
	MiddleName?: null;
	Name?: string;
	OtherPhone?: null;
	OwnerId?: string;
	Suffix?: null;
	SystemModstamp?: string;
};

export type SalesforceV1ContactGetAllOutput = {
	attributes?: {
		type?: string;
		url?: string;
	};
	Id?: string;
	LastName?: string;
};

export type SalesforceV1ContactUpdateOutput = {
	success?: boolean;
};

export type SalesforceV1CustomObjectCreateOutput = {
	id?: string;
	success?: boolean;
};

export type SalesforceV1CustomObjectUpsertOutput = {
	created?: boolean;
	id?: string;
	success?: boolean;
};

export type SalesforceV1CustomObjectDeleteOutput = {
	success?: boolean;
};

export type SalesforceV1CustomObjectGetOutput = {
	attributes?: {
		type?: string;
		url?: string;
	};
	CreatedById?: string;
	CreatedDate?: string;
	CurrencyIsoCode?: string;
	Id?: string;
	IsDeleted?: boolean;
	LastModifiedById?: string;
	LastModifiedDate?: string;
	Name?: string;
	OwnerId?: string;
	SystemModstamp?: string;
};

export type SalesforceV1CustomObjectGetAllOutput = {
	attributes?: {
		type?: string;
		url?: string;
	};
	Id?: string;
};

export type SalesforceV1CustomObjectUpdateOutput = {
	success?: boolean;
};

export type SalesforceV1DocumentUploadOutput = {
	id?: string;
	success?: boolean;
};

export type SalesforceV1FlowGetAllOutput = {
	label?: string;
	name?: string;
	type?: string;
	url?: string;
};

export type SalesforceV1FlowInvokeOutput = {
	actionName?: string;
	errors?: null;
	invocationId?: null;
	isSuccess?: boolean;
	outcome?: null;
	outputValues?: {
		Flow__InterviewGuid?: string;
		Flow__InterviewStatus?: string;
		projects?: Array<{
			attributes?: {
				type?: string;
				url?: string;
			};
			CreatedById?: string;
			CreatedDate?: string;
			Id?: string;
			IsDeleted?: boolean;
			LastActivityDate?: null;
			LastModifiedById?: string;
			LastModifiedDate?: string;
			LastReferencedDate?: string;
			LastViewedDate?: string;
			Name?: string;
			OwnerId?: string;
			Projectcloseddate__c?: string;
			Projectcreateddate__c?: null;
			Projectdescription__c?: null;
			Projectduedate__c?: null;
			Projectlink__c?: null;
			Projectmanager__c?: null;
			Projectpriority__c?: null;
			Projectstatus__c?: null;
			Projecttitle__c?: string;
			SystemModstamp?: string;
		}>;
	};
	sortOrder?: number;
	version?: number;
};

export type SalesforceV1LeadAddToCampaignOutput = {
	id?: string;
	success?: boolean;
};

export type SalesforceV1LeadAddNoteOutput = {
	id?: string;
	success?: boolean;
};

export type SalesforceV1LeadCreateOutput = {
	id?: string;
	success?: boolean;
};

export type SalesforceV1LeadUpsertOutput = {
	created?: boolean;
	id?: string;
	success?: boolean;
};

export type SalesforceV1LeadGetOutput = {
	attributes?: {
		type?: string;
		url?: string;
	};
	CreatedById?: string;
	CreatedDate?: string;
	EmailBouncedDate?: null;
	EmailBouncedReason?: null;
	GeocodeAccuracy?: null;
	HasOptedOutOfEmail?: boolean;
	Id?: string;
	IndividualId?: null;
	IsConverted?: boolean;
	IsDeleted?: boolean;
	IsPriorityRecord?: boolean;
	IsUnreadByOwner?: boolean;
	Jigsaw?: null;
	JigsawContactId?: null;
	LastModifiedById?: string;
	LastModifiedDate?: string;
	LastName?: string;
	Latitude?: null;
	Longitude?: null;
	MasterRecordId?: null;
	Name?: string;
	OwnerId?: string;
	Status?: string;
	Suffix?: null;
	SystemModstamp?: string;
};

export type SalesforceV1LeadGetAllOutput = {
	attributes?: {
		type?: string;
		url?: string;
	};
	Id?: string;
	Status?: string;
};

export type SalesforceV1LeadUpdateOutput = {
	success?: boolean;
};

export type SalesforceV1OpportunityCreateOutput = {
	id?: string;
	success?: boolean;
};

export type SalesforceV1OpportunityGetOutput = {
	AccountId?: string;
	attributes?: {
		type?: string;
		url?: string;
	};
	CloseDate?: string;
	CreatedById?: string;
	CreatedDate?: string;
	Fiscal?: string;
	FiscalQuarter?: number;
	FiscalYear?: number;
	ForecastCategory?: string;
	ForecastCategoryName?: string;
	HasOpenActivity?: boolean;
	HasOpportunityLineItem?: boolean;
	HasOverdueTask?: boolean;
	Id?: string;
	IsClosed?: boolean;
	IsDeleted?: boolean;
	IsWon?: boolean;
	LastModifiedById?: string;
	LastModifiedDate?: string;
	Name?: string;
	OwnerId?: string;
	Probability?: number;
	PushCount?: number;
	StageName?: string;
	SystemModstamp?: string;
};

export type SalesforceV1OpportunityGetAllOutput = {
	attributes?: {
		type?: string;
		url?: string;
	};
	Id?: string;
	Name?: string;
};

export type SalesforceV1OpportunityGetSummaryOutput = {
	objectDescribe?: {
		activateable?: boolean;
		associateEntityType?: null;
		associateParentEntity?: null;
		createable?: boolean;
		custom?: boolean;
		customSetting?: boolean;
		deepCloneable?: boolean;
		deletable?: boolean;
		deprecatedAndHidden?: boolean;
		feedEnabled?: boolean;
		hasSubtypes?: boolean;
		isInterface?: boolean;
		isSubtype?: boolean;
		keyPrefix?: string;
		label?: string;
		labelPlural?: string;
		layoutable?: boolean;
		mergeable?: boolean;
		mruEnabled?: boolean;
		name?: string;
		queryable?: boolean;
		replicateable?: boolean;
		retrieveable?: boolean;
		searchable?: boolean;
		triggerable?: boolean;
		undeletable?: boolean;
		updateable?: boolean;
		urls?: {
			approvalLayouts?: string;
			compactLayouts?: string;
			describe?: string;
			layouts?: string;
			listviews?: string;
			quickActions?: string;
			rowTemplate?: string;
			sobject?: string;
		};
	};
	recentItems?: Array<{
		attributes?: {
			type?: string;
			url?: string;
		};
		Id?: string;
		Name?: string;
	}>;
};

export type SalesforceV1OpportunityUpdateOutput = {
	success?: boolean;
};

export type SalesforceV1SearchQueryOutput = {
	attributes?: {
		type?: string;
		url?: string;
	};
	Id?: string;
};

export type SalesforceV1TaskCreateOutput = {
	id?: string;
	success?: boolean;
};

export type SalesforceV1TaskGetOutput = {
	attributes?: {
		type?: string;
		url?: string;
	};
	CallDisposition?: null;
	CallObject?: null;
	CreatedById?: string;
	CreatedDate?: string;
	Id?: string;
	IsArchived?: boolean;
	IsClosed?: boolean;
	IsDeleted?: boolean;
	IsHighPriority?: boolean;
	IsRecurrence?: boolean;
	IsReminderSet?: boolean;
	LastModifiedById?: string;
	LastModifiedDate?: string;
	OwnerId?: string;
	Priority?: string;
	RecurrenceDayOfMonth?: null;
	RecurrenceInstance?: null;
	RecurrenceMonthOfYear?: null;
	RecurrenceRegeneratedType?: null;
	Status?: string;
	SystemModstamp?: string;
	TaskSubtype?: string;
};

export type SalesforceV1TaskGetAllOutput = {
	attributes?: {
		type?: string;
		url?: string;
	};
	Id?: string;
};

export type SalesforceV1TaskUpdateOutput = {
	success?: boolean;
};

export type SalesforceV1UserGetAllOutput = {
	attributes?: {
		type?: string;
		url?: string;
	};
	Email?: string;
	Id?: string;
	Name?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface SalesforceV1Credentials {
	salesforceOAuth2Api: CredentialReference;
	salesforceJwtApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface SalesforceV1NodeBase {
	type: 'n8n-nodes-base.salesforce';
	version: 1;
	credentials?: SalesforceV1Credentials;
}

export type SalesforceV1AccountAddNoteNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1AccountAddNoteConfig>;
};

export type SalesforceV1AccountCreateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1AccountCreateConfig>;
	output?: SalesforceV1AccountCreateOutput;
};

export type SalesforceV1AccountUpsertNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1AccountUpsertConfig>;
};

export type SalesforceV1AccountDeleteNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1AccountDeleteConfig>;
	output?: SalesforceV1AccountDeleteOutput;
};

export type SalesforceV1AccountGetNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1AccountGetConfig>;
	output?: SalesforceV1AccountGetOutput;
};

export type SalesforceV1AccountGetAllNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1AccountGetAllConfig>;
	output?: SalesforceV1AccountGetAllOutput;
};

export type SalesforceV1AccountGetSummaryNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1AccountGetSummaryConfig>;
};

export type SalesforceV1AccountUpdateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1AccountUpdateConfig>;
	output?: SalesforceV1AccountUpdateOutput;
};

export type SalesforceV1AttachmentCreateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1AttachmentCreateConfig>;
};

export type SalesforceV1AttachmentDeleteNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1AttachmentDeleteConfig>;
};

export type SalesforceV1AttachmentGetNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1AttachmentGetConfig>;
};

export type SalesforceV1AttachmentGetAllNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1AttachmentGetAllConfig>;
	output?: SalesforceV1AttachmentGetAllOutput;
};

export type SalesforceV1AttachmentGetSummaryNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1AttachmentGetSummaryConfig>;
};

export type SalesforceV1AttachmentUpdateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1AttachmentUpdateConfig>;
};

export type SalesforceV1CaseAddCommentNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1CaseAddCommentConfig>;
};

export type SalesforceV1CaseCreateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1CaseCreateConfig>;
	output?: SalesforceV1CaseCreateOutput;
};

export type SalesforceV1CaseDeleteNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1CaseDeleteConfig>;
};

export type SalesforceV1CaseGetNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1CaseGetConfig>;
	output?: SalesforceV1CaseGetOutput;
};

export type SalesforceV1CaseGetAllNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1CaseGetAllConfig>;
	output?: SalesforceV1CaseGetAllOutput;
};

export type SalesforceV1CaseGetSummaryNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1CaseGetSummaryConfig>;
};

export type SalesforceV1CaseUpdateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1CaseUpdateConfig>;
	output?: SalesforceV1CaseUpdateOutput;
};

export type SalesforceV1ContactAddToCampaignNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1ContactAddToCampaignConfig>;
	output?: SalesforceV1ContactAddToCampaignOutput;
};

export type SalesforceV1ContactAddNoteNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1ContactAddNoteConfig>;
};

export type SalesforceV1ContactCreateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1ContactCreateConfig>;
	output?: SalesforceV1ContactCreateOutput;
};

export type SalesforceV1ContactUpsertNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1ContactUpsertConfig>;
	output?: SalesforceV1ContactUpsertOutput;
};

export type SalesforceV1ContactDeleteNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1ContactDeleteConfig>;
	output?: SalesforceV1ContactDeleteOutput;
};

export type SalesforceV1ContactGetNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1ContactGetConfig>;
	output?: SalesforceV1ContactGetOutput;
};

export type SalesforceV1ContactGetAllNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1ContactGetAllConfig>;
	output?: SalesforceV1ContactGetAllOutput;
};

export type SalesforceV1ContactGetSummaryNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1ContactGetSummaryConfig>;
};

export type SalesforceV1ContactUpdateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1ContactUpdateConfig>;
	output?: SalesforceV1ContactUpdateOutput;
};

export type SalesforceV1CustomObjectCreateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1CustomObjectCreateConfig>;
	output?: SalesforceV1CustomObjectCreateOutput;
};

export type SalesforceV1CustomObjectUpsertNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1CustomObjectUpsertConfig>;
	output?: SalesforceV1CustomObjectUpsertOutput;
};

export type SalesforceV1CustomObjectDeleteNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1CustomObjectDeleteConfig>;
	output?: SalesforceV1CustomObjectDeleteOutput;
};

export type SalesforceV1CustomObjectGetNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1CustomObjectGetConfig>;
	output?: SalesforceV1CustomObjectGetOutput;
};

export type SalesforceV1CustomObjectGetAllNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1CustomObjectGetAllConfig>;
	output?: SalesforceV1CustomObjectGetAllOutput;
};

export type SalesforceV1CustomObjectUpdateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1CustomObjectUpdateConfig>;
	output?: SalesforceV1CustomObjectUpdateOutput;
};

export type SalesforceV1DocumentUploadNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1DocumentUploadConfig>;
	output?: SalesforceV1DocumentUploadOutput;
};

export type SalesforceV1FlowGetAllNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1FlowGetAllConfig>;
	output?: SalesforceV1FlowGetAllOutput;
};

export type SalesforceV1FlowInvokeNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1FlowInvokeConfig>;
	output?: SalesforceV1FlowInvokeOutput;
};

export type SalesforceV1LeadAddToCampaignNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1LeadAddToCampaignConfig>;
	output?: SalesforceV1LeadAddToCampaignOutput;
};

export type SalesforceV1LeadAddNoteNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1LeadAddNoteConfig>;
	output?: SalesforceV1LeadAddNoteOutput;
};

export type SalesforceV1LeadCreateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1LeadCreateConfig>;
	output?: SalesforceV1LeadCreateOutput;
};

export type SalesforceV1LeadUpsertNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1LeadUpsertConfig>;
	output?: SalesforceV1LeadUpsertOutput;
};

export type SalesforceV1LeadDeleteNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1LeadDeleteConfig>;
};

export type SalesforceV1LeadGetNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1LeadGetConfig>;
	output?: SalesforceV1LeadGetOutput;
};

export type SalesforceV1LeadGetAllNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1LeadGetAllConfig>;
	output?: SalesforceV1LeadGetAllOutput;
};

export type SalesforceV1LeadGetSummaryNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1LeadGetSummaryConfig>;
};

export type SalesforceV1LeadUpdateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1LeadUpdateConfig>;
	output?: SalesforceV1LeadUpdateOutput;
};

export type SalesforceV1OpportunityAddNoteNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1OpportunityAddNoteConfig>;
};

export type SalesforceV1OpportunityCreateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1OpportunityCreateConfig>;
	output?: SalesforceV1OpportunityCreateOutput;
};

export type SalesforceV1OpportunityUpsertNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1OpportunityUpsertConfig>;
};

export type SalesforceV1OpportunityDeleteNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1OpportunityDeleteConfig>;
};

export type SalesforceV1OpportunityGetNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1OpportunityGetConfig>;
	output?: SalesforceV1OpportunityGetOutput;
};

export type SalesforceV1OpportunityGetAllNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1OpportunityGetAllConfig>;
	output?: SalesforceV1OpportunityGetAllOutput;
};

export type SalesforceV1OpportunityGetSummaryNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1OpportunityGetSummaryConfig>;
	output?: SalesforceV1OpportunityGetSummaryOutput;
};

export type SalesforceV1OpportunityUpdateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1OpportunityUpdateConfig>;
	output?: SalesforceV1OpportunityUpdateOutput;
};

export type SalesforceV1SearchQueryNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1SearchQueryConfig>;
	output?: SalesforceV1SearchQueryOutput;
};

export type SalesforceV1TaskCreateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1TaskCreateConfig>;
	output?: SalesforceV1TaskCreateOutput;
};

export type SalesforceV1TaskDeleteNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1TaskDeleteConfig>;
};

export type SalesforceV1TaskGetNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1TaskGetConfig>;
	output?: SalesforceV1TaskGetOutput;
};

export type SalesforceV1TaskGetAllNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1TaskGetAllConfig>;
	output?: SalesforceV1TaskGetAllOutput;
};

export type SalesforceV1TaskGetSummaryNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1TaskGetSummaryConfig>;
};

export type SalesforceV1TaskUpdateNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1TaskUpdateConfig>;
	output?: SalesforceV1TaskUpdateOutput;
};

export type SalesforceV1UserGetNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1UserGetConfig>;
};

export type SalesforceV1UserGetAllNode = SalesforceV1NodeBase & {
	config: NodeConfig<SalesforceV1UserGetAllConfig>;
	output?: SalesforceV1UserGetAllOutput;
};

export type SalesforceV1Node =
	| SalesforceV1AccountAddNoteNode
	| SalesforceV1AccountCreateNode
	| SalesforceV1AccountUpsertNode
	| SalesforceV1AccountDeleteNode
	| SalesforceV1AccountGetNode
	| SalesforceV1AccountGetAllNode
	| SalesforceV1AccountGetSummaryNode
	| SalesforceV1AccountUpdateNode
	| SalesforceV1AttachmentCreateNode
	| SalesforceV1AttachmentDeleteNode
	| SalesforceV1AttachmentGetNode
	| SalesforceV1AttachmentGetAllNode
	| SalesforceV1AttachmentGetSummaryNode
	| SalesforceV1AttachmentUpdateNode
	| SalesforceV1CaseAddCommentNode
	| SalesforceV1CaseCreateNode
	| SalesforceV1CaseDeleteNode
	| SalesforceV1CaseGetNode
	| SalesforceV1CaseGetAllNode
	| SalesforceV1CaseGetSummaryNode
	| SalesforceV1CaseUpdateNode
	| SalesforceV1ContactAddToCampaignNode
	| SalesforceV1ContactAddNoteNode
	| SalesforceV1ContactCreateNode
	| SalesforceV1ContactUpsertNode
	| SalesforceV1ContactDeleteNode
	| SalesforceV1ContactGetNode
	| SalesforceV1ContactGetAllNode
	| SalesforceV1ContactGetSummaryNode
	| SalesforceV1ContactUpdateNode
	| SalesforceV1CustomObjectCreateNode
	| SalesforceV1CustomObjectUpsertNode
	| SalesforceV1CustomObjectDeleteNode
	| SalesforceV1CustomObjectGetNode
	| SalesforceV1CustomObjectGetAllNode
	| SalesforceV1CustomObjectUpdateNode
	| SalesforceV1DocumentUploadNode
	| SalesforceV1FlowGetAllNode
	| SalesforceV1FlowInvokeNode
	| SalesforceV1LeadAddToCampaignNode
	| SalesforceV1LeadAddNoteNode
	| SalesforceV1LeadCreateNode
	| SalesforceV1LeadUpsertNode
	| SalesforceV1LeadDeleteNode
	| SalesforceV1LeadGetNode
	| SalesforceV1LeadGetAllNode
	| SalesforceV1LeadGetSummaryNode
	| SalesforceV1LeadUpdateNode
	| SalesforceV1OpportunityAddNoteNode
	| SalesforceV1OpportunityCreateNode
	| SalesforceV1OpportunityUpsertNode
	| SalesforceV1OpportunityDeleteNode
	| SalesforceV1OpportunityGetNode
	| SalesforceV1OpportunityGetAllNode
	| SalesforceV1OpportunityGetSummaryNode
	| SalesforceV1OpportunityUpdateNode
	| SalesforceV1SearchQueryNode
	| SalesforceV1TaskCreateNode
	| SalesforceV1TaskDeleteNode
	| SalesforceV1TaskGetNode
	| SalesforceV1TaskGetAllNode
	| SalesforceV1TaskGetSummaryNode
	| SalesforceV1TaskUpdateNode
	| SalesforceV1UserGetNode
	| SalesforceV1UserGetAllNode
	;