/**
 * Mailchimp Node - Version 1
 * Consume Mailchimp API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Delete a member on list */
export type MailchimpV1CampaignDeleteConfig = {
	resource: 'campaign';
	operation: 'delete';
/**
 * List of Campaigns
 * @displayOptions.show { resource: ["campaign"], operation: ["send", "get", "delete", "replicate", "resend"] }
 */
		campaignId: string | Expression<string>;
};

/** Get a member on list */
export type MailchimpV1CampaignGetConfig = {
	resource: 'campaign';
	operation: 'get';
/**
 * List of Campaigns
 * @displayOptions.show { resource: ["campaign"], operation: ["send", "get", "delete", "replicate", "resend"] }
 */
		campaignId: string | Expression<string>;
};

/** Get many members on a list */
export type MailchimpV1CampaignGetAllConfig = {
	resource: 'campaign';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["campaign"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["campaign"], operation: ["getAll"], returnAll: [false] }
 * @default 10
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Replicate a campaign */
export type MailchimpV1CampaignReplicateConfig = {
	resource: 'campaign';
	operation: 'replicate';
/**
 * List of Campaigns
 * @displayOptions.show { resource: ["campaign"], operation: ["send", "get", "delete", "replicate", "resend"] }
 */
		campaignId: string | Expression<string>;
};

/** Creates a Resend to Non-Openers version of this campaign */
export type MailchimpV1CampaignResendConfig = {
	resource: 'campaign';
	operation: 'resend';
/**
 * List of Campaigns
 * @displayOptions.show { resource: ["campaign"], operation: ["send", "get", "delete", "replicate", "resend"] }
 */
		campaignId: string | Expression<string>;
};

/** Send a campaign */
export type MailchimpV1CampaignSendConfig = {
	resource: 'campaign';
	operation: 'send';
/**
 * List of Campaigns
 * @displayOptions.show { resource: ["campaign"], operation: ["send", "get", "delete", "replicate", "resend"] }
 */
		campaignId: string | Expression<string>;
};

/** Get many members on a list */
export type MailchimpV1ListGroupGetAllConfig = {
	resource: 'listGroup';
	operation: 'getAll';
/**
 * List of lists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["listGroup"], operation: ["getAll"] }
 */
		list: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["listGroup"], operation: ["getAll"] }
 */
		groupCategory: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["listGroup"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["listGroup"], operation: ["getAll"], returnAll: [false] }
 * @default 500
 */
		limit?: number | Expression<number>;
};

/** Create a new member on list */
export type MailchimpV1MemberCreateConfig = {
	resource: 'member';
	operation: 'create';
/**
 * List of lists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["member"], operation: ["create"] }
 */
		list: string | Expression<string>;
/**
 * Email address for a subscriber
 * @displayOptions.show { resource: ["member"], operation: ["create"] }
 */
		email: string | Expression<string>;
/**
 * Subscriber's current status
 * @displayOptions.show { resource: ["member"], operation: ["create"] }
 */
		status: 'cleaned' | 'pending' | 'subscribed' | 'transactional' | 'unsubscribed' | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
/**
 * Subscriber location information.n
 * @displayOptions.show { resource: ["member"], operation: ["create"], jsonParameters: [false] }
 * @default {}
 */
		locationFieldsUi?: {
		locationFieldsValues?: {
			/** The location latitude
			 */
			latitude?: string | Expression<string>;
			/** The location longitude
			 */
			longitude?: string | Expression<string>;
		};
	};
/**
 * An individual merge var and value for a member
 * @displayOptions.show { resource: ["member"], operation: ["create"], jsonParameters: [false] }
 * @default {}
 */
		mergeFieldsUi?: {
		mergeFieldsValues?: Array<{
			/** Merge Field name. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			name?: string | Expression<string>;
			/** Merge field value
			 */
			value?: string | Expression<string>;
		}>;
	};
	mergeFieldsJson?: IDataObject | string | Expression<string>;
	locationJson?: IDataObject | string | Expression<string>;
	groupsUi?: {
		groupsValues?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			categoryId?: string | Expression<string>;
			/** Category Field ID
			 */
			categoryFieldId?: string | Expression<string>;
			/** Value
			 * @default false
			 */
			value?: boolean | Expression<boolean>;
		}>;
	};
	groupJson?: IDataObject | string | Expression<string>;
};

