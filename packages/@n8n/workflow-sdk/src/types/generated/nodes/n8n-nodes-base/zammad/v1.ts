/**
 * Zammad Node - Version 1
 * Consume the Zammad API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a group */
export type ZammadV1GroupCreateConfig = {
	resource: 'group';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a group */
export type ZammadV1GroupDeleteConfig = {
	resource: 'group';
	operation: 'delete';
/**
 * Group to delete. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["group"], operation: ["delete"] }
 */
		id: string | Expression<string>;
};

/** Retrieve a group */
export type ZammadV1GroupGetConfig = {
	resource: 'group';
	operation: 'get';
/**
 * Group to retrieve. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["group"], operation: ["get"] }
 */
		id: string | Expression<string>;
};

/** Get many groups */
export type ZammadV1GroupGetAllConfig = {
	resource: 'group';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["group"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["group"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update a group */
export type ZammadV1GroupUpdateConfig = {
	resource: 'group';
	operation: 'update';
/**
 * Group to update. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["group"], operation: ["update"] }
 */
		id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a group */
export type ZammadV1OrganizationCreateConfig = {
	resource: 'organization';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a group */
export type ZammadV1OrganizationDeleteConfig = {
	resource: 'organization';
	operation: 'delete';
/**
 * Organization to delete. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["organization"], operation: ["delete"] }
 */
		id: string | Expression<string>;
};

/** Retrieve a group */
export type ZammadV1OrganizationGetConfig = {
	resource: 'organization';
	operation: 'get';
/**
 * Organization to retrieve. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["organization"], operation: ["get"] }
 */
		id: string | Expression<string>;
};

/** Get many groups */
export type ZammadV1OrganizationGetAllConfig = {
	resource: 'organization';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["organization"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["organization"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update a group */
export type ZammadV1OrganizationUpdateConfig = {
	resource: 'organization';
	operation: 'update';
/**
 * Organization to update. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["organization"], operation: ["update"] }
 */
		id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a group */
export type ZammadV1TicketCreateConfig = {
	resource: 'ticket';
	operation: 'create';
/**
 * Title of the ticket to create
 * @displayOptions.show { resource: ["ticket"], operation: ["create"] }
 */
		title: string | Expression<string>;
/**
 * Group that will own the ticket to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["ticket"], operation: ["create"] }
 */
		group: string | Expression<string>;
/**
 * Email address of the customer concerned in the ticket to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["ticket"], operation: ["create"] }
 */
		customer: string | Expression<string>;
	article: {
		articleDetails?: {
			/** Subject
			 */
			subject?: string | Expression<string>;
			/** Body
			 */
			body?: string | Expression<string>;
			/** Visibility
			 * @default internal
			 */
			visibility?: 'external' | 'internal' | Expression<string>;
			/** Sender
			 * @default Agent
			 */
			sender?: 'Agent' | 'Customer' | 'System' | Expression<string>;
			/** Article Type
			 * @default note
			 */
			type?: 'chat' | 'email' | 'fax' | 'note' | 'phone' | 'sms' | Expression<string>;
			/** Reply To
			 */
			reply_to?: string | Expression<string>;
		};
	};
	additionalFields?: Record<string, unknown>;
};

/** Delete a group */
export type ZammadV1TicketDeleteConfig = {
	resource: 'ticket';
	operation: 'delete';
/**
 * Ticket to delete. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["ticket"], operation: ["delete"] }
 */
		id: string | Expression<string>;
};

/** Retrieve a group */
export type ZammadV1TicketGetConfig = {
	resource: 'ticket';
	operation: 'get';
/**
 * Ticket to retrieve. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["ticket"], operation: ["get"] }
 */
		id: string | Expression<string>;
};

/** Get many groups */
export type ZammadV1TicketGetAllConfig = {
	resource: 'ticket';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["ticket"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["ticket"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Create a group */
export type ZammadV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	firstname: string | Expression<string>;
	lastname: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a group */
export type ZammadV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
/**
 * User to delete. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["user"], operation: ["delete"] }
 */
		id: string | Expression<string>;
};

/** Retrieve a group */
export type ZammadV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
/**
 * User to retrieve. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 */
		id: string | Expression<string>;
};

/** Get many groups */
export type ZammadV1UserGetAllConfig = {
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
	filters?: Record<string, unknown>;
};

/** Retrieve currently logged-in user */
export type ZammadV1UserGetSelfConfig = {
	resource: 'user';
	operation: 'getSelf';
};

/** Update a group */
export type ZammadV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
/**
 * User to update. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["user"], operation: ["update"] }
 */
		id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type ZammadV1OrganizationGetAllOutput = {
	active?: boolean;
	cod_torre?: string;
	contrato_sla?: string;
	created_at?: string;
	created_by_id?: number;
	dom_2nd?: string;
	domain?: string;
	domain_assignment?: boolean;
	id?: number;
	id_tele?: string;
	member_ids?: Array<number>;
	name?: string;
	r7regiao?: string;
	sctntid?: string;
	secondary_member_ids?: Array<number>;
	shared?: boolean;
	stellar_case_min_score?: number;
	stellar_ia?: boolean;
	stellarcyber_cases?: boolean;
	updated_at?: string;
	updated_by_id?: number;
	vip?: boolean;
};

export type ZammadV1TicketGetOutput = {
	article_count?: number;
	articles?: Array<{
		attachments?: Array<{
			filename?: string;
			id?: number;
			preferences?: {
				'Content-Disposition'?: string;
				'Content-ID'?: string;
				'Content-Type'?: string;
				'Mime-Type'?: string;
			};
			size?: string;
			store_file_id?: number;
		}>;
		body?: string;
		content_type?: string;
		created_at?: string;
		created_by?: string;
		created_by_id?: number;
		id?: number;
		internal?: boolean;
		sender?: string;
		sender_id?: number;
		ticket_id?: number;
		type?: string;
		type_id?: number;
		updated_at?: string;
		updated_by?: string;
		updated_by_id?: number;
	}>;
	checklist_id?: null;
	create_article_sender_id?: number;
	create_article_type_id?: number;
	created_at?: string;
	created_by_id?: number;
	customer_id?: number;
	group_id?: number;
	id?: number;
	internal_issue_type?: null;
	internal_ticket?: boolean;
	note?: null;
	number?: string;
	owner_id?: number;
	preferences?: {
		escalation_calculation?: {
			calendar_id?: number;
			calendar_updated_at?: string;
			escalation_disabled?: boolean;
			first_response_at?: string;
			last_contact_at?: string;
			last_update_at?: string;
			sla_id?: number;
			sla_updated_at?: string;
		};
	};
	priority_id?: number;
	product?: string;
	resolution?: string;
	state_id?: number;
	sub_priority?: string;
	ticket_severity?: string;
	title?: string;
	type_from_ahlsell?: string;
	updated_at?: string;
	updated_by_id?: number;
	wait_for_3rd_party?: string;
};

export type ZammadV1TicketGetAllOutput = {
	article_count?: number;
	create_article_sender_id?: number;
	create_article_type_id?: number;
	created_at?: string;
	created_by_id?: number;
	customer_id?: number;
	escalation_at?: null;
	group_id?: number;
	id?: number;
	note?: null;
	number?: string;
	owner_id?: number;
	pending_time?: null;
	preferences?: {
		channel_id?: number;
	};
	priority_id?: number;
	state_id?: number;
	title?: string;
	updated_at?: string;
	updated_by_id?: number;
};

export type ZammadV1UserGetAllOutput = {
	active?: boolean;
	authorization_ids?: Array<number>;
	city?: string;
	created_at?: string;
	created_by_id?: number;
	email?: string;
	firstname?: string;
	group_ids?: {
		'1'?: Array<string>;
	};
	id?: number;
	lastname?: string;
	login?: string;
	login_failed?: number;
	mobile?: string;
	out_of_office?: boolean;
	preferences?: {
		intro?: boolean;
		locale?: string;
		notification_config?: {
			matrix?: {
				create?: {
					channel?: {
						email?: boolean;
						online?: boolean;
					};
					criteria?: {
						no?: boolean;
						owned_by_me?: boolean;
						owned_by_nobody?: boolean;
						subscribed?: boolean;
					};
				};
				escalation?: {
					channel?: {
						email?: boolean;
						online?: boolean;
					};
					criteria?: {
						no?: boolean;
						owned_by_me?: boolean;
						owned_by_nobody?: boolean;
						subscribed?: boolean;
					};
				};
				reminder_reached?: {
					channel?: {
						email?: boolean;
						online?: boolean;
					};
					criteria?: {
						no?: boolean;
						owned_by_me?: boolean;
						owned_by_nobody?: boolean;
						subscribed?: boolean;
					};
				};
				update?: {
					channel?: {
						email?: boolean;
						online?: boolean;
					};
					criteria?: {
						no?: boolean;
						owned_by_me?: boolean;
						owned_by_nobody?: boolean;
						subscribed?: boolean;
					};
				};
			};
		};
		notification_sound?: {
			enabled?: boolean;
			file?: string;
		};
		secondaryAction?: string;
		theme?: string;
		tickets_closed?: number;
		tickets_open?: number;
	};
	role_ids?: Array<number>;
	street?: string;
	two_factor_preference_ids?: Array<number>;
	updated_at?: string;
	updated_by_id?: number;
	verified?: boolean;
	vip?: boolean;
	web?: string;
	zip?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface ZammadV1Credentials {
	zammadBasicAuthApi: CredentialReference;
	zammadTokenAuthApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ZammadV1NodeBase {
	type: 'n8n-nodes-base.zammad';
	version: 1;
	credentials?: ZammadV1Credentials;
}

export type ZammadV1GroupCreateNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1GroupCreateConfig>;
};

export type ZammadV1GroupDeleteNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1GroupDeleteConfig>;
};

export type ZammadV1GroupGetNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1GroupGetConfig>;
};

export type ZammadV1GroupGetAllNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1GroupGetAllConfig>;
};

export type ZammadV1GroupUpdateNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1GroupUpdateConfig>;
};

export type ZammadV1OrganizationCreateNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1OrganizationCreateConfig>;
};

export type ZammadV1OrganizationDeleteNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1OrganizationDeleteConfig>;
};

export type ZammadV1OrganizationGetNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1OrganizationGetConfig>;
};

export type ZammadV1OrganizationGetAllNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1OrganizationGetAllConfig>;
	output?: ZammadV1OrganizationGetAllOutput;
};

export type ZammadV1OrganizationUpdateNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1OrganizationUpdateConfig>;
};

export type ZammadV1TicketCreateNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1TicketCreateConfig>;
};

export type ZammadV1TicketDeleteNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1TicketDeleteConfig>;
};

export type ZammadV1TicketGetNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1TicketGetConfig>;
	output?: ZammadV1TicketGetOutput;
};

