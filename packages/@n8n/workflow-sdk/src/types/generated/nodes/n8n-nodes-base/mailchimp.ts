/**
 * Mailchimp Node Types
 *
 * Consume Mailchimp API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mailchimp/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Delete a member on list */
export type MailchimpV1CampaignDeleteConfig = {
	resource: 'campaign';
	operation: 'delete';
	/**
	 * List of Campaigns
	 */
	campaignId: string | Expression<string>;
};

/** Get a member on list */
export type MailchimpV1CampaignGetConfig = {
	resource: 'campaign';
	operation: 'get';
	/**
	 * List of Campaigns
	 */
	campaignId: string | Expression<string>;
};

/** Get many members on a list */
export type MailchimpV1CampaignGetAllConfig = {
	resource: 'campaign';
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
	options?: Record<string, unknown>;
};

/** Replicate a campaign */
export type MailchimpV1CampaignReplicateConfig = {
	resource: 'campaign';
	operation: 'replicate';
	/**
	 * List of Campaigns
	 */
	campaignId: string | Expression<string>;
};

/** Creates a Resend to Non-Openers version of this campaign */
export type MailchimpV1CampaignResendConfig = {
	resource: 'campaign';
	operation: 'resend';
	/**
	 * List of Campaigns
	 */
	campaignId: string | Expression<string>;
};

/** Send a campaign */
export type MailchimpV1CampaignSendConfig = {
	resource: 'campaign';
	operation: 'send';
	/**
	 * List of Campaigns
	 */
	campaignId: string | Expression<string>;
};

/** Get many members on a list */
export type MailchimpV1ListGroupGetAllConfig = {
	resource: 'listGroup';
	operation: 'getAll';
	/**
	 * List of lists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	list: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	groupCategory: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	list: string | Expression<string>;
	/**
	 * Email address for a subscriber
	 */
	email: string | Expression<string>;
	/**
	 * Subscriber's current status
	 */
	status:
		| 'cleaned'
		| 'pending'
		| 'subscribed'
		| 'transactional'
		| 'unsubscribed'
		| Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	/**
	 * Subscriber location information.n
	 * @default {}
	 */
	locationFieldsUi?: {
		locationFieldsValues?: {
			latitude?: string | Expression<string>;
			longitude?: string | Expression<string>;
		};
	};
	/**
	 * An individual merge var and value for a member
	 * @default {}
	 */
	mergeFieldsUi?: {
		mergeFieldsValues?: Array<{
			name?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
	mergeFieldsJson?: IDataObject | string | Expression<string>;
	locationJson?: IDataObject | string | Expression<string>;
	groupsUi?: {
		groupsValues?: Array<{
			categoryId?: string | Expression<string>;
			categoryFieldId?: string | Expression<string>;
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
	 */
	list: string | Expression<string>;
	/**
	 * Member's email
	 */
	email: string | Expression<string>;
};

/** Get a member on list */
export type MailchimpV1MemberGetConfig = {
	resource: 'member';
	operation: 'get';
	/**
	 * List of lists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	list: string | Expression<string>;
	/**
	 * Member's email
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
	 */
	list: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	list: string | Expression<string>;
	/**
	 * Email address of the subscriber
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
	 */
	list: string | Expression<string>;
	/**
	 * Email address of the subscriber
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
	 */
	list: string | Expression<string>;
	/**
	 * Email address of the subscriber
	 */
	email: string | Expression<string>;
	tags?: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type MailchimpV1Params =
	| MailchimpV1CampaignDeleteConfig
	| MailchimpV1CampaignGetConfig
	| MailchimpV1CampaignGetAllConfig
	| MailchimpV1CampaignReplicateConfig
	| MailchimpV1CampaignResendConfig
	| MailchimpV1CampaignSendConfig
	| MailchimpV1ListGroupGetAllConfig
	| MailchimpV1MemberCreateConfig
	| MailchimpV1MemberDeleteConfig
	| MailchimpV1MemberGetConfig
	| MailchimpV1MemberGetAllConfig
	| MailchimpV1MemberUpdateConfig
	| MailchimpV1MemberTagCreateConfig
	| MailchimpV1MemberTagDeleteConfig;

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

export type MailchimpV1Node = {
	type: 'n8n-nodes-base.mailchimp';
	version: 1;
	config: NodeConfig<MailchimpV1Params>;
	credentials?: MailchimpV1Credentials;
};

export type MailchimpNode = MailchimpV1Node;