/** Delete a member on list */
export type MailchimpV1MemberDeleteConfig = {
	resource: 'member';
	operation: 'delete';
/**
 * List of lists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["member"], operation: ["delete"] }
 */
		list: string | Expression<string>;
/**
 * Member's email
 * @displayOptions.show { resource: ["member"], operation: ["delete"] }
 */
		email: string | Expression<string>;
};

/** Get a member on list */
export type MailchimpV1MemberGetConfig = {
	resource: 'member';
	operation: 'get';
/**
 * List of lists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["member"], operation: ["get"] }
 */
		list: string | Expression<string>;
/**
 * Member's email
 * @displayOptions.show { resource: ["member"], operation: ["get"] }
 */
		email: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many members on a list */
export type MailchimpV1MemberGetAllConfig = {
	resource: 'member';
	operation: 'getAll';
/**
 * List of lists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["member"], operation: ["getAll"] }
 */
		list: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["member"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["member"], operation: ["getAll"], returnAll: [false] }
 * @default 500
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a new member on list */
export type MailchimpV1MemberUpdateConfig = {
	resource: 'member';
	operation: 'update';
/**
 * List of lists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["member"], operation: ["update"] }
 */
		list: string | Expression<string>;
/**
 * Email address of the subscriber
 * @displayOptions.show { resource: ["member"], operation: ["update"] }
 */
		email: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
	mergeFieldsJson?: IDataObject | string | Expression<string>;
	locationJson?: IDataObject | string | Expression<string>;
	groupJson?: IDataObject | string | Expression<string>;
};

/** Create a new member on list */
export type MailchimpV1MemberTagCreateConfig = {
	resource: 'memberTag';
	operation: 'create';
/**
 * List of lists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["memberTag"], operation: ["create", "delete"] }
 */
		list: string | Expression<string>;
/**
 * Email address of the subscriber
 * @displayOptions.show { resource: ["memberTag"], operation: ["create", "delete"] }
 */
		email: string | Expression<string>;
	tags?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a member on list */
export type MailchimpV1MemberTagDeleteConfig = {
	resource: 'memberTag';
	operation: 'delete';
/**
 * List of lists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["memberTag"], operation: ["create", "delete"] }
 */
		list: string | Expression<string>;
/**
 * Email address of the subscriber
 * @displayOptions.show { resource: ["memberTag"], operation: ["create", "delete"] }
 */
		email: string | Expression<string>;
	tags?: string | Expression<string>;
	options?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type MailchimpV1CampaignGetAllOutput = {
	id?: string;
	settings?: {
		from_name?: string;
		reply_to?: string;
		title?: string;
	};
	status?: string;
	tracking?: {
		clicktale?: string;
		ecomm360?: boolean;
		goal_tracking?: boolean;
		google_analytics?: string;
		html_clicks?: boolean;
		opens?: boolean;
		text_clicks?: boolean;
	};
};

export type MailchimpV1MemberCreateOutput = {
	_links?: Array<{
		href?: string;
		method?: string;
		rel?: string;
		schema?: string;
		targetSchema?: string;
	}>;
	consents_to_one_to_one_messaging?: boolean;
	contact_id?: string;
	email_address?: string;
	email_client?: string;
	email_type?: string;
	full_name?: string;
	id?: string;
	ip_opt?: string;
	ip_signup?: string;
	language?: string;
	last_changed?: string;
	list_id?: string;
	location?: {
		country_code?: string;
		dstoff?: number;
		gmtoff?: number;
		region?: string;
		timezone?: string;
	};
	member_rating?: number;
	merge_fields?: {
		BIRTHDAY?: string;
		COMPANY?: string;
		FNAME?: string;
		LNAME?: string;
		PHONE?: string;
	};
	sms_phone_number?: string;
	sms_subscription_last_updated?: string;
	sms_subscription_status?: string;
	source?: string;
	stats?: {
		avg_click_rate?: number;
	};
	status?: string;
	tags?: Array<{
		id?: number;
		name?: string;
	}>;
	tags_count?: number;
	timestamp_opt?: string;
	timestamp_signup?: string;
	unique_email_id?: string;
	vip?: boolean;
	web_id?: number;
};

export type MailchimpV1MemberDeleteOutput = {
	error?: string;
};

export type MailchimpV1MemberGetOutput = {
	_links?: Array<{
		href?: string;
		method?: string;
		rel?: string;
		schema?: string;
		targetSchema?: string;
	}>;
	consents_to_one_to_one_messaging?: boolean;
	contact_id?: string;
	email_address?: string;
	email_client?: string;
	email_type?: string;
	full_name?: string;
	id?: string;
	ip_opt?: string;
	ip_signup?: string;
	language?: string;
	last_changed?: string;
	list_id?: string;
	location?: {
		country_code?: string;
		dstoff?: number;
		gmtoff?: number;
		region?: string;
		timezone?: string;
	};
	member_rating?: number;
	merge_fields?: {
		BIRTHDAY?: string;
		COMPANY?: string;
		FNAME?: string;
		LNAME?: string;
		PHONE?: string;
	};
	sms_phone_number?: string;
	sms_subscription_last_updated?: string;
	sms_subscription_status?: string;
	source?: string;
	status?: string;
	tags?: Array<{
		id?: number;
		name?: string;
	}>;
	tags_count?: number;
	timestamp_opt?: string;
	timestamp_signup?: string;
	unique_email_id?: string;
	vip?: boolean;
	web_id?: number;
};

export type MailchimpV1MemberGetAllOutput = {
	_links?: Array<{
		href?: string;
		method?: string;
		rel?: string;
		schema?: string;
		targetSchema?: string;
	}>;
	consents_to_one_to_one_messaging?: boolean;
	contact_id?: string;
	email_address?: string;
	email_client?: string;
	email_type?: string;
	full_name?: string;
	id?: string;
	ip_opt?: string;
	ip_signup?: string;
	language?: string;
	last_changed?: string;
	list_id?: string;
	location?: {
		country_code?: string;
		dstoff?: number;
		gmtoff?: number;
		region?: string;
		timezone?: string;
	};
	member_rating?: number;
	merge_fields?: {
		FNAME?: string;
		LNAME?: string;
		PHONE?: string;
	};
	sms_phone_number?: string;
	sms_subscription_last_updated?: string;
	sms_subscription_status?: string;
	source?: string;
	status?: string;
	tags?: Array<{
		id?: number;
	}>;
	tags_count?: number;
	timestamp_opt?: string;
	timestamp_signup?: string;
	unique_email_id?: string;
	vip?: boolean;
	web_id?: number;
};

export type MailchimpV1MemberUpdateOutput = {
	_links?: Array<{
		href?: string;
		method?: string;
		rel?: string;
		schema?: string;
		targetSchema?: string;
	}>;
	consents_to_one_to_one_messaging?: boolean;
	contact_id?: string;
	email_address?: string;
	email_client?: string;
	email_type?: string;
	full_name?: string;
	id?: string;
	ip_opt?: string;
	ip_signup?: string;
	language?: string;
	last_changed?: string;
	list_id?: string;
	location?: {
		country_code?: string;
		dstoff?: number;
		gmtoff?: number;
		region?: string;
		timezone?: string;
	};
	member_rating?: number;
	merge_fields?: {
		BIRTHDAY?: string;
		FNAME?: string;
		LNAME?: string;
		PHONE?: string;
	};
	sms_phone_number?: string;
	sms_subscription_last_updated?: string;
	sms_subscription_status?: string;
	source?: string;
	status?: string;
	tags?: Array<{
		id?: number;
		name?: string;
	}>;
	tags_count?: number;
	timestamp_opt?: string;
	timestamp_signup?: string;
	unique_email_id?: string;
	vip?: boolean;
	web_id?: number;
};

export type MailchimpV1MemberTagCreateOutput = {
	success?: boolean;
};

export type MailchimpV1MemberTagDeleteOutput = {
	success?: boolean;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface MailchimpV1Credentials {
	mailchimpApi: CredentialReference;
	mailchimpOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MailchimpV1NodeBase {
	type: 'n8n-nodes-base.mailchimp';
	version: 1;
	credentials?: MailchimpV1Credentials;
}

export type MailchimpV1CampaignDeleteNode = MailchimpV1NodeBase & {
	config: NodeConfig<MailchimpV1CampaignDeleteConfig>;
};

export type MailchimpV1CampaignGetNode = MailchimpV1NodeBase & {
	config: NodeConfig<MailchimpV1CampaignGetConfig>;
};

export type MailchimpV1CampaignGetAllNode = MailchimpV1NodeBase & {
	config: NodeConfig<MailchimpV1CampaignGetAllConfig>;
	output?: MailchimpV1CampaignGetAllOutput;
};

export type MailchimpV1CampaignReplicateNode = MailchimpV1NodeBase & {
	config: NodeConfig<MailchimpV1CampaignReplicateConfig>;
};

export type MailchimpV1CampaignResendNode = MailchimpV1NodeBase & {
	config: NodeConfig<MailchimpV1CampaignResendConfig>;
};

export type MailchimpV1CampaignSendNode = MailchimpV1NodeBase & {
	config: NodeConfig<MailchimpV1CampaignSendConfig>;
};

export type MailchimpV1ListGroupGetAllNode = MailchimpV1NodeBase & {
	config: NodeConfig<MailchimpV1ListGroupGetAllConfig>;
};

export type MailchimpV1MemberCreateNode = MailchimpV1NodeBase & {
	config: NodeConfig<MailchimpV1MemberCreateConfig>;
	output?: MailchimpV1MemberCreateOutput;
};

export type MailchimpV1MemberDeleteNode = MailchimpV1NodeBase & {
	config: NodeConfig<MailchimpV1MemberDeleteConfig>;
	output?: MailchimpV1MemberDeleteOutput;
};

export type MailchimpV1MemberGetNode = MailchimpV1NodeBase & {
	config: NodeConfig<MailchimpV1MemberGetConfig>;
	output?: MailchimpV1MemberGetOutput;
};

export type MailchimpV1MemberGetAllNode = MailchimpV1NodeBase & {
	config: NodeConfig<MailchimpV1MemberGetAllConfig>;
	output?: MailchimpV1MemberGetAllOutput;
};

export type MailchimpV1MemberUpdateNode = MailchimpV1NodeBase & {
	config: NodeConfig<MailchimpV1MemberUpdateConfig>;
	output?: MailchimpV1MemberUpdateOutput;
};

export type MailchimpV1MemberTagCreateNode = MailchimpV1NodeBase & {
	config: NodeConfig<MailchimpV1MemberTagCreateConfig>;
	output?: MailchimpV1MemberTagCreateOutput;
};

export type MailchimpV1MemberTagDeleteNode = MailchimpV1NodeBase & {
	config: NodeConfig<MailchimpV1MemberTagDeleteConfig>;
	output?: MailchimpV1MemberTagDeleteOutput;
};

export type MailchimpV1Node =
	| MailchimpV1CampaignDeleteNode
	| MailchimpV1CampaignGetNode
	| MailchimpV1CampaignGetAllNode
	| MailchimpV1CampaignReplicateNode
	| MailchimpV1CampaignResendNode
	| MailchimpV1CampaignSendNode
	| MailchimpV1ListGroupGetAllNode
	| MailchimpV1MemberCreateNode
	| MailchimpV1MemberDeleteNode
	| MailchimpV1MemberGetNode
	| MailchimpV1MemberGetAllNode
	| MailchimpV1MemberUpdateNode
	| MailchimpV1MemberTagCreateNode
	| MailchimpV1MemberTagDeleteNode
	;