export type ZammadV1TicketGetAllNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1TicketGetAllConfig>;
	output?: ZammadV1TicketGetAllOutput;
};

export type ZammadV1UserCreateNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1UserCreateConfig>;
};

export type ZammadV1UserDeleteNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1UserDeleteConfig>;
};

export type ZammadV1UserGetNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1UserGetConfig>;
};

export type ZammadV1UserGetAllNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1UserGetAllConfig>;
	output?: ZammadV1UserGetAllOutput;
};

export type ZammadV1UserGetSelfNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1UserGetSelfConfig>;
};

export type ZammadV1UserUpdateNode = ZammadV1NodeBase & {
	config: NodeConfig<ZammadV1UserUpdateConfig>;
};

export type ZammadV1Node =
	| ZammadV1GroupCreateNode
	| ZammadV1GroupDeleteNode
	| ZammadV1GroupGetNode
	| ZammadV1GroupGetAllNode
	| ZammadV1GroupUpdateNode
	| ZammadV1OrganizationCreateNode
	| ZammadV1OrganizationDeleteNode
	| ZammadV1OrganizationGetNode
	| ZammadV1OrganizationGetAllNode
	| ZammadV1OrganizationUpdateNode
	| ZammadV1TicketCreateNode
	| ZammadV1TicketDeleteNode
	| ZammadV1TicketGetNode
	| ZammadV1TicketGetAllNode
	| ZammadV1UserCreateNode
	| ZammadV1UserDeleteNode
	| ZammadV1UserGetNode
	| ZammadV1UserGetAllNode
	| ZammadV1UserGetSelfNode
	| ZammadV1UserUpdateNode
	;