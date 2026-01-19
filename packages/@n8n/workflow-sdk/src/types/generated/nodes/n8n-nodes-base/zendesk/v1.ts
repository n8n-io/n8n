/**
 * Zendesk Node - Version 1
 * Consume Zendesk API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support */
export type ZendeskV1TicketCreateConfig = {
	resource: 'ticket';
	operation: 'create';
/**
 * The first comment on the ticket
 * @displayOptions.show { resource: ["ticket"], operation: ["create"] }
 */
		description: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
/**
 * Object of values to set as described &lt;a href="https://developer.zendesk.com/rest_api/docs/support/tickets"&gt;here&lt;/a&gt;
 * @displayOptions.show { resource: ["ticket"], operation: ["create"], jsonParameters: [true] }
 */
		additionalFieldsJson?: IDataObject | string | Expression<string>;
};

/** Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support */
export type ZendeskV1TicketDeleteConfig = {
	resource: 'ticket';
	operation: 'delete';
	ticketType: 'regular' | 'suspended' | Expression<string>;
	id: string | Expression<string>;
};

/** Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support */
export type ZendeskV1TicketGetConfig = {
	resource: 'ticket';
	operation: 'get';
	ticketType: 'regular' | 'suspended' | Expression<string>;
	id: string | Expression<string>;
};

/** Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support */
export type ZendeskV1TicketGetAllConfig = {
	resource: 'ticket';
	operation: 'getAll';
	ticketType: 'regular' | 'suspended' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["ticket"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["ticket"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support */
export type ZendeskV1TicketRecoverConfig = {
	resource: 'ticket';
	operation: 'recover';
	id: string | Expression<string>;
};

/** Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support */
export type ZendeskV1TicketUpdateConfig = {
	resource: 'ticket';
	operation: 'update';
	id: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
/**
 * Object of values to update as described &lt;a href="https://developer.zendesk.com/rest_api/docs/support/tickets"&gt;here&lt;/a&gt;
 * @displayOptions.show { resource: ["ticket"], operation: ["update"], jsonParameters: [true] }
 */
		updateFieldsJson?: IDataObject | string | Expression<string>;
};

/** Manage system and custom ticket fields */
export type ZendeskV1TicketFieldGetConfig = {
	resource: 'ticketField';
	operation: 'get';
	ticketFieldId: string | Expression<string>;
};

/** Manage system and custom ticket fields */
export type ZendeskV1TicketFieldGetAllConfig = {
	resource: 'ticketField';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["ticketField"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["ticketField"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Manage users */
export type ZendeskV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
/**
 * The user's name
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Manage users */
export type ZendeskV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
	id: string | Expression<string>;
};

/** Manage users */
export type ZendeskV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	id: string | Expression<string>;
};

/** Manage users */
export type ZendeskV1UserGetAllConfig = {
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
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Manage users */
export type ZendeskV1UserGetOrganizationsConfig = {
	resource: 'user';
	operation: 'getOrganizations';
	id: string | Expression<string>;
};

/** Manage users */
export type ZendeskV1UserGetRelatedDataConfig = {
	resource: 'user';
	operation: 'getRelatedData';
	id: string | Expression<string>;
};

/** Manage users */
export type ZendeskV1UserSearchConfig = {
	resource: 'user';
	operation: 'search';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["search"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Manage users */
export type ZendeskV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Manage organizations */
export type ZendeskV1OrganizationCountConfig = {
	resource: 'organization';
	operation: 'count';
};

/** Manage organizations */
export type ZendeskV1OrganizationCreateConfig = {
	resource: 'organization';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Manage organizations */
export type ZendeskV1OrganizationDeleteConfig = {
	resource: 'organization';
	operation: 'delete';
	id: string | Expression<string>;
};

/** Manage organizations */
export type ZendeskV1OrganizationGetConfig = {
	resource: 'organization';
	operation: 'get';
	id: string | Expression<string>;
};

/** Manage organizations */
export type ZendeskV1OrganizationGetAllConfig = {
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
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Manage organizations */
export type ZendeskV1OrganizationGetRelatedDataConfig = {
	resource: 'organization';
	operation: 'getRelatedData';
	id: string | Expression<string>;
};

/** Manage organizations */
export type ZendeskV1OrganizationUpdateConfig = {
	resource: 'organization';
	operation: 'update';
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type ZendeskV1Params =
	| ZendeskV1TicketCreateConfig
	| ZendeskV1TicketDeleteConfig
	| ZendeskV1TicketGetConfig
	| ZendeskV1TicketGetAllConfig
	| ZendeskV1TicketRecoverConfig
	| ZendeskV1TicketUpdateConfig
	| ZendeskV1TicketFieldGetConfig
	| ZendeskV1TicketFieldGetAllConfig
	| ZendeskV1UserCreateConfig
	| ZendeskV1UserDeleteConfig
	| ZendeskV1UserGetConfig
	| ZendeskV1UserGetAllConfig
	| ZendeskV1UserGetOrganizationsConfig
	| ZendeskV1UserGetRelatedDataConfig
	| ZendeskV1UserSearchConfig
	| ZendeskV1UserUpdateConfig
	| ZendeskV1OrganizationCountConfig
	| ZendeskV1OrganizationCreateConfig
	| ZendeskV1OrganizationDeleteConfig
	| ZendeskV1OrganizationGetConfig
	| ZendeskV1OrganizationGetAllConfig
	| ZendeskV1OrganizationGetRelatedDataConfig
	| ZendeskV1OrganizationUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type ZendeskV1TicketCreateOutput = {
	allow_attachments?: boolean;
	allow_channelback?: boolean;
	brand_id?: number;
	collaborator_ids?: Array<number>;
	created_at?: string;
	custom_fields?: Array<{
		id?: number;
	}>;
	custom_status_id?: number;
	description?: string;
	due_at?: null;
	encoded_id?: string;
	fields?: Array<{
		id?: number;
	}>;
	follower_ids?: Array<number>;
	forum_topic_id?: null;
	from_messaging_channel?: boolean;
	generated_timestamp?: number;
	has_incidents?: boolean;
	id?: number;
	is_public?: boolean;
	problem_id?: null;
	requester_id?: number;
	satisfaction_rating?: {
		score?: string;
	};
	status?: string;
	submitter_id?: number;
	tags?: Array<string>;
	ticket_form_id?: number;
	updated_at?: string;
	url?: string;
	via?: {
		channel?: string;
		source?: {
			rel?: null;
		};
	};
};

export type ZendeskV1TicketGetOutput = {
	allow_attachments?: boolean;
	allow_channelback?: boolean;
	brand_id?: number;
	collaborator_ids?: Array<number>;
	created_at?: string;
	custom_fields?: Array<{
		id?: number;
	}>;
	custom_status_id?: number;
	description?: string;
	due_at?: null;
	email_cc_ids?: Array<number>;
	encoded_id?: string;
	fields?: Array<{
		id?: number;
	}>;
	follower_ids?: Array<number>;
	followup_ids?: Array<number>;
	forum_topic_id?: null;
	from_messaging_channel?: boolean;
	generated_timestamp?: number;
	has_incidents?: boolean;
	id?: number;
	is_public?: boolean;
	problem_id?: null;
	requester_id?: number;
	satisfaction_rating?: {
		score?: string;
	};
	status?: string;
	submitter_id?: number;
	tags?: Array<string>;
	ticket_form_id?: number;
	updated_at?: string;
	url?: string;
	via?: {
		channel?: string;
	};
};

export type ZendeskV1TicketGetAllOutput = {
	allow_attachments?: boolean;
	allow_channelback?: boolean;
	brand_id?: number;
	collaborator_ids?: Array<number>;
	created_at?: string;
	custom_fields?: Array<{
		id?: number;
	}>;
	custom_status_id?: number;
	description?: string;
	email_cc_ids?: Array<number>;
	encoded_id?: string;
	fields?: Array<{
		id?: number;
	}>;
	follower_ids?: Array<number>;
	followup_ids?: Array<number>;
	forum_topic_id?: null;
	from_messaging_channel?: boolean;
	generated_timestamp?: number;
	has_incidents?: boolean;
	id?: number;
	is_public?: boolean;
	problem_id?: null;
	requester_id?: number;
	result_type?: string;
	satisfaction_rating?: {
		score?: string;
	};
	status?: string;
	submitter_id?: number;
	tags?: Array<string>;
	updated_at?: string;
	url?: string;
	via?: {
		channel?: string;
	};
};

export type ZendeskV1TicketUpdateOutput = {
	allow_attachments?: boolean;
	allow_channelback?: boolean;
	brand_id?: number;
	collaborator_ids?: Array<number>;
	created_at?: string;
	custom_fields?: Array<{
		id?: number;
	}>;
	custom_status_id?: number;
	description?: string;
	due_at?: null;
	email_cc_ids?: Array<number>;
	encoded_id?: string;
	fields?: Array<{
		id?: number;
	}>;
	follower_ids?: Array<number>;
	forum_topic_id?: null;
	from_messaging_channel?: boolean;
	generated_timestamp?: number;
	has_incidents?: boolean;
	id?: number;
	is_public?: boolean;
	problem_id?: null;
	requester_id?: number;
	satisfaction_rating?: {
		score?: string;
	};
	status?: string;
	submitter_id?: number;
	tags?: Array<string>;
	ticket_form_id?: number;
	updated_at?: string;
	url?: string;
	via?: {
		channel?: string;
	};
};

export type ZendeskV1TicketFieldGetAllOutput = {
	active?: boolean;
	collapsed_for_agents?: boolean;
	created_at?: string;
	custom_field_options?: Array<{
		'default'?: boolean;
		id?: number;
		name?: string;
		raw_name?: string;
		value?: string;
	}>;
	description?: string;
	editable_in_portal?: boolean;
	id?: number;
	key?: null;
	position?: number;
	raw_description?: string;
	raw_title?: string;
	raw_title_in_portal?: string;
	regexp_for_validation?: null;
	removable?: boolean;
	required?: boolean;
	required_in_portal?: boolean;
	tag?: null;
	title?: string;
	title_in_portal?: string;
	type?: string;
	updated_at?: string;
	url?: string;
	visible_in_portal?: boolean;
};

export type ZendeskV1UserCreateOutput = {
	active?: boolean;
	alias?: null;
	created_at?: string;
	custom_role_id?: null;
	default_group_id?: null;
	details?: null;
	iana_time_zone?: string;
	id?: number;
	last_active?: string;
	last_login_at?: null;
	locale?: string;
	locale_id?: number;
	moderator?: boolean;
	name?: string;
	only_private_comments?: boolean;
	organization_id?: null;
	photo?: null;
	report_csv?: boolean;
	restricted_agent?: boolean;
	role?: string;
	role_type?: null;
	shared?: boolean;
	shared_agent?: boolean;
	signature?: null;
	suspended?: boolean;
	tags?: Array<string>;
	ticket_restriction?: string;
	time_zone?: string;
	two_factor_auth_enabled?: null;
	updated_at?: string;
	url?: string;
	verified?: boolean;
};

export type ZendeskV1UserGetOutput = {
	active?: boolean;
	created_at?: string;
	iana_time_zone?: string;
	id?: number;
	locale?: string;
	locale_id?: number;
	moderator?: boolean;
	name?: string;
	only_private_comments?: boolean;
	report_csv?: boolean;
	restricted_agent?: boolean;
	role?: string;
	shared?: boolean;
	shared_agent?: boolean;
	suspended?: boolean;
	tags?: Array<string>;
	time_zone?: string;
	updated_at?: string;
	url?: string;
	verified?: boolean;
};

export type ZendeskV1UserGetAllOutput = {
	active?: boolean;
	created_at?: string;
	iana_time_zone?: string;
	id?: number;
	locale?: string;
	locale_id?: number;
	moderator?: boolean;
	name?: string;
	only_private_comments?: boolean;
	report_csv?: boolean;
	restricted_agent?: boolean;
	role?: string;
	shared?: boolean;
	shared_agent?: boolean;
	suspended?: boolean;
	tags?: Array<string>;
	time_zone?: string;
	two_factor_auth_enabled?: null;
	updated_at?: string;
	url?: string;
	verified?: boolean;
};

export type ZendeskV1UserGetRelatedDataOutput = {
	assigned_tickets?: number;
	ccd_tickets?: number;
	followed_tickets?: number;
	organization_subscriptions?: number;
	requested_tickets?: number;
};

export type ZendeskV1UserSearchOutput = {
	active?: boolean;
	created_at?: string;
	iana_time_zone?: string;
	id?: number;
	locale?: string;
	locale_id?: number;
	moderator?: boolean;
	name?: string;
	only_private_comments?: boolean;
	report_csv?: boolean;
	restricted_agent?: boolean;
	role?: string;
	shared?: boolean;
	shared_agent?: boolean;
	suspended?: boolean;
	tags?: Array<string>;
	time_zone?: string;
	two_factor_auth_enabled?: null;
	updated_at?: string;
	url?: string;
	verified?: boolean;
};

export type ZendeskV1OrganizationGetAllOutput = {
	created_at?: string;
	domain_names?: Array<string>;
	id?: number;
	name?: string;
	shared_comments?: boolean;
	shared_tickets?: boolean;
	tags?: Array<string>;
	updated_at?: string;
	url?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface ZendeskV1Credentials {
	zendeskApi: CredentialReference;
	zendeskOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ZendeskV1NodeBase {
	type: 'n8n-nodes-base.zendesk';
	version: 1;
	credentials?: ZendeskV1Credentials;
}

export type ZendeskV1TicketCreateNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1TicketCreateConfig>;
	output?: ZendeskV1TicketCreateOutput;
};

export type ZendeskV1TicketDeleteNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1TicketDeleteConfig>;
};

export type ZendeskV1TicketGetNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1TicketGetConfig>;
	output?: ZendeskV1TicketGetOutput;
};

export type ZendeskV1TicketGetAllNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1TicketGetAllConfig>;
	output?: ZendeskV1TicketGetAllOutput;
};

export type ZendeskV1TicketRecoverNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1TicketRecoverConfig>;
};

export type ZendeskV1TicketUpdateNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1TicketUpdateConfig>;
	output?: ZendeskV1TicketUpdateOutput;
};

export type ZendeskV1TicketFieldGetNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1TicketFieldGetConfig>;
};

export type ZendeskV1TicketFieldGetAllNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1TicketFieldGetAllConfig>;
	output?: ZendeskV1TicketFieldGetAllOutput;
};

export type ZendeskV1UserCreateNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1UserCreateConfig>;
	output?: ZendeskV1UserCreateOutput;
};

export type ZendeskV1UserDeleteNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1UserDeleteConfig>;
};

export type ZendeskV1UserGetNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1UserGetConfig>;
	output?: ZendeskV1UserGetOutput;
};

export type ZendeskV1UserGetAllNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1UserGetAllConfig>;
	output?: ZendeskV1UserGetAllOutput;
};

