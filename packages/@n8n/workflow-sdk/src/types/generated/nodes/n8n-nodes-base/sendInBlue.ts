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
	 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
	 * @default {}
	 */
	createContactAttributes?: {
		attributesValues?: Array<{
			/** Field Name
			 */
			fieldName?: string | Expression<string>;
			/** Field Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1ContactUpsertConfig = {
	resource: 'contact';
	operation: 'upsert';
	/**
	 * Email of the contact
	 * @displayOptions.show { resource: ["contact"], operation: ["upsert"] }
	 */
	email: string | Expression<string>;
	/**
	 * Array of attributes to be updated
	 * @displayOptions.show { resource: ["contact"], operation: ["upsert"] }
	 * @default {}
	 */
	upsertAttributes?: {
		upsertAttributesValues?: Array<{
			/** Field Name
			 */
			fieldName?: string | Expression<string>;
			/** Field Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	/**
	 * Email (urlencoded) OR ID of the contact OR its SMS attribute value
	 * @displayOptions.show { resource: ["contact"], operation: ["delete"] }
	 */
	identifier?: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	/**
	 * Email (urlencoded) OR ID of the contact OR its SMS attribute value
	 * @displayOptions.show { resource: ["contact"], operation: ["get"] }
	 */
	identifier: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1ContactGetAllConfig = {
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
	filters?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	/**
	 * Email (urlencoded) OR ID of the contact OR its SMS attribute value
	 * @displayOptions.show { resource: ["contact"], operation: ["update"] }
	 */
	identifier: string | Expression<string>;
	/**
	 * Array of attributes to be updated
	 * @displayOptions.show { resource: ["contact"], operation: ["update"] }
	 * @default {}
	 */
	updateAttributes?: {
		updateAttributesValues?: Array<{
			/** Field Name
			 */
			fieldName?: string | Expression<string>;
			/** Field Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1AttributeCreateConfig = {
	resource: 'attribute';
	operation: 'create';
	/**
	 * Category of the attribute
	 * @displayOptions.show { resource: ["attribute"], operation: ["create"] }
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
	 * @displayOptions.show { resource: ["attribute"], operation: ["create"] }
	 */
	attributeName: string | Expression<string>;
	/**
	 * Attribute Type
	 * @displayOptions.show { resource: ["attribute"], operation: ["create"], attributeCategory: ["normal"] }
	 */
	attributeType: 'boolean' | 'date' | 'float' | 'text' | Expression<string>;
	/**
	 * Value of the attribute
	 * @displayOptions.show { resource: ["attribute"], operation: ["create"], attributeCategory: ["global", "calculated"] }
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
	 * @displayOptions.show { resource: ["attribute"], operation: ["update"] }
	 * @default calculated
	 */
	updateAttributeCategory?: 'calculated' | 'category' | 'global' | Expression<string>;
	/**
	 * Name of the existing attribute
	 * @displayOptions.show { resource: ["attribute"], operation: ["update"] }
	 */
	updateAttributeName?: string | Expression<string>;
	/**
	 * Value of the attribute to update
	 * @displayOptions.show { resource: ["attribute"], operation: ["update"] }
	 * @displayOptions.hide { updateAttributeCategory: ["category"] }
	 */
	updateAttributeValue?: string | Expression<string>;
	/**
	 * List of the values and labels that the attribute can take
	 * @displayOptions.show { resource: ["attribute"], operation: ["update"], updateAttributeCategory: ["category"] }
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
	 * @displayOptions.show { resource: ["attribute"], operation: ["delete"] }
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
	 * @displayOptions.show { resource: ["attribute"], operation: ["delete"] }
	 */
	deleteAttributeName?: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1AttributeGetAllConfig = {
	resource: 'attribute';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["attribute"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["attribute"], operation: ["getAll"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["email"], operation: ["send"] }
	 */
	subject?: string | Expression<string>;
	/**
	 * Text content of the message
	 * @displayOptions.show { resource: ["email"], operation: ["send"], sendHTML: [false] }
	 */
	textContent?: string | Expression<string>;
	/**
	 * HTML content of the message
	 * @displayOptions.show { resource: ["email"], operation: ["send"], sendHTML: [true] }
	 */
	htmlContent?: string | Expression<string>;
	sender: string | Expression<string>;
	receipients: string | Expression<string>;
	/**
	 * Additional fields to add
	 * @displayOptions.show { resource: ["email"], operation: ["send"] }
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
	 * @displayOptions.show { resource: ["email"], operation: ["sendTemplate"] }
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
	 * @displayOptions.show { resource: ["sender"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	/**
	 * Email of the sender
	 * @displayOptions.show { resource: ["sender"], operation: ["create"] }
	 */
	email: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1SenderDeleteConfig = {
	resource: 'sender';
	operation: 'delete';
	/**
	 * ID of the sender to delete
	 * @displayOptions.show { resource: ["sender"], operation: ["delete"] }
	 */
	id?: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type SendInBlueV1SenderGetAllConfig = {
	resource: 'sender';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["sender"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["sender"], operation: ["getAll"], returnAll: [false] }
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
// Node Types
// ===========================================================================

export type SendInBlueV1Node = {
	type: 'n8n-nodes-base.sendInBlue';
	version: 1;
	config: NodeConfig<SendInBlueV1Params>;
	credentials?: SendInBlueV1Credentials;
};

export type SendInBlueNode = SendInBlueV1Node;
