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
// Node Types
// ===========================================================================

export type SalesforceV1Node = {
	type: 'n8n-nodes-base.salesforce';
	version: 1;
	config: NodeConfig<SalesforceV1Params>;
	credentials?: SalesforceV1Credentials;
};

export type SalesforceNode = SalesforceV1Node;
