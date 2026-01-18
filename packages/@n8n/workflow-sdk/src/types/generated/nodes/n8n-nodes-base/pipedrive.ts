/**
 * Pipedrive Node Types
 *
 * Create and edit data in Pipedrive
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/pipedrive/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an activity */
export type PipedriveV1ActivityCreateConfig = {
	resource: 'activity';
	operation: 'create';
	/**
	 * The subject of the activity to create
	 * @displayOptions.show { operation: ["create"], resource: ["activity"] }
	 */
	subject: string | Expression<string>;
	/**
	 * Whether the activity is done or not
	 * @displayOptions.show { operation: ["create"], resource: ["activity"] }
	 * @default 0
	 */
	done?: '0' | '1' | Expression<string>;
	/**
	 * Type of the activity like "call", "meeting", etc
	 * @displayOptions.show { operation: ["create"], resource: ["activity"] }
	 */
	type: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an activity */
export type PipedriveV1ActivityDeleteConfig = {
	resource: 'activity';
	operation: 'delete';
	/**
	 * ID of the activity to delete
	 * @displayOptions.show { operation: ["delete"], resource: ["activity"] }
	 * @default 0
	 */
	activityId: number | Expression<number>;
};

/** Get data of an activity */
export type PipedriveV1ActivityGetConfig = {
	resource: 'activity';
	operation: 'get';
	/**
	 * ID of the activity to get
	 * @displayOptions.show { operation: ["get"], resource: ["activity"] }
	 * @default 0
	 */
	activityId: number | Expression<number>;
	/**
	 * By default do custom properties get returned only as ID instead of their actual name. Also option fields contain only the ID instead of their actual value. If this option gets set they get automatically resolved.
	 * @displayOptions.show { resource: ["activity", "deal", "organization", "person", "product"], operation: ["get", "getAll"] }
	 * @default false
	 */
	resolveProperties?: boolean | Expression<boolean>;
};

/** Get data of many activities */
export type PipedriveV1ActivityGetAllConfig = {
	resource: 'activity';
	operation: 'getAll';
	/**
	 * By default do custom properties get returned only as ID instead of their actual name. Also option fields contain only the ID instead of their actual value. If this option gets set they get automatically resolved.
	 * @displayOptions.show { resource: ["activity", "deal", "organization", "person", "product"], operation: ["get", "getAll"] }
	 * @default false
	 */
	resolveProperties?: boolean | Expression<boolean>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Update an activity */
export type PipedriveV1ActivityUpdateConfig = {
	resource: 'activity';
	operation: 'update';
	/**
	 * ID of the activity to update
	 * @displayOptions.show { operation: ["update"], resource: ["activity"] }
	 * @default 0
	 */
	activityId: number | Expression<number>;
	updateFields?: Record<string, unknown>;
	/**
	 * By default do custom properties have to be set as ID instead of their actual name. Also option fields have to be set as ID instead of their actual value. If this option gets set they get automatically encoded.
	 * @displayOptions.show { resource: ["activity", "deal", "organization", "person", "product"], operation: ["update"] }
	 * @default false
	 */
	encodeProperties?: boolean | Expression<boolean>;
};

/** Create an activity */
export type PipedriveV1DealCreateConfig = {
	resource: 'deal';
	operation: 'create';
	/**
	 * The title of the deal to create
	 * @displayOptions.show { operation: ["create"], resource: ["deal"] }
	 */
	title: string | Expression<string>;
	/**
	 * Type of entity to link to this deal
	 * @displayOptions.show { resource: ["deal"], operation: ["create"] }
	 * @default organization
	 */
	associateWith: 'organization' | 'person' | Expression<string>;
	/**
	 * ID of the organization this deal will be associated with
	 * @displayOptions.show { operation: ["create"], resource: ["deal"], associateWith: ["organization"] }
	 * @default 0
	 */
	org_id: number | Expression<number>;
	/**
	 * ID of the person this deal will be associated with
	 * @displayOptions.show { operation: ["create"], resource: ["deal"], associateWith: ["person"] }
	 * @default 0
	 */
	person_id?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an activity */
export type PipedriveV1DealDeleteConfig = {
	resource: 'deal';
	operation: 'delete';
	/**
	 * ID of the deal to delete
	 * @displayOptions.show { operation: ["delete"], resource: ["deal"] }
	 * @default 0
	 */
	dealId: number | Expression<number>;
};

/** Duplicate a deal */
export type PipedriveV1DealDuplicateConfig = {
	resource: 'deal';
	operation: 'duplicate';
	/**
	 * ID of the deal to duplicate
	 * @displayOptions.show { operation: ["duplicate"], resource: ["deal"] }
	 * @default 0
	 */
	dealId: number | Expression<number>;
};

/** Get data of an activity */
export type PipedriveV1DealGetConfig = {
	resource: 'deal';
	operation: 'get';
	/**
	 * ID of the deal to get
	 * @displayOptions.show { operation: ["get"], resource: ["deal"] }
	 * @default 0
	 */
	dealId: number | Expression<number>;
	/**
	 * By default do custom properties get returned only as ID instead of their actual name. Also option fields contain only the ID instead of their actual value. If this option gets set they get automatically resolved.
	 * @displayOptions.show { resource: ["activity", "deal", "organization", "person", "product"], operation: ["get", "getAll"] }
	 * @default false
	 */
	resolveProperties?: boolean | Expression<boolean>;
};

/** Get data of many activities */
export type PipedriveV1DealGetAllConfig = {
	resource: 'deal';
	operation: 'getAll';
	/**
	 * By default do custom properties get returned only as ID instead of their actual name. Also option fields contain only the ID instead of their actual value. If this option gets set they get automatically resolved.
	 * @displayOptions.show { resource: ["activity", "deal", "organization", "person", "product"], operation: ["get", "getAll"] }
	 * @default false
	 */
	resolveProperties?: boolean | Expression<boolean>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Search a deal */
export type PipedriveV1DealSearchConfig = {
	resource: 'deal';
	operation: 'search';
	/**
	 * The search term to look for. Minimum 2 characters (or 1 if using exact_match).
	 * @displayOptions.show { operation: ["search"], resource: ["deal"] }
	 */
	term: string | Expression<string>;
	/**
	 * Whether only full exact matches against the given term are returned. It is not case sensitive.
	 * @displayOptions.show { operation: ["search"], resource: ["deal"] }
	 * @default false
	 */
	exactMatch?: boolean | Expression<boolean>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["search"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["search"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Update an activity */
export type PipedriveV1DealUpdateConfig = {
	resource: 'deal';
	operation: 'update';
	/**
	 * ID of the deal to update
	 * @displayOptions.show { operation: ["update"], resource: ["deal"] }
	 * @default 0
	 */
	dealId: number | Expression<number>;
	updateFields?: Record<string, unknown>;
	/**
	 * By default do custom properties have to be set as ID instead of their actual name. Also option fields have to be set as ID instead of their actual value. If this option gets set they get automatically encoded.
	 * @displayOptions.show { resource: ["activity", "deal", "organization", "person", "product"], operation: ["update"] }
	 * @default false
	 */
	encodeProperties?: boolean | Expression<boolean>;
};

/** Get data of many activities */
export type PipedriveV1DealActivityGetAllConfig = {
	resource: 'dealActivity';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * The ID of the deal whose activity to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["getAll"], resource: ["dealActivity"] }
	 */
	dealId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Add a product to a deal */
export type PipedriveV1DealProductAddConfig = {
	resource: 'dealProduct';
	operation: 'add';
	/**
	 * The ID of the deal to add a product to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["add"], resource: ["dealProduct"] }
	 */
	dealId: string | Expression<string>;
	/**
	 * The ID of the product to add to a deal. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["add"], resource: ["dealProduct"] }
	 */
	productId: string | Expression<string>;
	/**
	 * Price at which to add or update this product in a deal
	 * @displayOptions.show { operation: ["add"], resource: ["dealProduct"] }
	 * @default 0
	 */
	item_price: number | Expression<number>;
	/**
	 * How many items of this product to add/update in a deal
	 * @displayOptions.show { operation: ["add"], resource: ["dealProduct"] }
	 * @default 1
	 */
	quantity: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Get data of many activities */
export type PipedriveV1DealProductGetAllConfig = {
	resource: 'dealProduct';
	operation: 'getAll';
	/**
	 * The ID of the deal whose products to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["getAll"], resource: ["dealProduct"] }
	 */
	dealId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Remove a product from a deal */
export type PipedriveV1DealProductRemoveConfig = {
	resource: 'dealProduct';
	operation: 'remove';
	/**
	 * The ID of the deal whose product to remove. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["remove"], resource: ["dealProduct"] }
	 */
	dealId: string | Expression<string>;
	/**
	 * ID of the deal-product (the ID of the product attached to the deal). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["remove"], resource: ["dealProduct"] }
	 */
	productAttachmentId: string | Expression<string>;
};

/** Update an activity */
export type PipedriveV1DealProductUpdateConfig = {
	resource: 'dealProduct';
	operation: 'update';
	/**
	 * The ID of the deal whose product to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["update"], resource: ["dealProduct"] }
	 */
	dealId: string | Expression<string>;
	/**
	 * ID of the deal-product (the ID of the product attached to the deal). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["update"], resource: ["dealProduct"] }
	 */
	productAttachmentId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an activity */
export type PipedriveV1FileCreateConfig = {
	resource: 'file';
	operation: 'create';
	binaryPropertyName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an activity */
export type PipedriveV1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
	/**
	 * ID of the file to delete
	 * @displayOptions.show { operation: ["delete"], resource: ["file"] }
	 * @default 0
	 */
	fileId: number | Expression<number>;
};

/** Download a file */
export type PipedriveV1FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
	/**
	 * ID of the file to download
	 * @displayOptions.show { operation: ["download"], resource: ["file"] }
	 * @default 0
	 */
	fileId: number | Expression<number>;
	binaryPropertyName: string | Expression<string>;
};

/** Get data of an activity */
export type PipedriveV1FileGetConfig = {
	resource: 'file';
	operation: 'get';
	/**
	 * ID of the file to get
	 * @displayOptions.show { operation: ["get"], resource: ["file"] }
	 * @default 0
	 */
	fileId: number | Expression<number>;
};

/** Update an activity */
export type PipedriveV1FileUpdateConfig = {
	resource: 'file';
	operation: 'update';
	/**
	 * ID of the file to update
	 * @displayOptions.show { operation: ["update"], resource: ["file"] }
	 * @default 0
	 */
	fileId: number | Expression<number>;
	updateFields?: Record<string, unknown>;
};

/** Create an activity */
export type PipedriveV1LeadCreateConfig = {
	resource: 'lead';
	operation: 'create';
	/**
	 * Name of the lead to create
	 * @displayOptions.show { resource: ["lead"], operation: ["create"] }
	 */
	title: string | Expression<string>;
	/**
	 * Type of entity to link to this lead
	 * @displayOptions.show { resource: ["lead"], operation: ["create"] }
	 * @default organization
	 */
	associateWith: 'organization' | 'person' | Expression<string>;
	/**
	 * ID of the organization to link to this lead
	 * @displayOptions.show { resource: ["lead"], operation: ["create"], associateWith: ["organization"] }
	 * @default 0
	 */
	organization_id: number | Expression<number>;
	/**
	 * ID of the person to link to this lead
	 * @displayOptions.show { resource: ["lead"], operation: ["create"], associateWith: ["person"] }
	 * @default 0
	 */
	person_id: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an activity */
export type PipedriveV1LeadDeleteConfig = {
	resource: 'lead';
	operation: 'delete';
	/**
	 * ID of the lead to delete
	 * @displayOptions.show { resource: ["lead"], operation: ["delete"] }
	 */
	leadId: string | Expression<string>;
};

/** Get data of an activity */
export type PipedriveV1LeadGetConfig = {
	resource: 'lead';
	operation: 'get';
	/**
	 * ID of the lead to retrieve
	 * @displayOptions.show { resource: ["lead"], operation: ["get"] }
	 */
	leadId: string | Expression<string>;
};

/** Get data of many activities */
export type PipedriveV1LeadGetAllConfig = {
	resource: 'lead';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update an activity */
export type PipedriveV1LeadUpdateConfig = {
	resource: 'lead';
	operation: 'update';
	/**
	 * ID of the lead to update
	 * @displayOptions.show { resource: ["lead"], operation: ["update"] }
	 */
	leadId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an activity */
export type PipedriveV1NoteCreateConfig = {
	resource: 'note';
	operation: 'create';
	/**
	 * The content of the note to create
	 * @displayOptions.show { operation: ["create"], resource: ["note"] }
	 */
	content: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an activity */
export type PipedriveV1NoteDeleteConfig = {
	resource: 'note';
	operation: 'delete';
	/**
	 * ID of the note to delete
	 * @displayOptions.show { operation: ["delete"], resource: ["note"] }
	 * @default 0
	 */
	noteId: number | Expression<number>;
};

/** Get data of an activity */
export type PipedriveV1NoteGetConfig = {
	resource: 'note';
	operation: 'get';
	/**
	 * ID of the note to get
	 * @displayOptions.show { operation: ["get"], resource: ["note"] }
	 * @default 0
	 */
	noteId: number | Expression<number>;
};

/** Get data of many activities */
export type PipedriveV1NoteGetAllConfig = {
	resource: 'note';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Update an activity */
export type PipedriveV1NoteUpdateConfig = {
	resource: 'note';
	operation: 'update';
	/**
	 * ID of the note to update
	 * @displayOptions.show { operation: ["update"], resource: ["note"] }
	 * @default 0
	 */
	noteId: number | Expression<number>;
	updateFields?: Record<string, unknown>;
};

/** Create an activity */
export type PipedriveV1OrganizationCreateConfig = {
	resource: 'organization';
	operation: 'create';
	/**
	 * The name of the organization to create
	 * @displayOptions.show { operation: ["create"], resource: ["organization"] }
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an activity */
export type PipedriveV1OrganizationDeleteConfig = {
	resource: 'organization';
	operation: 'delete';
	/**
	 * ID of the organization to delete
	 * @displayOptions.show { operation: ["delete"], resource: ["organization"] }
	 * @default 0
	 */
	organizationId: number | Expression<number>;
};

/** Get data of an activity */
export type PipedriveV1OrganizationGetConfig = {
	resource: 'organization';
	operation: 'get';
	/**
	 * ID of the organization to get
	 * @displayOptions.show { operation: ["get"], resource: ["organization"] }
	 * @default 0
	 */
	organizationId: number | Expression<number>;
	/**
	 * By default do custom properties get returned only as ID instead of their actual name. Also option fields contain only the ID instead of their actual value. If this option gets set they get automatically resolved.
	 * @displayOptions.show { resource: ["activity", "deal", "organization", "person", "product"], operation: ["get", "getAll"] }
	 * @default false
	 */
	resolveProperties?: boolean | Expression<boolean>;
};

/** Get data of many activities */
export type PipedriveV1OrganizationGetAllConfig = {
	resource: 'organization';
	operation: 'getAll';
	/**
	 * By default do custom properties get returned only as ID instead of their actual name. Also option fields contain only the ID instead of their actual value. If this option gets set they get automatically resolved.
	 * @displayOptions.show { resource: ["activity", "deal", "organization", "person", "product"], operation: ["get", "getAll"] }
	 * @default false
	 */
	resolveProperties?: boolean | Expression<boolean>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Search a deal */
export type PipedriveV1OrganizationSearchConfig = {
	resource: 'organization';
	operation: 'search';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["search"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["search"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * The search term to look for. Minimum 2 characters (or 1 if using exact_match).
	 * @displayOptions.show { operation: ["search"], resource: ["organization"] }
	 */
	term: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Update an activity */
export type PipedriveV1OrganizationUpdateConfig = {
	resource: 'organization';
	operation: 'update';
	/**
	 * The ID of the organization to create
	 * @displayOptions.show { operation: ["update"], resource: ["organization"] }
	 */
	organizationId: number | Expression<number>;
	updateFields?: Record<string, unknown>;
	/**
	 * By default do custom properties have to be set as ID instead of their actual name. Also option fields have to be set as ID instead of their actual value. If this option gets set they get automatically encoded.
	 * @displayOptions.show { resource: ["activity", "deal", "organization", "person", "product"], operation: ["update"] }
	 * @default false
	 */
	encodeProperties?: boolean | Expression<boolean>;
};

/** Create an activity */
export type PipedriveV1PersonCreateConfig = {
	resource: 'person';
	operation: 'create';
	/**
	 * The name of the person to create
	 * @displayOptions.show { operation: ["create"], resource: ["person"] }
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an activity */
export type PipedriveV1PersonDeleteConfig = {
	resource: 'person';
	operation: 'delete';
	/**
	 * ID of the person to delete
	 * @displayOptions.show { operation: ["delete"], resource: ["person"] }
	 * @default 0
	 */
	personId: number | Expression<number>;
};

/** Get data of an activity */
export type PipedriveV1PersonGetConfig = {
	resource: 'person';
	operation: 'get';
	/**
	 * ID of the person to get
	 * @displayOptions.show { operation: ["get"], resource: ["person"] }
	 * @default 0
	 */
	personId: number | Expression<number>;
	/**
	 * By default do custom properties get returned only as ID instead of their actual name. Also option fields contain only the ID instead of their actual value. If this option gets set they get automatically resolved.
	 * @displayOptions.show { resource: ["activity", "deal", "organization", "person", "product"], operation: ["get", "getAll"] }
	 * @default false
	 */
	resolveProperties?: boolean | Expression<boolean>;
};

/** Get data of many activities */
export type PipedriveV1PersonGetAllConfig = {
	resource: 'person';
	operation: 'getAll';
	/**
	 * By default do custom properties get returned only as ID instead of their actual name. Also option fields contain only the ID instead of their actual value. If this option gets set they get automatically resolved.
	 * @displayOptions.show { resource: ["activity", "deal", "organization", "person", "product"], operation: ["get", "getAll"] }
	 * @default false
	 */
	resolveProperties?: boolean | Expression<boolean>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Search a deal */
export type PipedriveV1PersonSearchConfig = {
	resource: 'person';
	operation: 'search';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["search"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["search"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * The search term to look for. Minimum 2 characters (or 1 if using exact_match).
	 * @displayOptions.show { operation: ["search"], resource: ["person"] }
	 */
	term: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Update an activity */
export type PipedriveV1PersonUpdateConfig = {
	resource: 'person';
	operation: 'update';
	/**
	 * ID of the person to update
	 * @displayOptions.show { operation: ["update"], resource: ["person"] }
	 * @default 0
	 */
	personId: number | Expression<number>;
	/**
	 * The fields to update
	 * @displayOptions.show { operation: ["update"], resource: ["person"] }
	 * @default {}
	 */
	updateFields?: Record<string, unknown>;
	/**
	 * By default do custom properties have to be set as ID instead of their actual name. Also option fields have to be set as ID instead of their actual value. If this option gets set they get automatically encoded.
	 * @displayOptions.show { resource: ["activity", "deal", "organization", "person", "product"], operation: ["update"] }
	 * @default false
	 */
	encodeProperties?: boolean | Expression<boolean>;
};

/** Get data of many activities */
export type PipedriveV1ProductGetAllConfig = {
	resource: 'product';
	operation: 'getAll';
	/**
	 * By default do custom properties get returned only as ID instead of their actual name. Also option fields contain only the ID instead of their actual value. If this option gets set they get automatically resolved.
	 * @displayOptions.show { resource: ["activity", "deal", "organization", "person", "product"], operation: ["get", "getAll"] }
	 * @default false
	 */
	resolveProperties?: boolean | Expression<boolean>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

export type PipedriveV1Params =
	| PipedriveV1ActivityCreateConfig
	| PipedriveV1ActivityDeleteConfig
	| PipedriveV1ActivityGetConfig
	| PipedriveV1ActivityGetAllConfig
	| PipedriveV1ActivityUpdateConfig
	| PipedriveV1DealCreateConfig
	| PipedriveV1DealDeleteConfig
	| PipedriveV1DealDuplicateConfig
	| PipedriveV1DealGetConfig
	| PipedriveV1DealGetAllConfig
	| PipedriveV1DealSearchConfig
	| PipedriveV1DealUpdateConfig
	| PipedriveV1DealActivityGetAllConfig
	| PipedriveV1DealProductAddConfig
	| PipedriveV1DealProductGetAllConfig
	| PipedriveV1DealProductRemoveConfig
	| PipedriveV1DealProductUpdateConfig
	| PipedriveV1FileCreateConfig
	| PipedriveV1FileDeleteConfig
	| PipedriveV1FileDownloadConfig
	| PipedriveV1FileGetConfig
	| PipedriveV1FileUpdateConfig
	| PipedriveV1LeadCreateConfig
	| PipedriveV1LeadDeleteConfig
	| PipedriveV1LeadGetConfig
	| PipedriveV1LeadGetAllConfig
	| PipedriveV1LeadUpdateConfig
	| PipedriveV1NoteCreateConfig
	| PipedriveV1NoteDeleteConfig
	| PipedriveV1NoteGetConfig
	| PipedriveV1NoteGetAllConfig
	| PipedriveV1NoteUpdateConfig
	| PipedriveV1OrganizationCreateConfig
	| PipedriveV1OrganizationDeleteConfig
	| PipedriveV1OrganizationGetConfig
	| PipedriveV1OrganizationGetAllConfig
	| PipedriveV1OrganizationSearchConfig
	| PipedriveV1OrganizationUpdateConfig
	| PipedriveV1PersonCreateConfig
	| PipedriveV1PersonDeleteConfig
	| PipedriveV1PersonGetConfig
	| PipedriveV1PersonGetAllConfig
	| PipedriveV1PersonSearchConfig
	| PipedriveV1PersonUpdateConfig
	| PipedriveV1ProductGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface PipedriveV1Credentials {
	pipedriveApi: CredentialReference;
	pipedriveOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type PipedriveV1Node = {
	type: 'n8n-nodes-base.pipedrive';
	version: 1;
	config: NodeConfig<PipedriveV1Params>;
	credentials?: PipedriveV1Credentials;
};

export type PipedriveNode = PipedriveV1Node;
