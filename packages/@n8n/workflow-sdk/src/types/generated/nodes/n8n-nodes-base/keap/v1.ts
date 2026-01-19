/**
 * Keap Node - Version 1
 * Consume Keap API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
			/** ISO Alpha-3 Code
			 */
			countryCode?: string | Expression<string>;
			/** Line 1
			 */
			line1?: string | Expression<string>;
			/** Line 2
			 */
			line2?: string | Expression<string>;
			/** Locality
			 */
			locality?: string | Expression<string>;
			/** Postal Code
			 */
			postalCode?: string | Expression<string>;
			/** Region
			 */
			region?: string | Expression<string>;
			/** Zip Code
			 */
			zipCode?: string | Expression<string>;
			/** Zip Four
			 */
			zipFour?: string | Expression<string>;
		};
	};
	faxesUi?: {
		faxesValues?: {
			/** Type
			 */
			type?: string | Expression<string>;
			/** Number
			 */
			number?: string | Expression<string>;
		};
	};
	phonesUi?: {
		phonesValues?: Array<{
			/** Type
			 */
			type?: string | Expression<string>;
			/** Number
			 */
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
 * @displayOptions.show { operation: ["getAll"], resource: ["company"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["company"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["upsert"], resource: ["contact"] }
 * @default email
 */
		duplicateOption: 'email' | 'emailAndName' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	addressesUi?: {
		addressesValues?: Array<{
			/** Field
			 */
			field?: 'BILLING' | 'SHIPPING' | 'OTHER' | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			countryCode?: string | Expression<string>;
			/** Line 1
			 */
			line1?: string | Expression<string>;
			/** Line 2
			 */
			line2?: string | Expression<string>;
			/** Locality
			 */
			locality?: string | Expression<string>;
			/** Postal Code
			 */
			postalCode?: string | Expression<string>;
			/** Region
			 */
			region?: string | Expression<string>;
			/** Zip Code
			 */
			zipCode?: string | Expression<string>;
			/** Zip Four
			 */
			zipFour?: string | Expression<string>;
		}>;
	};
	emailsUi?: {
		emailsValues?: Array<{
			/** Field
			 */
			field?: 'EMAIL1' | 'EMAIL2' | 'EMAIL3' | Expression<string>;
			/** Email
			 */
			email?: string | Expression<string>;
		}>;
	};
	faxesUi?: {
		faxesValues?: Array<{
			/** Field
			 */
			field?: 'FAX1' | 'FAX2' | Expression<string>;
			/** Number
			 */
			number?: string | Expression<string>;
		}>;
	};
	phonesUi?: {
		phonesValues?: Array<{
			/** Field
			 */
			field?: 'PHONE1' | 'PHONE2' | 'PHONE3' | 'PHONE4' | 'PHONE5' | Expression<string>;
			/** Number
			 */
			number?: string | Expression<string>;
		}>;
	};
	socialAccountsUi?: {
		socialAccountsValues?: Array<{
			/** Type
			 */
			type?: 'Facebook' | 'Twitter' | 'LinkedIn' | Expression<string>;
			/** Name
			 */
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
 * @displayOptions.show { operation: ["getAll"], resource: ["contact"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["contact"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["create"], resource: ["contactNote"] }
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
 * @displayOptions.show { operation: ["getAll"], resource: ["contactNote"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["contactNote"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["create"], resource: ["contactTag"] }
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
 * @displayOptions.show { operation: ["getAll"], resource: ["contactTag"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["contactTag"], returnAll: [false] }
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
			/** Company
			 */
			company?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			countryCode?: string | Expression<string>;
			/** First Name
			 */
			firstName?: string | Expression<string>;
			/** Middle Name
			 */
			middleName?: string | Expression<string>;
			/** Last Name
			 */
			lastName?: string | Expression<string>;
			/** Line 1
			 */
			line1?: string | Expression<string>;
			/** Line 2
			 */
			line2?: string | Expression<string>;
			/** Locality
			 */
			locality?: string | Expression<string>;
			/** Region
			 */
			region?: string | Expression<string>;
			/** Zip Code
			 */
			zipCode?: string | Expression<string>;
			/** Zip Four
			 */
			zipFour?: string | Expression<string>;
			/** Phone
			 */
			phone?: string | Expression<string>;
		};
	};
	orderItemsUi?: {
		orderItemsValues?: Array<{
			/** Description
			 */
			description?: string | Expression<string>;
			/** Overridable price of the product, if not specified, the default will be used
			 * @default 0
			 */
			price?: number | Expression<number>;
			/** Product ID
			 * @default 0
			 */
			'product ID'?: number | Expression<number>;
			/** Quantity
			 * @default 1
			 */
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
 * @displayOptions.show { operation: ["getAll"], resource: ["ecommerceOrder"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["ecommerceOrder"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["getAll"], resource: ["ecommerceProduct"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["ecommerceProduct"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["getAll"], resource: ["email"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["email"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["send"], resource: ["email"] }
 */
		userId: string | Expression<string>;
/**
 * Contact IDs to receive the email. Multiple can be added seperated by comma.
 * @displayOptions.show { operation: ["send"], resource: ["email"] }
 */
		contactIds?: string | Expression<string>;
/**
 * The subject line of the email
 * @displayOptions.show { operation: ["send"], resource: ["email"] }
 */
		subject?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
/**
 * Attachments to be sent with each copy of the email, maximum of 10 with size of 1MB each
 * @displayOptions.show { operation: ["send"], resource: ["email"] }
 * @default {}
 */
		attachmentsUi?: {
		attachmentsValues?: Array<{
			/** The content of the attachment, encoded in Base64
			 */
			fileData?: string | Expression<string>;
			/** The filename of the attached file, including extension
			 */
			fileName?: string | Expression<string>;
		}>;
		attachmentsBinary?: Array<{
			/** Name of the binary properties which contain data which should be added to email as attachment
			 */
			property?: string | Expression<string>;
		}>;
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
 * @displayOptions.show { operation: ["getAll"], resource: ["file"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["file"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 * @default false
 */
		binaryData?: boolean | Expression<boolean>;
	binaryPropertyName: string | Expression<string>;
	fileAssociation: 'company' | 'contact' | 'user' | Expression<string>;
	contactId: string | Expression<string>;
/**
 * The filename of the attached file, including extension
 * @displayOptions.show { operation: ["upload"], resource: ["file"], binaryData: [false] }
 */
		fileName: string | Expression<string>;
/**
 * The content of the attachment, encoded in Base64
 * @displayOptions.show { operation: ["upload"], resource: ["file"], binaryData: [false] }
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
	| KeapV1FileUploadConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type KeapV1ContactUpsertOutput = {
	addresses?: Array<{
		field?: string;
		locality?: string;
		postal_code?: string;
	}>;
	date_created?: string;
	email_addresses?: Array<{
		email?: string;
		field?: string;
	}>;
	email_opted_in?: boolean;
	email_status?: string;
	family_name?: string;
	given_name?: string;
	id?: number;
	last_updated?: string;
	last_updated_utc_millis?: number;
	phone_numbers?: Array<{
		field?: string;
		number?: string;
		number_e164?: null;
	}>;
	ScoreValue?: null;
	tag_ids?: Array<number>;
};

export type KeapV1ContactGetOutput = {
	addresses?: Array<{
		field?: string;
		line1?: string;
		locality?: string;
		postal_code?: string;
	}>;
	contact_type?: string;
	custom_fields?: Array<{
		id?: number;
	}>;
	date_created?: string;
	email_addresses?: Array<{
		email?: string;
		field?: string;
	}>;
	email_opted_in?: boolean;
	email_status?: string;
	family_name?: string;
	given_name?: string;
	id?: number;
	last_updated?: string;
	last_updated_utc_millis?: number;
	phone_numbers?: Array<{
		field?: string;
		number?: string;
	}>;
	ScoreValue?: string;
	tag_ids?: Array<number>;
};

export type KeapV1ContactGetAllOutput = {
	addresses?: Array<{
		field?: string;
		line1?: string;
		locality?: string;
		postal_code?: string;
	}>;
	date_created?: string;
	email_addresses?: Array<{
		email?: string;
		field?: string;
	}>;
	email_opted_in?: boolean;
	family_name?: string;
	given_name?: string;
	id?: number;
	last_updated?: string;
	last_updated_utc_millis?: number;
	phone_numbers?: Array<{
		field?: string;
		number?: string;
		number_e164?: null;
	}>;
	ScoreValue?: null;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface KeapV1Credentials {
	keapOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface KeapV1NodeBase {
	type: 'n8n-nodes-base.keap';
	version: 1;
	credentials?: KeapV1Credentials;
}

export type KeapV1CompanyCreateNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1CompanyCreateConfig>;
};

export type KeapV1CompanyGetAllNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1CompanyGetAllConfig>;
};

export type KeapV1ContactUpsertNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1ContactUpsertConfig>;
	output?: KeapV1ContactUpsertOutput;
};

export type KeapV1ContactDeleteNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1ContactDeleteConfig>;
};

export type KeapV1ContactGetNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1ContactGetConfig>;
	output?: KeapV1ContactGetOutput;
};

export type KeapV1ContactGetAllNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1ContactGetAllConfig>;
	output?: KeapV1ContactGetAllOutput;
};

export type KeapV1ContactNoteCreateNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1ContactNoteCreateConfig>;
};

export type KeapV1ContactNoteDeleteNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1ContactNoteDeleteConfig>;
};

export type KeapV1ContactNoteGetNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1ContactNoteGetConfig>;
};

export type KeapV1ContactNoteGetAllNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1ContactNoteGetAllConfig>;
};

export type KeapV1ContactNoteUpdateNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1ContactNoteUpdateConfig>;
};

export type KeapV1ContactTagCreateNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1ContactTagCreateConfig>;
};

export type KeapV1ContactTagDeleteNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1ContactTagDeleteConfig>;
};

export type KeapV1ContactTagGetAllNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1ContactTagGetAllConfig>;
};

export type KeapV1EcommerceOrderCreateNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1EcommerceOrderCreateConfig>;
};

export type KeapV1EcommerceOrderGetNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1EcommerceOrderGetConfig>;
};

export type KeapV1EcommerceOrderDeleteNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1EcommerceOrderDeleteConfig>;
};

export type KeapV1EcommerceOrderGetAllNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1EcommerceOrderGetAllConfig>;
};

export type KeapV1EcommerceProductCreateNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1EcommerceProductCreateConfig>;
};

export type KeapV1EcommerceProductDeleteNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1EcommerceProductDeleteConfig>;
};

export type KeapV1EcommerceProductGetNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1EcommerceProductGetConfig>;
};

export type KeapV1EcommerceProductGetAllNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1EcommerceProductGetAllConfig>;
};

export type KeapV1EmailCreateRecordNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1EmailCreateRecordConfig>;
};

export type KeapV1EmailGetAllNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1EmailGetAllConfig>;
};

export type KeapV1EmailSendNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1EmailSendConfig>;
};

export type KeapV1FileDeleteNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1FileDeleteConfig>;
};

export type KeapV1FileGetAllNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1FileGetAllConfig>;
};

export type KeapV1FileUploadNode = KeapV1NodeBase & {
	config: NodeConfig<KeapV1FileUploadConfig>;
};

export type KeapV1Node =
	| KeapV1CompanyCreateNode
	| KeapV1CompanyGetAllNode
	| KeapV1ContactUpsertNode
	| KeapV1ContactDeleteNode
	| KeapV1ContactGetNode
	| KeapV1ContactGetAllNode
	| KeapV1ContactNoteCreateNode
	| KeapV1ContactNoteDeleteNode
	| KeapV1ContactNoteGetNode
	| KeapV1ContactNoteGetAllNode
	| KeapV1ContactNoteUpdateNode
	| KeapV1ContactTagCreateNode
	| KeapV1ContactTagDeleteNode
	| KeapV1ContactTagGetAllNode
	| KeapV1EcommerceOrderCreateNode
	| KeapV1EcommerceOrderGetNode
	| KeapV1EcommerceOrderDeleteNode
	| KeapV1EcommerceOrderGetAllNode
	| KeapV1EcommerceProductCreateNode
	| KeapV1EcommerceProductDeleteNode
	| KeapV1EcommerceProductGetNode
	| KeapV1EcommerceProductGetAllNode
	| KeapV1EmailCreateRecordNode
	| KeapV1EmailGetAllNode
	| KeapV1EmailSendNode
	| KeapV1FileDeleteNode
	| KeapV1FileGetAllNode
	| KeapV1FileUploadNode
	;