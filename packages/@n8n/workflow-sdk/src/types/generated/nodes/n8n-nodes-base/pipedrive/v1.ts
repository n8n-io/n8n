/**
 * Pipedrive Node - Version 1
 * Create and edit data in Pipedrive
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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


// ===========================================================================
// Output Types
// ===========================================================================

export type PipedriveV1ActivityCreateOutput = {
	active_flag?: boolean;
	add_time?: string;
	assigned_to_user_id?: number;
	attendees?: null;
	busy_flag?: boolean;
	calendar_sync_include_context?: null;
	company_id?: number;
	conference_meeting_client?: null;
	conference_meeting_id?: null;
	conference_meeting_url?: null;
	created_by_user_id?: number;
	done?: boolean;
	due_date?: string;
	due_time?: string;
	duration?: string;
	id?: number;
	is_recurring?: null;
	last_notification_time?: null;
	last_notification_user_id?: null;
	location?: null;
	location_admin_area_level_1?: null;
	location_admin_area_level_2?: null;
	location_country?: null;
	location_formatted_address?: null;
	location_locality?: null;
	location_postal_code?: null;
	location_route?: null;
	location_street_number?: null;
	location_sublocality?: null;
	location_subpremise?: null;
	marked_as_done_time?: string;
	notification_language_id?: null;
	original_start_time?: null;
	owner_name?: string;
	priority?: null;
	private?: boolean;
	public_description?: null;
	rec_master_activity_id?: null;
	rec_rule?: null;
	rec_rule_extension?: null;
	reference_id?: null;
	reference_type?: null;
	series?: null;
	source_timezone?: null;
	subject?: string;
	type?: string;
	type_name?: string;
	update_time?: string;
	update_user_id?: null;
	user_id?: number;
};

export type PipedriveV1ActivityGetOutput = {
	active_flag?: boolean;
	'Add time'?: string;
	'Apartment/suite no of Location'?: null;
	'Assigned to user'?: number;
	assigned_to_user_id?: number;
	'City/town/village/locality of Location'?: null;
	company_id?: number;
	conference_meeting_id?: null;
	'Contact person'?: number;
	'Country of Location'?: null;
	Creator?: number;
	'District/sublocality of Location'?: null;
	Done?: string;
	'Due date'?: string;
	'Due time'?: string;
	Duration?: string;
	'Free/busy'?: string;
	'Full/combined address of Location'?: null;
	'House number of Location'?: null;
	ID?: number;
	is_recurring?: null;
	'Last notification time'?: null;
	last_notification_user_id?: null;
	lead?: null;
	Lead?: null;
	lead_title?: null;
	Location?: null;
	'Marked as done time'?: string;
	Note?: string;
	Organisation?: number;
	original_start_time?: null;
	owner_name?: string;
	Priority?: null;
	private?: boolean;
	rec_master_activity_id?: null;
	rec_rule?: null;
	rec_rule_extension?: null;
	reference_id?: null;
	'Region of Location'?: null;
	series?: null;
	'State/county of Location'?: null;
	'Street/road name of Location'?: null;
	Subject?: string;
	Type?: string;
	type_name?: string;
	'Update time'?: string;
	'ZIP/Postal code of Location'?: null;
};

export type PipedriveV1ActivityGetAllOutput = {
	active_flag?: boolean;
	add_time?: string;
	assigned_to_user_id?: number;
	busy_flag?: boolean;
	company_id?: number;
	created_by_user_id?: number;
	done?: boolean;
	due_date?: string;
	due_time?: string;
	duration?: string;
	id?: number;
	is_recurring?: null;
	last_notification_time?: null;
	last_notification_user_id?: null;
	location_admin_area_level_1?: null;
	location_admin_area_level_2?: null;
	location_country?: null;
	location_formatted_address?: null;
	location_locality?: null;
	location_postal_code?: null;
	location_route?: null;
	location_street_number?: null;
	location_sublocality?: null;
	location_subpremise?: null;
	notification_language_id?: null;
	original_start_time?: null;
	owner_name?: string;
	private?: boolean;
	reference_id?: null;
	series?: null;
	subject?: string;
	type?: string;
	update_time?: string;
	user_id?: number;
};

export type PipedriveV1ActivityUpdateOutput = {
	active_flag?: boolean;
	add_time?: string;
	assigned_to_user_id?: number;
	busy_flag?: boolean;
	company_id?: number;
	conference_meeting_id?: null;
	created_by_user_id?: number;
	done?: boolean;
	due_date?: string;
	due_time?: string;
	duration?: string;
	id?: number;
	is_recurring?: null;
	last_notification_time?: null;
	last_notification_user_id?: null;
	lead?: null;
	lead_id?: null;
	lead_title?: null;
	location_admin_area_level_1?: null;
	location_admin_area_level_2?: null;
	location_country?: null;
	location_formatted_address?: null;
	location_locality?: null;
	location_postal_code?: null;
	location_route?: null;
	location_street_number?: null;
	location_sublocality?: null;
	location_subpremise?: null;
	marked_as_done_time?: string;
	notification_language_id?: null;
	original_start_time?: null;
	owner_name?: string;
	private?: boolean;
	rec_master_activity_id?: null;
	rec_rule?: null;
	rec_rule_extension?: null;
	reference_id?: null;
	series?: null;
	subject?: string;
	type?: string;
	type_name?: string;
	update_time?: string;
	update_user_id?: number;
	user_id?: number;
};

export type PipedriveV1DealCreateOutput = {
	active?: boolean;
	activities_count?: number;
	acv?: null;
	acv_currency?: null;
	add_time?: string;
	arr?: null;
	arr_currency?: null;
	cc_email?: string;
	creator_user_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	currency?: string;
	deleted?: boolean;
	done_activities_count?: number;
	email_messages_count?: number;
	expected_close_date?: null;
	files_count?: number;
	followers_count?: number;
	formatted_value?: string;
	formatted_weighted_value?: string;
	id?: number;
	last_activity_date?: null;
	last_activity_id?: null;
	last_incoming_mail_time?: null;
	last_outgoing_mail_time?: null;
	local_lost_date?: null;
	lost_reason?: null;
	lost_time?: null;
	mrr?: null;
	mrr_currency?: null;
	next_activity_date?: null;
	next_activity_duration?: null;
	next_activity_id?: null;
	next_activity_note?: null;
	next_activity_subject?: null;
	next_activity_time?: null;
	next_activity_type?: null;
	notes_count?: number;
	org_hidden?: boolean;
	origin?: string;
	owner_name?: string;
	participants_count?: number;
	person_hidden?: boolean;
	pipeline_id?: number;
	probability?: null;
	products_count?: number;
	stage_change_time?: null;
	stage_id?: number;
	stage_order_nr?: number;
	status?: string;
	title?: string;
	undone_activities_count?: number;
	update_time?: string;
	user_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	visible_to?: string;
	weighted_value_currency?: string;
};

export type PipedriveV1DealDeleteOutput = {
	error?: string;
};

export type PipedriveV1DealGetOutput = {
	'0bb28fa193c6b091813e9ba57a42aae322b1f098'?: string;
	'0d2381bc2f18042052f532661380b2526d5d1418'?: string;
	'2b88250c8fe6de6a9c18a843012c3be4120bc977'?: string;
	'509080cf228cf9363d8d822ae4e7391e42b46bd0'?: string;
	'5a3096c3afe73de34f661fb2f39fd1730b8b9a14'?: number;
	'5bf837804980758d9b007751a08a0282c400d7d8'?: string;
	'6978a0bb41b5952de4d88d432af93fcd1cee3c48'?: string;
	'6ed765e95e07cb884c5ca83bed7f9129687b06f1'?: string;
	'861f700a2a00ee759b696c61c68ad81d6add71b8'?: string;
	'943fc1f0be467988db62ed6e53b7662a9e03da71'?: string;
	active?: boolean;
	activities_count?: number;
	add_time?: string;
	age?: {
		d?: number;
		h?: number;
		i?: number;
		m?: number;
		s?: number;
		total_seconds?: number;
		y?: number;
	};
	average_stage_progress?: number;
	average_time_to_won?: {
		d?: number;
		h?: number;
		i?: number;
		m?: number;
		s?: number;
		total_seconds?: number;
		y?: number;
	};
	cc_email?: string;
	creator_user_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	currency?: string;
	deleted?: boolean;
	done_activities_count?: number;
	email_messages_count?: number;
	files_count?: number;
	followers_count?: number;
	formatted_value?: string;
	formatted_weighted_value?: string;
	id?: number;
	next_activity_duration?: null;
	next_activity_note?: null;
	next_activity_time?: null;
	notes_count?: number;
	org_hidden?: boolean;
	owner_name?: string;
	participants_count?: number;
	person_hidden?: boolean;
	person_id?: {
		active_flag?: boolean;
		email?: Array<{
			label?: string;
			primary?: boolean;
			value?: string;
		}>;
		name?: string;
		owner_id?: number;
		phone?: Array<{
			primary?: boolean;
			value?: string;
		}>;
		value?: number;
	};
	pipeline_id?: number;
	products_count?: number;
	stage_id?: number;
	stage_order_nr?: number;
	status?: string;
	stay_in_pipeline_stages?: {
		order_of_stages?: Array<number>;
	};
	title?: string;
	undone_activities_count?: number;
	update_time?: string;
	user_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	visible_to?: string;
	weighted_value_currency?: string;
};

export type PipedriveV1DealGetAllOutput = {
	active?: boolean;
	activities_count?: number;
	add_time?: string;
	archive_time?: null;
	cc_email?: string;
	creator_user_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	currency?: string;
	deleted?: boolean;
	done_activities_count?: number;
	email_messages_count?: number;
	files_count?: number;
	followers_count?: number;
	formatted_value?: string;
	formatted_weighted_value?: string;
	id?: number;
	is_archived?: boolean;
	notes_count?: number;
	org_hidden?: boolean;
	org_id?: {
		active_flag?: boolean;
		cc_email?: string;
		label_ids?: Array<number>;
		name?: string;
		owner_id?: number;
		owner_name?: string;
		people_count?: number;
		value?: number;
	};
	origin?: string;
	owner_name?: string;
	participants_count?: number;
	person_hidden?: boolean;
	pipeline_id?: number;
	products_count?: number;
	stage_id?: number;
	stage_order_nr?: number;
	status?: string;
	title?: string;
	undone_activities_count?: number;
	update_time?: string;
	user_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	visible_to?: string;
	weighted_value_currency?: string;
};

export type PipedriveV1DealSearchOutput = {
	currency?: string;
	id?: number;
	notes?: Array<string>;
	organization?: {
		id?: number;
		name?: string;
	};
	owner?: {
		id?: number;
	};
	person?: {
		id?: number;
		name?: string;
	};
	result_score?: number;
	stage?: {
		id?: number;
		name?: string;
	};
	status?: string;
	title?: string;
	type?: string;
	visible_to?: number;
};

export type PipedriveV1DealUpdateOutput = {
	active?: boolean;
	activities_count?: number;
	add_time?: string;
	cc_email?: string;
	creator_user_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	currency?: string;
	deleted?: boolean;
	done_activities_count?: number;
	email_messages_count?: number;
	files_count?: number;
	followers_count?: number;
	formatted_value?: string;
	formatted_weighted_value?: string;
	id?: number;
	notes_count?: number;
	org_hidden?: boolean;
	owner_name?: string;
	participants_count?: number;
	person_hidden?: boolean;
	person_id?: {
		active_flag?: boolean;
		email?: Array<{
			label?: string;
			primary?: boolean;
			value?: string;
		}>;
		name?: string;
		owner_id?: number;
		phone?: Array<{
			label?: string;
			primary?: boolean;
			value?: string;
		}>;
		value?: number;
	};
	pipeline_id?: number;
	products_count?: number;
	stage_id?: number;
	stage_order_nr?: number;
	status?: string;
	title?: string;
	undone_activities_count?: number;
	update_time?: string;
	user_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	visible_to?: string;
	weighted_value_currency?: string;
};

export type PipedriveV1DealActivityGetAllOutput = {
	active_flag?: boolean;
	add_time?: string;
	assigned_to_user_id?: number;
	attendees?: null;
	busy_flag?: boolean;
	company_id?: number;
	conference_meeting_client?: null;
	conference_meeting_id?: null;
	conference_meeting_url?: null;
	created_by_user_id?: number;
	deal_dropbox_bcc?: string;
	deal_id?: number;
	deal_title?: string;
	done?: boolean;
	due_date?: string;
	due_time?: string;
	duration?: string;
	id?: number;
	is_recurring?: null;
	last_notification_time?: null;
	last_notification_user_id?: null;
	lead?: null;
	lead_id?: null;
	lead_title?: null;
	location_admin_area_level_1?: null;
	location_admin_area_level_2?: null;
	location_country?: null;
	location_formatted_address?: null;
	location_locality?: null;
	location_postal_code?: null;
	location_route?: null;
	location_street_number?: null;
	location_sublocality?: null;
	location_subpremise?: null;
	marked_as_done_time?: string;
	original_start_time?: null;
	owner_name?: string;
	private?: boolean;
	rec_master_activity_id?: null;
	rec_rule?: null;
	rec_rule_extension?: null;
	reference_id?: null;
	series?: null;
	source_timezone?: null;
	subject?: string;
	type?: string;
	type_name?: string;
	update_time?: string;
	user_id?: number;
};

export type PipedriveV1DealProductGetAllOutput = {
	active_flag?: boolean;
	add_time?: string;
	billing_frequency?: string;
	currency?: string;
	deal_id?: number;
	discount?: number;
	discount_type?: string;
	enabled_flag?: boolean;
	id?: number;
	last_edit?: string;
	name?: string;
	order_nr?: number;
	product?: null;
	product_id?: number;
	quantity?: number;
	quantity_formatted?: string;
	sum_formatted?: string;
	tax_method?: string;
};

export type PipedriveV1LeadCreateOutput = {
	add_time?: string;
	cc_email?: string;
	channel?: null;
	channel_id?: null;
	creator_id?: number;
	id?: string;
	is_archived?: boolean;
	label_ids?: Array<string>;
	next_activity_id?: null;
	origin?: string;
	origin_id?: null;
	owner_id?: number;
	source_name?: string;
	title?: string;
	update_time?: string;
	visible_to?: string;
	was_seen?: boolean;
};

export type PipedriveV1LeadGetOutput = {
	add_time?: string;
	archive_time?: null;
	cc_email?: string;
	creator_id?: number;
	db247a86f77b7a989f9c2834851c946b26718442?: string;
	id?: string;
	is_archived?: boolean;
	label_ids?: Array<string>;
	origin?: string;
	owner_id?: number;
	source_name?: string;
	title?: string;
	update_time?: string;
	visible_to?: string;
	was_seen?: boolean;
};

export type PipedriveV1LeadGetAllOutput = {
	add_time?: string;
	cc_email?: string;
	channel_id?: null;
	creator_id?: number;
	id?: string;
	is_archived?: boolean;
	label_ids?: Array<string>;
	origin?: string;
	owner_id?: number;
	source_name?: string;
	title?: string;
	update_time?: string;
	visible_to?: string;
	was_seen?: boolean;
};

export type PipedriveV1NoteCreateOutput = {
	active_flag?: boolean;
	add_time?: string;
	content?: string;
	id?: number;
	last_update_user_id?: null;
	organization?: {
		name?: string;
	};
	person?: {
		name?: string;
	};
	pinned_to_deal_flag?: boolean;
	pinned_to_lead_flag?: boolean;
	pinned_to_organization_flag?: boolean;
	pinned_to_person_flag?: boolean;
	update_time?: string;
	user?: {
		email?: string;
		is_you?: boolean;
		name?: string;
	};
	user_id?: number;
};

export type PipedriveV1NoteGetAllOutput = {
	active_flag?: boolean;
	add_time?: string;
	content?: string;
	id?: number;
	person?: {
		name?: string;
	};
	pinned_to_deal_flag?: boolean;
	pinned_to_lead_flag?: boolean;
	pinned_to_organization_flag?: boolean;
	pinned_to_person_flag?: boolean;
	pinned_to_project_flag?: boolean;
	project_id?: null;
	update_time?: string;
	user?: {
		email?: string;
		is_you?: boolean;
		name?: string;
	};
	user_id?: number;
};

export type PipedriveV1OrganizationCreateOutput = {
	active_flag?: boolean;
	activities_count?: number;
	add_time?: string;
	address_admin_area_level_1?: null;
	address_admin_area_level_2?: null;
	address_country?: null;
	address_formatted_address?: null;
	address_route?: null;
	address_sublocality?: null;
	address_subpremise?: null;
	cc_email?: string;
	closed_deals_count?: number;
	country_code?: null;
	delete_time?: null;
	done_activities_count?: number;
	edit_name?: boolean;
	email_messages_count?: number;
	files_count?: number;
	first_char?: string;
	followers_count?: number;
	id?: number;
	label_ids?: Array<number>;
	last_activity_date?: null;
	last_activity_id?: null;
	lost_deals_count?: number;
	name?: string;
	next_activity_date?: null;
	next_activity_id?: null;
	next_activity_time?: null;
	notes_count?: number;
	open_deals_count?: number;
	owner_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	owner_name?: string;
	people_count?: number;
	picture_id?: null;
	related_closed_deals_count?: number;
	related_lost_deals_count?: number;
	related_open_deals_count?: number;
	related_won_deals_count?: number;
	undone_activities_count?: number;
	update_time?: string;
	visible_to?: string;
	won_deals_count?: number;
};

export type PipedriveV1OrganizationGetOutput = {
	active_flag?: boolean;
	activities_count?: number;
	add_time?: string;
	category_id?: null;
	cc_email?: string;
	closed_deals_count?: number;
	country_code?: null;
	done_activities_count?: number;
	edit_name?: boolean;
	email_messages_count?: number;
	files_count?: number;
	first_char?: string;
	followers_count?: number;
	id?: number;
	label_ids?: Array<number>;
	lost_deals_count?: number;
	name?: string;
	next_activity_time?: null;
	notes_count?: number;
	open_deals_count?: number;
	owner_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	owner_name?: string;
	people_count?: number;
	picture_id?: null;
	related_closed_deals_count?: number;
	related_lost_deals_count?: number;
	related_open_deals_count?: number;
	related_won_deals_count?: number;
	undone_activities_count?: number;
	update_time?: string;
	visible_to?: string;
	won_deals_count?: number;
};

export type PipedriveV1OrganizationGetAllOutput = {
	active_flag?: boolean;
	activities_count?: number;
	add_time?: string;
	cc_email?: string;
	closed_deals_count?: number;
	company_id?: number;
	country_code?: null;
	delete_time?: null;
	done_activities_count?: number;
	email_messages_count?: number;
	files_count?: number;
	first_char?: string;
	followers_count?: number;
	id?: number;
	label_ids?: Array<number>;
	lost_deals_count?: number;
	name?: string;
	notes_count?: number;
	open_deals_count?: number;
	owner_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	owner_name?: string;
	people_count?: number;
	picture_id?: null;
	related_closed_deals_count?: number;
	related_lost_deals_count?: number;
	related_open_deals_count?: number;
	related_won_deals_count?: number;
	undone_activities_count?: number;
	update_time?: string;
	visible_to?: string;
	won_deals_count?: number;
};

export type PipedriveV1OrganizationSearchOutput = {
	custom_fields?: Array<string>;
	id?: number;
	name?: string;
	notes?: Array<string>;
	owner?: {
		id?: number;
	};
	result_score?: number;
	type?: string;
	visible_to?: number;
};

export type PipedriveV1OrganizationUpdateOutput = {
	active_flag?: boolean;
	activities_count?: number;
	add_time?: string;
	annual_revenue?: null;
	cc_email?: string;
	closed_deals_count?: number;
	country_code?: null;
	delete_time?: null;
	done_activities_count?: number;
	email_messages_count?: number;
	employee_count?: null;
	files_count?: number;
	first_char?: string;
	followers_count?: number;
	id?: number;
	industry?: null;
	label_ids?: Array<number>;
	linkedin?: null;
	lost_deals_count?: number;
	name?: string;
	notes_count?: number;
	open_deals_count?: number;
	owner_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	owner_name?: string;
	people_count?: number;
	picture_id?: null;
	related_closed_deals_count?: number;
	related_lost_deals_count?: number;
	related_open_deals_count?: number;
	related_won_deals_count?: number;
	undone_activities_count?: number;
	update_time?: string;
	visible_to?: string;
	website?: null;
	won_deals_count?: number;
};

export type PipedriveV1PersonCreateOutput = {
	active_flag?: boolean;
	activities_count?: number;
	add_time?: string;
	birthday?: null;
	cc_email?: string;
	closed_deals_count?: number;
	delete_time?: null;
	done_activities_count?: number;
	email?: Array<{
		label?: string;
		primary?: boolean;
		value?: string;
	}>;
	email_messages_count?: number;
	files_count?: number;
	first_char?: string;
	followers_count?: number;
	id?: number;
	im?: Array<{
		primary?: boolean;
		value?: string;
	}>;
	label_ids?: Array<number>;
	last_activity_date?: null;
	last_activity_id?: null;
	last_incoming_mail_time?: null;
	last_outgoing_mail_time?: null;
	lost_deals_count?: number;
	name?: string;
	next_activity_date?: null;
	next_activity_id?: null;
	next_activity_time?: null;
	notes_count?: number;
	open_deals_count?: number;
	owner_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	owner_name?: string;
	participant_closed_deals_count?: number;
	participant_open_deals_count?: number;
	phone?: Array<{
		label?: string;
		primary?: boolean;
		value?: string;
	}>;
	picture_id?: null;
	postal_address_admin_area_level_1?: null;
	postal_address_admin_area_level_2?: null;
	postal_address_country?: null;
	postal_address_formatted_address?: null;
	postal_address_lat?: null;
	postal_address_locality?: null;
	postal_address_long?: null;
	postal_address_postal_code?: null;
	postal_address_route?: null;
	postal_address_street_number?: null;
	postal_address_sublocality?: null;
	postal_address_subpremise?: null;
	related_closed_deals_count?: number;
	related_lost_deals_count?: number;
	related_open_deals_count?: number;
	related_won_deals_count?: number;
	undone_activities_count?: number;
	update_time?: string;
	visible_to?: string;
	won_deals_count?: number;
};

export type PipedriveV1PersonGetOutput = {
	active_flag?: boolean;
	activities_count?: number;
	add_time?: string;
	birthday?: null;
	cc_email?: string;
	closed_deals_count?: number;
	company_id?: number;
	done_activities_count?: number;
	email?: Array<{
		label?: string;
		primary?: boolean;
		value?: string;
	}>;
	email_messages_count?: number;
	files_count?: number;
	first_char?: string;
	first_name?: string;
	followers_count?: number;
	id?: number;
	im?: Array<{
		primary?: boolean;
		value?: string;
	}>;
	label_ids?: Array<number>;
	lost_deals_count?: number;
	name?: string;
	notes_count?: number;
	open_deals_count?: number;
	org_id?: {
		active_flag?: boolean;
		cc_email?: string;
		label_ids?: Array<number>;
		name?: string;
		owner_id?: number;
		owner_name?: string;
		people_count?: number;
		value?: number;
	};
	owner_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	owner_name?: string;
	participant_closed_deals_count?: number;
	participant_open_deals_count?: number;
	phone?: Array<{
		label?: string;
		primary?: boolean;
		value?: string;
	}>;
	postal_address_admin_area_level_1?: null;
	postal_address_admin_area_level_2?: null;
	postal_address_country?: null;
	postal_address_formatted_address?: null;
	postal_address_lat?: null;
	postal_address_locality?: null;
	postal_address_long?: null;
	postal_address_postal_code?: null;
	postal_address_route?: null;
	postal_address_street_number?: null;
	postal_address_sublocality?: null;
	postal_address_subpremise?: null;
	related_closed_deals_count?: number;
	related_lost_deals_count?: number;
	related_open_deals_count?: number;
	related_won_deals_count?: number;
	undone_activities_count?: number;
	update_time?: string;
	visible_to?: string;
	won_deals_count?: number;
};

export type PipedriveV1PersonGetAllOutput = {
	active_flag?: boolean;
	activities_count?: number;
	add_time?: string;
	birthday?: null;
	cc_email?: string;
	closed_deals_count?: number;
	company_id?: number;
	delete_time?: null;
	done_activities_count?: number;
	email?: Array<{
		label?: string;
		primary?: boolean;
		value?: string;
	}>;
	email_messages_count?: number;
	files_count?: number;
	first_char?: string;
	first_name?: string;
	followers_count?: number;
	id?: number;
	im?: Array<{
		primary?: boolean;
		value?: string;
	}>;
	label_ids?: Array<number>;
	lost_deals_count?: number;
	name?: string;
	notes_count?: number;
	open_deals_count?: number;
	owner_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	owner_name?: string;
	participant_closed_deals_count?: number;
	participant_open_deals_count?: number;
	phone?: Array<{
		label?: string;
		primary?: boolean;
		value?: string;
	}>;
	postal_address_lat?: null;
	postal_address_long?: null;
	postal_address_subpremise?: null;
	related_closed_deals_count?: number;
	related_lost_deals_count?: number;
	related_open_deals_count?: number;
	related_won_deals_count?: number;
	undone_activities_count?: number;
	update_time?: string;
	visible_to?: string;
	won_deals_count?: number;
};

export type PipedriveV1PersonSearchOutput = {
	custom_fields?: Array<string>;
	emails?: Array<string>;
	id?: number;
	name?: string;
	notes?: Array<string>;
	organization?: {
		id?: number;
		name?: string;
	};
	owner?: {
		id?: number;
	};
	phones?: Array<string>;
	result_score?: number;
	type?: string;
	update_time?: string;
	visible_to?: number;
};

export type PipedriveV1PersonUpdateOutput = {
	active_flag?: boolean;
	activities_count?: number;
	add_time?: string;
	cc_email?: string;
	closed_deals_count?: number;
	company_id?: number;
	delete_time?: null;
	done_activities_count?: number;
	email?: Array<{
		label?: string;
		primary?: boolean;
		value?: string;
	}>;
	email_messages_count?: number;
	files_count?: number;
	first_char?: string;
	first_name?: string;
	followers_count?: number;
	id?: number;
	im?: Array<{
		primary?: boolean;
		value?: string;
	}>;
	label_ids?: Array<number>;
	lost_deals_count?: number;
	name?: string;
	notes_count?: number;
	open_deals_count?: number;
	org_id?: {
		active_flag?: boolean;
		cc_email?: string;
		label_ids?: Array<number>;
		name?: string;
		owner_id?: number;
		owner_name?: string;
		people_count?: number;
		value?: number;
	};
	owner_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		value?: number;
	};
	owner_name?: string;
	participant_closed_deals_count?: number;
	participant_open_deals_count?: number;
	phone?: Array<{
		label?: string;
		primary?: boolean;
		value?: string;
	}>;
	postal_address_lat?: null;
	postal_address_long?: null;
	postal_address_subpremise?: null;
	related_closed_deals_count?: number;
	related_lost_deals_count?: number;
	related_open_deals_count?: number;
	related_won_deals_count?: number;
	undone_activities_count?: number;
	update_time?: string;
	visible_to?: string;
	won_deals_count?: number;
};

export type PipedriveV1ProductGetAllOutput = {
	'1e901332a0666ef17792122457262233cfdb3d15'?: null;
	'73794f1db542a544402ab6cd42aaf337d2d8e51b'?: null;
	active_flag?: boolean;
	add_time?: string;
	billing_frequency?: string;
	billing_frequency_cycles?: null;
	first_char?: string;
	id?: number;
	name?: string;
	owner_id?: {
		active_flag?: boolean;
		email?: string;
		has_pic?: number;
		id?: number;
		name?: string;
		pic_hash?: null;
		value?: number;
	};
	prices?: Array<{
		currency?: string;
		id?: number;
		notes?: string;
		product_id?: number;
	}>;
	product_variations?: Array<{
		id?: number;
		name?: string;
		prices?: Array<{
			comment?: string;
			cost?: number;
			currency?: string;
			id?: number;
			overhead_cost?: number;
			price?: number;
			price_formatted?: string;
			product_id?: number;
			product_variation_id?: number;
		}>;
		product_id?: number;
	}>;
	selectable?: boolean;
	tax?: number;
	update_time?: string;
	visible_to?: string;
};

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

interface PipedriveV1NodeBase {
	type: 'n8n-nodes-base.pipedrive';
	version: 1;
	credentials?: PipedriveV1Credentials;
}

export type PipedriveV1ActivityCreateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1ActivityCreateConfig>;
	output?: PipedriveV1ActivityCreateOutput;
};

export type PipedriveV1ActivityDeleteNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1ActivityDeleteConfig>;
};

export type PipedriveV1ActivityGetNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1ActivityGetConfig>;
	output?: PipedriveV1ActivityGetOutput;
};

export type PipedriveV1ActivityGetAllNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1ActivityGetAllConfig>;
	output?: PipedriveV1ActivityGetAllOutput;
};

export type PipedriveV1ActivityUpdateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1ActivityUpdateConfig>;
	output?: PipedriveV1ActivityUpdateOutput;
};

export type PipedriveV1DealCreateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1DealCreateConfig>;
	output?: PipedriveV1DealCreateOutput;
};

export type PipedriveV1DealDeleteNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1DealDeleteConfig>;
	output?: PipedriveV1DealDeleteOutput;
};

export type PipedriveV1DealDuplicateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1DealDuplicateConfig>;
};

export type PipedriveV1DealGetNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1DealGetConfig>;
	output?: PipedriveV1DealGetOutput;
};

export type PipedriveV1DealGetAllNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1DealGetAllConfig>;
	output?: PipedriveV1DealGetAllOutput;
};

export type PipedriveV1DealSearchNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1DealSearchConfig>;
	output?: PipedriveV1DealSearchOutput;
};

export type PipedriveV1DealUpdateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1DealUpdateConfig>;
	output?: PipedriveV1DealUpdateOutput;
};

export type PipedriveV1DealActivityGetAllNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1DealActivityGetAllConfig>;
	output?: PipedriveV1DealActivityGetAllOutput;
};

export type PipedriveV1DealProductAddNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1DealProductAddConfig>;
};

export type PipedriveV1DealProductGetAllNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1DealProductGetAllConfig>;
	output?: PipedriveV1DealProductGetAllOutput;
};

export type PipedriveV1DealProductRemoveNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1DealProductRemoveConfig>;
};

export type PipedriveV1DealProductUpdateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1DealProductUpdateConfig>;
};

export type PipedriveV1FileCreateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1FileCreateConfig>;
};

export type PipedriveV1FileDeleteNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1FileDeleteConfig>;
};

export type PipedriveV1FileDownloadNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1FileDownloadConfig>;
};

export type PipedriveV1FileGetNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1FileGetConfig>;
};

export type PipedriveV1FileUpdateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1FileUpdateConfig>;
};

export type PipedriveV1LeadCreateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1LeadCreateConfig>;
	output?: PipedriveV1LeadCreateOutput;
};

export type PipedriveV1LeadDeleteNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1LeadDeleteConfig>;
};

export type PipedriveV1LeadGetNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1LeadGetConfig>;
	output?: PipedriveV1LeadGetOutput;
};

export type PipedriveV1LeadGetAllNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1LeadGetAllConfig>;
	output?: PipedriveV1LeadGetAllOutput;
};

export type PipedriveV1LeadUpdateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1LeadUpdateConfig>;
};

export type PipedriveV1NoteCreateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1NoteCreateConfig>;
	output?: PipedriveV1NoteCreateOutput;
};

export type PipedriveV1NoteDeleteNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1NoteDeleteConfig>;
};

export type PipedriveV1NoteGetNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1NoteGetConfig>;
};

export type PipedriveV1NoteGetAllNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1NoteGetAllConfig>;
	output?: PipedriveV1NoteGetAllOutput;
};

export type PipedriveV1NoteUpdateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1NoteUpdateConfig>;
};

export type PipedriveV1OrganizationCreateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1OrganizationCreateConfig>;
	output?: PipedriveV1OrganizationCreateOutput;
};

export type PipedriveV1OrganizationDeleteNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1OrganizationDeleteConfig>;
};

export type PipedriveV1OrganizationGetNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1OrganizationGetConfig>;
	output?: PipedriveV1OrganizationGetOutput;
};

export type PipedriveV1OrganizationGetAllNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1OrganizationGetAllConfig>;
	output?: PipedriveV1OrganizationGetAllOutput;
};

export type PipedriveV1OrganizationSearchNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1OrganizationSearchConfig>;
	output?: PipedriveV1OrganizationSearchOutput;
};

export type PipedriveV1OrganizationUpdateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1OrganizationUpdateConfig>;
	output?: PipedriveV1OrganizationUpdateOutput;
};

export type PipedriveV1PersonCreateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1PersonCreateConfig>;
	output?: PipedriveV1PersonCreateOutput;
};

export type PipedriveV1PersonDeleteNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1PersonDeleteConfig>;
};

export type PipedriveV1PersonGetNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1PersonGetConfig>;
	output?: PipedriveV1PersonGetOutput;
};

export type PipedriveV1PersonGetAllNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1PersonGetAllConfig>;
	output?: PipedriveV1PersonGetAllOutput;
};

export type PipedriveV1PersonSearchNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1PersonSearchConfig>;
	output?: PipedriveV1PersonSearchOutput;
};

export type PipedriveV1PersonUpdateNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1PersonUpdateConfig>;
	output?: PipedriveV1PersonUpdateOutput;
};

export type PipedriveV1ProductGetAllNode = PipedriveV1NodeBase & {
	config: NodeConfig<PipedriveV1ProductGetAllConfig>;
	output?: PipedriveV1ProductGetAllOutput;
};

export type PipedriveV1Node =
	| PipedriveV1ActivityCreateNode
	| PipedriveV1ActivityDeleteNode
	| PipedriveV1ActivityGetNode
	| PipedriveV1ActivityGetAllNode
	| PipedriveV1ActivityUpdateNode
	| PipedriveV1DealCreateNode
	| PipedriveV1DealDeleteNode
	| PipedriveV1DealDuplicateNode
	| PipedriveV1DealGetNode
	| PipedriveV1DealGetAllNode
	| PipedriveV1DealSearchNode
	| PipedriveV1DealUpdateNode
	| PipedriveV1DealActivityGetAllNode
	| PipedriveV1DealProductAddNode
	| PipedriveV1DealProductGetAllNode
	| PipedriveV1DealProductRemoveNode
	| PipedriveV1DealProductUpdateNode
	| PipedriveV1FileCreateNode
	| PipedriveV1FileDeleteNode
	| PipedriveV1FileDownloadNode
	| PipedriveV1FileGetNode
	| PipedriveV1FileUpdateNode
	| PipedriveV1LeadCreateNode
	| PipedriveV1LeadDeleteNode
	| PipedriveV1LeadGetNode
	| PipedriveV1LeadGetAllNode
	| PipedriveV1LeadUpdateNode
	| PipedriveV1NoteCreateNode
	| PipedriveV1NoteDeleteNode
	| PipedriveV1NoteGetNode
	| PipedriveV1NoteGetAllNode
	| PipedriveV1NoteUpdateNode
	| PipedriveV1OrganizationCreateNode
	| PipedriveV1OrganizationDeleteNode
	| PipedriveV1OrganizationGetNode
	| PipedriveV1OrganizationGetAllNode
	| PipedriveV1OrganizationSearchNode
	| PipedriveV1OrganizationUpdateNode
	| PipedriveV1PersonCreateNode
	| PipedriveV1PersonDeleteNode
	| PipedriveV1PersonGetNode
	| PipedriveV1PersonGetAllNode
	| PipedriveV1PersonSearchNode
	| PipedriveV1PersonUpdateNode
	| PipedriveV1ProductGetAllNode
	;