/**
 * Keap Node Types
 *
 * Consume Keap API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/keap/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a company */
export type KeapV1CompanyCreateConfig = {
	resource: 'company';
	operation: 'create';
	companyName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	addressesUi?: {
		addressesValues?: {
			countryCode?: string | Expression<string>;
			line1?: string | Expression<string>;
			line2?: string | Expression<string>;
			locality?: string | Expression<string>;
			postalCode?: string | Expression<string>;
			region?: string | Expression<string>;
			zipCode?: string | Expression<string>;
			zipFour?: string | Expression<string>;
		};
	};
	faxesUi?: {
		faxesValues?: { type?: string | Expression<string>; number?: string | Expression<string> };
	};
	phonesUi?: {
		phonesValues?: Array<{
			type?: string | Expression<string>;
			number?: string | Expression<string>;
		}>;
	};
};

/** Retrieve many companies */
export type KeapV1CompanyGetAllConfig = {
	resource: 'company';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Create a new contact, or update the current one if it already exists (upsert) */
export type KeapV1ContactUpsertConfig = {
	resource: 'contact';
	operation: 'upsert';
	/**
	 * Performs duplicate checking by one of the following options: Email, EmailAndName. If a match is found using the option provided, the existing contact will be updated.
	 * @default email
	 */
	duplicateOption: 'email' | 'emailAndName' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	addressesUi?: {
		addressesValues?: Array<{
			field?: 'BILLING' | 'SHIPPING' | 'OTHER' | Expression<string>;
			countryCode?: string | Expression<string>;
			line1?: string | Expression<string>;
			line2?: string | Expression<string>;
			locality?: string | Expression<string>;
			postalCode?: string | Expression<string>;
			region?: string | Expression<string>;
			zipCode?: string | Expression<string>;
			zipFour?: string | Expression<string>;
		}>;
	};
	emailsUi?: {
		emailsValues?: Array<{
			field?: 'EMAIL1' | 'EMAIL2' | 'EMAIL3' | Expression<string>;
			email?: string | Expression<string>;
		}>;
	};
	faxesUi?: {
		faxesValues?: Array<{
			field?: 'FAX1' | 'FAX2' | Expression<string>;
			number?: string | Expression<string>;
		}>;
	};
	phonesUi?: {
		phonesValues?: Array<{
			field?: 'PHONE1' | 'PHONE2' | 'PHONE3' | 'PHONE4' | 'PHONE5' | Expression<string>;
			number?: string | Expression<string>;
		}>;
	};
	socialAccountsUi?: {
		socialAccountsValues?: Array<{
			type?: 'Facebook' | 'Twitter' | 'LinkedIn' | Expression<string>;
			name?: string | Expression<string>;
		}>;
	};
};

/** Delete an contact */
export type KeapV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	contactId: string | Expression<string>;
};

