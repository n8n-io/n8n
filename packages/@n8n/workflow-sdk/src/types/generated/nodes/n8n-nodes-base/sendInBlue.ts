/**
 * Brevo Node Types
 *
 * Consume Brevo API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/sendinblue/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type SendInBlueV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	email?: string | Expression<string>;
	/**
	 * Array of attributes to be added
	 * @default {}
	 */
	createContactAttributes?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1ContactUpsertConfig = {
	resource: 'contact';
	operation: 'upsert';
	/**
	 * Email of the contact
	 */
	email: string | Expression<string>;
	/**
	 * Array of attributes to be updated
	 * @default {}
	 */
	upsertAttributes?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	/**
	 * Email (urlencoded) OR ID of the contact OR its SMS attribute value
	 */
	identifier?: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	/**
	 * Email (urlencoded) OR ID of the contact OR its SMS attribute value
	 */
	identifier: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1ContactGetAllConfig = {
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
	filters?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	/**
	 * Email (urlencoded) OR ID of the contact OR its SMS attribute value
	 */
	identifier: string | Expression<string>;
	/**
	 * Array of attributes to be updated
	 * @default {}
	 */
	updateAttributes?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1AttributeCreateConfig = {
	resource: 'attribute';
	operation: 'create';
	/**
	 * Category of the attribute
	 * @default normal
	 */
	attributeCategory:
		| 'calculated'
		| 'category'
		| 'global'
		| 'normal'
		| 'transactional'
		| Expression<string>;
	/**
	 * Name of the attribute
	 */
	attributeName: string | Expression<string>;
	/**
	 * Attribute Type
	 */
	attributeType: 'boolean' | 'date' | 'float' | 'text' | Expression<string>;
	/**
	 * Value of the attribute
	 */
	attributeValue: string | Expression<string>;
	attributeCategoryList?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1AttributeUpdateConfig = {
	resource: 'attribute';
	operation: 'update';
	/**
	 * Category of the attribute
	 * @default calculated
	 */
	updateAttributeCategory?: 'calculated' | 'category' | 'global' | Expression<string>;
	/**
	 * Name of the existing attribute
	 */
	updateAttributeName?: string | Expression<string>;
	/**
	 * Value of the attribute to update
	 */
	updateAttributeValue?: string | Expression<string>;
	/**
	 * List of the values and labels that the attribute can take
	 * @default {}
	 */
	updateAttributeCategoryList?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1AttributeDeleteConfig = {
	resource: 'attribute';
	operation: 'delete';
	/**
	 * Category of the attribute
	 * @default normal
	 */
	deleteAttributeCategory?:
		| 'calculated'
		| 'category'
		| 'global'
		| 'normal'
		| 'transactional'
		| Expression<string>;
	/**
	 * Name of the attribute
	 */
	deleteAttributeName?: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1AttributeGetAllConfig = {
	resource: 'attribute';
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
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1EmailSendConfig = {
	resource: 'email';
	operation: 'send';
	sendHTML?: boolean | Expression<boolean>;
	/**
	 * Subject of the email
	 */
	subject?: string | Expression<string>;
	/**
	 * Text content of the message
	 */
	textContent?: string | Expression<string>;
	/**
	 * HTML content of the message
	 */
	htmlContent?: string | Expression<string>;
	sender: string | Expression<string>;
	receipients: string | Expression<string>;
	/**
	 * Additional fields to add
	 * @default {}
	 */
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1EmailSendTemplateConfig = {
	resource: 'email';
	operation: 'sendTemplate';
	templateId?: string | Expression<string>;
	receipients: string | Expression<string>;
	/**
	 * Additional fields to add
	 * @default {}
	 */
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1SenderCreateConfig = {
	resource: 'sender';
	operation: 'create';
	/**
	 * Name of the sender
	 */
	name: string | Expression<string>;
	/**
	 * Email of the sender
	 */
	email: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1SenderDeleteConfig = {
	resource: 'sender';
	operation: 'delete';
	/**
	 * ID of the sender to delete
	 */
	id?: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1SenderGetAllConfig = {
	resource: 'sender';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1Params =
	| SendInBlueV1ContactCreateConfig
	| SendInBlueV1ContactUpsertConfig
	| SendInBlueV1ContactDeleteConfig
	| SendInBlueV1ContactGetConfig
	| SendInBlueV1ContactGetAllConfig
	| SendInBlueV1ContactUpdateConfig
	| SendInBlueV1AttributeCreateConfig
	| SendInBlueV1AttributeUpdateConfig
	| SendInBlueV1AttributeDeleteConfig
	| SendInBlueV1AttributeGetAllConfig
	| SendInBlueV1EmailSendConfig
	| SendInBlueV1EmailSendTemplateConfig
	| SendInBlueV1SenderCreateConfig
	| SendInBlueV1SenderDeleteConfig
	| SendInBlueV1SenderGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SendInBlueV1Credentials {
	sendInBlueApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type SendInBlueNode = {
	type: 'n8n-nodes-base.sendInBlue';
	version: 1;
	config: NodeConfig<SendInBlueV1Params>;
	credentials?: SendInBlueV1Credentials;
};