export type ZendeskV1UserGetOrganizationsNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1UserGetOrganizationsConfig>;
};

export type ZendeskV1UserGetRelatedDataNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1UserGetRelatedDataConfig>;
	output?: ZendeskV1UserGetRelatedDataOutput;
};

export type ZendeskV1UserSearchNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1UserSearchConfig>;
	output?: ZendeskV1UserSearchOutput;
};

export type ZendeskV1UserUpdateNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1UserUpdateConfig>;
};

export type ZendeskV1OrganizationCountNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1OrganizationCountConfig>;
};

export type ZendeskV1OrganizationCreateNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1OrganizationCreateConfig>;
};

export type ZendeskV1OrganizationDeleteNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1OrganizationDeleteConfig>;
};

export type ZendeskV1OrganizationGetNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1OrganizationGetConfig>;
};

export type ZendeskV1OrganizationGetAllNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1OrganizationGetAllConfig>;
	output?: ZendeskV1OrganizationGetAllOutput;
};

export type ZendeskV1OrganizationGetRelatedDataNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1OrganizationGetRelatedDataConfig>;
};

export type ZendeskV1OrganizationUpdateNode = ZendeskV1NodeBase & {
	config: NodeConfig<ZendeskV1OrganizationUpdateConfig>;
};

export type ZendeskV1Node =
	| ZendeskV1TicketCreateNode
	| ZendeskV1TicketDeleteNode
	| ZendeskV1TicketGetNode
	| ZendeskV1TicketGetAllNode
	| ZendeskV1TicketRecoverNode
	| ZendeskV1TicketUpdateNode
	| ZendeskV1TicketFieldGetNode
	| ZendeskV1TicketFieldGetAllNode
	| ZendeskV1UserCreateNode
	| ZendeskV1UserDeleteNode
	| ZendeskV1UserGetNode
	| ZendeskV1UserGetAllNode
	| ZendeskV1UserGetOrganizationsNode
	| ZendeskV1UserGetRelatedDataNode
	| ZendeskV1UserSearchNode
	| ZendeskV1UserUpdateNode
	| ZendeskV1OrganizationCountNode
	| ZendeskV1OrganizationCreateNode
	| ZendeskV1OrganizationDeleteNode
	| ZendeskV1OrganizationGetNode
	| ZendeskV1OrganizationGetAllNode
	| ZendeskV1OrganizationGetRelatedDataNode
	| ZendeskV1OrganizationUpdateNode
	;