/** Retrieve an contact */
export type KeapV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	contactId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve many companies */
export type KeapV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Create a company */
export type KeapV1ContactNoteCreateConfig = {
	resource: 'contactNote';
	operation: 'create';
	/**
	 * The infusionsoft user to create the note on behalf of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	userId?: string | Expression<string>;
	contactId?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an contact */
export type KeapV1ContactNoteDeleteConfig = {
	resource: 'contactNote';
	operation: 'delete';
	noteId: string | Expression<string>;
};

/** Retrieve an contact */
export type KeapV1ContactNoteGetConfig = {
	resource: 'contactNote';
	operation: 'get';
	noteId: string | Expression<string>;
};

/** Retrieve many companies */
export type KeapV1ContactNoteGetAllConfig = {
	resource: 'contactNote';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a note */
export type KeapV1ContactNoteUpdateConfig = {
	resource: 'contactNote';
	operation: 'update';
	noteId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a company */
export type KeapV1ContactTagCreateConfig = {
	resource: 'contactTag';
	operation: 'create';
	contactId: string | Expression<string>;
	/**
	 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @default []
	 */
	tagIds: string[];
};

/** Delete an contact */
export type KeapV1ContactTagDeleteConfig = {
	resource: 'contactTag';
	operation: 'delete';
	contactId: string | Expression<string>;
	tagIds: string | Expression<string>;
};

/** Retrieve many companies */
export type KeapV1ContactTagGetAllConfig = {
	resource: 'contactTag';
	operation: 'getAll';
	contactId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Create a company */
export type KeapV1EcommerceOrderCreateConfig = {
	resource: 'ecommerceOrder';
	operation: 'create';
	contactId: string | Expression<string>;
	orderDate: string | Expression<string>;
	orderTitle: string | Expression<string>;
	orderType: 'offline' | 'online' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	addressUi?: {
		addressValues?: {
			company?: string | Expression<string>;
			countryCode?: string | Expression<string>;
			firstName?: string | Expression<string>;
			middleName?: string | Expression<string>;
			lastName?: string | Expression<string>;
			line1?: string | Expression<string>;
			line2?: string | Expression<string>;
			locality?: string | Expression<string>;
			region?: string | Expression<string>;
			zipCode?: string | Expression<string>;
			zipFour?: string | Expression<string>;
			phone?: string | Expression<string>;
		};
	};
	orderItemsUi?: {
		orderItemsValues?: Array<{
			description?: string | Expression<string>;
			price?: number | Expression<number>;
			'product ID'?: number | Expression<number>;
			quantity?: number | Expression<number>;
		}>;
	};
};

/** Retrieve an contact */
export type KeapV1EcommerceOrderGetConfig = {
	resource: 'ecommerceOrder';
	operation: 'get';
	orderId: string | Expression<string>;
};

/** Delete an contact */
export type KeapV1EcommerceOrderDeleteConfig = {
	resource: 'ecommerceOrder';
	operation: 'delete';
	orderId: string | Expression<string>;
};

/** Retrieve many companies */
export type KeapV1EcommerceOrderGetAllConfig = {
	resource: 'ecommerceOrder';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Create a company */
export type KeapV1EcommerceProductCreateConfig = {
	resource: 'ecommerceProduct';
	operation: 'create';
	productName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an contact */
export type KeapV1EcommerceProductDeleteConfig = {
	resource: 'ecommerceProduct';
	operation: 'delete';
	productId: string | Expression<string>;
};

/** Retrieve an contact */
export type KeapV1EcommerceProductGetConfig = {
	resource: 'ecommerceProduct';
	operation: 'get';
	productId: string | Expression<string>;
};

/** Retrieve many companies */
export type KeapV1EcommerceProductGetAllConfig = {
	resource: 'ecommerceProduct';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Create a record of an email sent to a contact */
export type KeapV1EmailCreateRecordConfig = {
	resource: 'email';
	operation: 'createRecord';
	sentToAddress: string | Expression<string>;
	sentFromAddress: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Retrieve many companies */
export type KeapV1EmailGetAllConfig = {
	resource: 'email';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Send Email */
export type KeapV1EmailSendConfig = {
	resource: 'email';
	operation: 'send';
	/**
	 * The infusionsoft user to send the email on behalf of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	userId: string | Expression<string>;
	/**
	 * Contact IDs to receive the email. Multiple can be added seperated by comma.
	 */
	contactIds?: string | Expression<string>;
	/**
	 * The subject line of the email
	 */
	subject?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	/**
	 * Attachments to be sent with each copy of the email, maximum of 10 with size of 1MB each
	 * @default {}
	 */
	attachmentsUi?: {
		attachmentsValues?: Array<{
			fileData?: string | Expression<string>;
			fileName?: string | Expression<string>;
		}>;
		attachmentsBinary?: Array<{ property?: string | Expression<string> }>;
	};
};

/** Delete an contact */
export type KeapV1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
	fileId: string | Expression<string>;
};

/** Retrieve many companies */
export type KeapV1FileGetAllConfig = {
	resource: 'file';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Upload a file */
export type KeapV1FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
	/**
	 * Whether the data to upload should be taken from binary field
	 * @default false
	 */
	binaryData?: boolean | Expression<boolean>;
	binaryPropertyName: string | Expression<string>;
	fileAssociation: 'company' | 'contact' | 'user' | Expression<string>;
	contactId: string | Expression<string>;
	/**
	 * The filename of the attached file, including extension
	 */
	fileName: string | Expression<string>;
	/**
	 * The content of the attachment, encoded in Base64
	 */
	fileData: string | Expression<string>;
	isPublic?: boolean | Expression<boolean>;
};

export type KeapV1Params =
	| KeapV1CompanyCreateConfig
	| KeapV1CompanyGetAllConfig
	| KeapV1ContactUpsertConfig
	| KeapV1ContactDeleteConfig
	| KeapV1ContactGetConfig
	| KeapV1ContactGetAllConfig
	| KeapV1ContactNoteCreateConfig
	| KeapV1ContactNoteDeleteConfig
	| KeapV1ContactNoteGetConfig
	| KeapV1ContactNoteGetAllConfig
	| KeapV1ContactNoteUpdateConfig
	| KeapV1ContactTagCreateConfig
	| KeapV1ContactTagDeleteConfig
	| KeapV1ContactTagGetAllConfig
	| KeapV1EcommerceOrderCreateConfig
	| KeapV1EcommerceOrderGetConfig
	| KeapV1EcommerceOrderDeleteConfig
	| KeapV1EcommerceOrderGetAllConfig
	| KeapV1EcommerceProductCreateConfig
	| KeapV1EcommerceProductDeleteConfig
	| KeapV1EcommerceProductGetConfig
	| KeapV1EcommerceProductGetAllConfig
	| KeapV1EmailCreateRecordConfig
	| KeapV1EmailGetAllConfig
	| KeapV1EmailSendConfig
	| KeapV1FileDeleteConfig
	| KeapV1FileGetAllConfig
	| KeapV1FileUploadConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface KeapV1Credentials {
	keapOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type KeapV1Node = {
	type: 'n8n-nodes-base.keap';
	version: 1;
	config: NodeConfig<KeapV1Params>;
	credentials?: KeapV1Credentials;
};

export type KeapNode = KeapV1Node;
