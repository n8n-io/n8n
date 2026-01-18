/**
 * SendGrid Node - Version 1
 * Consume SendGrid API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new contact, or update the current one if it already exists (upsert) */
export type SendGridV1ContactUpsertConfig = {
	resource: 'contact';
	operation: 'upsert';
/**
 * Primary email for the contact
 * @displayOptions.show { operation: ["upsert"], resource: ["contact"] }
 */
		email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a list */
export type SendGridV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
/**
 * ID of the contact. Multiple can be added separated by comma.
 * @displayOptions.show { resource: ["contact"], operation: ["delete"], deleteAll: [false] }
 */
		ids?: string | Expression<string>;
/**
 * Whether all contacts will be deleted
 * @displayOptions.show { resource: ["contact"], operation: ["delete"] }
 * @default false
 */
		deleteAll?: boolean | Expression<boolean>;
};

/** Get a list */
export type SendGridV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
/**
 * Search the user by ID or email
 * @displayOptions.show { operation: ["get"], resource: ["contact"] }
 * @default id
 */
		by: 'id' | 'email' | Expression<string>;
/**
 * ID of the contact
 * @displayOptions.show { operation: ["get"], resource: ["contact"], by: ["id"] }
 */
		contactId: string | Expression<string>;
/**
 * Email of the contact
 * @displayOptions.show { operation: ["get"], resource: ["contact"], by: ["email"] }
 */
		email: string | Expression<string>;
};

/** Get many lists */
export type SendGridV1ContactGetAllConfig = {
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
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Create a list */
export type SendGridV1ListCreateConfig = {
	resource: 'list';
	operation: 'create';
/**
 * Name of the list
 * @displayOptions.show { operation: ["create"], resource: ["list"] }
 */
		name: string | Expression<string>;
};

/** Delete a list */
export type SendGridV1ListDeleteConfig = {
	resource: 'list';
	operation: 'delete';
/**
 * ID of the list
 * @displayOptions.show { operation: ["delete"], resource: ["list"] }
 */
		listId: string | Expression<string>;
/**
 * Whether to delete all contacts on the list
 * @displayOptions.show { operation: ["delete"], resource: ["list"] }
 * @default false
 */
		deleteContacts?: boolean | Expression<boolean>;
};

/** Get a list */
export type SendGridV1ListGetConfig = {
	resource: 'list';
	operation: 'get';
/**
 * ID of the list
 * @displayOptions.show { operation: ["get"], resource: ["list"] }
 */
		listId: string | Expression<string>;
/**
 * Whether to return the contact sample
 * @displayOptions.show { operation: ["get"], resource: ["list"] }
 * @default false
 */
		contactSample?: boolean | Expression<boolean>;
};

/** Get many lists */
export type SendGridV1ListGetAllConfig = {
	resource: 'list';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["list"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["list"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Update a list */
export type SendGridV1ListUpdateConfig = {
	resource: 'list';
	operation: 'update';
/**
 * ID of the list
 * @displayOptions.show { operation: ["update"], resource: ["list"] }
 */
		listId: string | Expression<string>;
/**
 * Name of the list
 * @displayOptions.show { operation: ["update"], resource: ["list"] }
 */
		name: string | Expression<string>;
};

/** Send an email */
export type SendGridV1MailSendConfig = {
	resource: 'mail';
	operation: 'send';
/**
 * Email address of the sender of the email
 * @displayOptions.show { resource: ["mail"], operation: ["send"] }
 */
		fromEmail?: string | Expression<string>;
/**
 * Name of the sender of the email
 * @displayOptions.show { resource: ["mail"], operation: ["send"] }
 */
		fromName?: string | Expression<string>;
/**
 * Comma-separated list of recipient email addresses
 * @displayOptions.show { resource: ["mail"], operation: ["send"] }
 */
		toEmail?: string | Expression<string>;
/**
 * Subject of the email to send
 * @displayOptions.show { resource: ["mail"], operation: ["send"], dynamicTemplate: [false] }
 */
		subject?: string | Expression<string>;
/**
 * Whether this email will contain a dynamic template
 * @displayOptions.show { resource: ["mail"], operation: ["send"] }
 * @default false
 */
		dynamicTemplate: boolean | Expression<boolean>;
/**
 * MIME type of the email to send
 * @displayOptions.show { resource: ["mail"], operation: ["send"], dynamicTemplate: [false] }
 * @default text/plain
 */
		contentType?: 'text/plain' | 'text/html' | Expression<string>;
/**
 * Message body of the email to send
 * @displayOptions.show { resource: ["mail"], operation: ["send"], dynamicTemplate: [false] }
 */
		contentValue: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["mail"], operation: ["send"], dynamicTemplate: [true] }
 * @default []
 */
		templateId?: string | Expression<string>;
	dynamicTemplateFields?: {
		fields?: Array<{
			/** Key of the dynamic template field
			 */
			key?: string | Expression<string>;
			/** Value for the field
			 */
			value?: string | Expression<string>;
		}>;
	};
	additionalFields?: Record<string, unknown>;
};

export type SendGridV1Params =
	| SendGridV1ContactUpsertConfig
	| SendGridV1ContactDeleteConfig
	| SendGridV1ContactGetConfig
	| SendGridV1ContactGetAllConfig
	| SendGridV1ListCreateConfig
	| SendGridV1ListDeleteConfig
	| SendGridV1ListGetConfig
	| SendGridV1ListGetAllConfig
	| SendGridV1ListUpdateConfig
	| SendGridV1MailSendConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SendGridV1Credentials {
	sendGridApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type SendGridV1Node = {
	type: 'n8n-nodes-base.sendGrid';
	version: 1;
	config: NodeConfig<SendGridV1Params>;
	credentials?: SendGridV1Credentials;
};