/**
 * Mautic Node Types
 *
 * Consume Mautic API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mautic/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Add/remove contacts to/from a campaign */
export type MauticV1CampaignContactAddConfig = {
	resource: 'campaignContact';
	operation: 'add';
	contactId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	campaignId: string | Expression<string>;
};

/** Add/remove contacts to/from a campaign */
export type MauticV1CampaignContactRemoveConfig = {
	resource: 'campaignContact';
	operation: 'remove';
	contactId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	campaignId: string | Expression<string>;
};

/** Create or modify a company */
export type MauticV1CompanyCreateConfig = {
	resource: 'company';
	operation: 'create';
	/**
	 * The name of the company to create
	 */
	name?: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Create or modify a company */
export type MauticV1CompanyDeleteConfig = {
	resource: 'company';
	operation: 'delete';
	/**
	 * The ID of the company to delete
	 */
	companyId?: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Create or modify a company */
export type MauticV1CompanyGetConfig = {
	resource: 'company';
	operation: 'get';
	/**
	 * The ID of the company to return
	 */
	companyId?: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Create or modify a company */
export type MauticV1CompanyGetAllConfig = {
	resource: 'company';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 30
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Create or modify a company */
export type MauticV1CompanyUpdateConfig = {
	resource: 'company';
	operation: 'update';
	/**
	 * The ID of the company to update
	 */
	companyId?: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
};

/** Add/remove contacts to/from a company */
export type MauticV1CompanyContactAddConfig = {
	resource: 'companyContact';
	operation: 'add';
	/**
	 * The ID of the contact
	 */
	contactId?: string | Expression<string>;
	/**
	 * The ID of the company
	 */
	companyId?: string | Expression<string>;
};

/** Add/remove contacts to/from a company */
export type MauticV1CompanyContactRemoveConfig = {
	resource: 'companyContact';
	operation: 'remove';
	/**
	 * The ID of the contact
	 */
	contactId?: string | Expression<string>;
	/**
	 * The ID of the company
	 */
	companyId?: string | Expression<string>;
};

/** Create & modify contacts */
export type MauticV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Email address of the contact
	 */
	email?: string | Expression<string>;
	firstName?: string | Expression<string>;
	lastName?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	company?: string | Expression<string>;
	position?: string | Expression<string>;
	title?: string | Expression<string>;
	/**
	 * Contact parameters
	 */
	bodyJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Create & modify contacts */
export type MauticV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	contactId?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create & modify contacts */
export type MauticV1ContactEditContactPointConfig = {
	resource: 'contact';
	operation: 'editContactPoint';
	contactId?: string | Expression<string>;
	action?: 'add' | 'remove' | Expression<string>;
	points?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Create & modify contacts */
export type MauticV1ContactEditDoNotContactListConfig = {
	resource: 'contact';
	operation: 'editDoNotContactList';
	contactId?: string | Expression<string>;
	action?: 'add' | 'remove' | Expression<string>;
	channel: 'email' | 'sms' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Create & modify contacts */
export type MauticV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	contactId?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create & modify contacts */
export type MauticV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 30
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Create & modify contacts */
export type MauticV1ContactSendEmailConfig = {
	resource: 'contact';
	operation: 'sendEmail';
	options?: Record<string, unknown>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	campaignEmailId: string | Expression<string>;
	contactId: string | Expression<string>;
};

/** Create & modify contacts */
export type MauticV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	contactId?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Add/remove contacts to/from a segment */
export type MauticV1ContactSegmentAddConfig = {
	resource: 'contactSegment';
	operation: 'add';
	contactId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	segmentId: string | Expression<string>;
};

/** Add/remove contacts to/from a segment */
export type MauticV1ContactSegmentRemoveConfig = {
	resource: 'contactSegment';
	operation: 'remove';
	contactId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	segmentId: string | Expression<string>;
};

/** Send an email */
export type MauticV1SegmentEmailSendConfig = {
	resource: 'segmentEmail';
	operation: 'send';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	segmentEmailId: string | Expression<string>;
};

export type MauticV1Params =
	| MauticV1CampaignContactAddConfig
	| MauticV1CampaignContactRemoveConfig
	| MauticV1CompanyCreateConfig
	| MauticV1CompanyDeleteConfig
	| MauticV1CompanyGetConfig
	| MauticV1CompanyGetAllConfig
	| MauticV1CompanyUpdateConfig
	| MauticV1CompanyContactAddConfig
	| MauticV1CompanyContactRemoveConfig
	| MauticV1ContactCreateConfig
	| MauticV1ContactDeleteConfig
	| MauticV1ContactEditContactPointConfig
	| MauticV1ContactEditDoNotContactListConfig
	| MauticV1ContactGetConfig
	| MauticV1ContactGetAllConfig
	| MauticV1ContactSendEmailConfig
	| MauticV1ContactUpdateConfig
	| MauticV1ContactSegmentAddConfig
	| MauticV1ContactSegmentRemoveConfig
	| MauticV1SegmentEmailSendConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MauticV1Credentials {
	mauticApi: CredentialReference;
	mauticOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MauticNode = {
	type: 'n8n-nodes-base.mautic';
	version: 1;
	config: NodeConfig<MauticV1Params>;
	credentials?: MauticV1Credentials;
};
