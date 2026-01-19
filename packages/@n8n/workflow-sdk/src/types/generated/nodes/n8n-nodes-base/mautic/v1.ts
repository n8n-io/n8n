/**
 * Mautic Node - Version 1
 * Consume Mautic API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

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
 * @displayOptions.show { resource: ["campaignContact"], operation: ["add", "remove"] }
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
 * @displayOptions.show { resource: ["campaignContact"], operation: ["add", "remove"] }
 */
		campaignId: string | Expression<string>;
};

/** Create or modify a company */
export type MauticV1CompanyCreateConfig = {
	resource: 'company';
	operation: 'create';
/**
 * The name of the company to create
 * @displayOptions.show { resource: ["company"], operation: ["create"] }
 */
		name?: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["company"], operation: ["create"] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["company"] }
 */
		companyId?: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["company"], operation: ["delete"] }
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
 * @displayOptions.show { operation: ["get"], resource: ["company"] }
 */
		companyId?: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["company"], operation: ["get"] }
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
 * @displayOptions.show { resource: ["company"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["company"], operation: ["getAll"], returnAll: [false] }
 * @default 30
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["company"], operation: ["getAll"] }
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
 * @displayOptions.show { operation: ["update"], resource: ["company"] }
 */
		companyId?: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["company"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["companyContact"], operation: ["add", "remove"] }
 */
		contactId?: string | Expression<string>;
/**
 * The ID of the company
 * @displayOptions.show { resource: ["companyContact"], operation: ["add", "remove"] }
 */
		companyId?: string | Expression<string>;
};

/** Add/remove contacts to/from a company */
export type MauticV1CompanyContactRemoveConfig = {
	resource: 'companyContact';
	operation: 'remove';
/**
 * The ID of the contact
 * @displayOptions.show { resource: ["companyContact"], operation: ["add", "remove"] }
 */
		contactId?: string | Expression<string>;
/**
 * The ID of the company
 * @displayOptions.show { resource: ["companyContact"], operation: ["add", "remove"] }
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
 * @displayOptions.show { resource: ["contact"], operation: ["create"], jsonParameters: [false] }
 */
		email?: string | Expression<string>;
	firstName?: string | Expression<string>;
	lastName?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["contact"], operation: ["create"], jsonParameters: [false] }
 */
		company?: string | Expression<string>;
	position?: string | Expression<string>;
	title?: string | Expression<string>;
/**
 * Contact parameters
 * @displayOptions.show { operation: ["create"], resource: ["contact"], jsonParameters: [true] }
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
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["contact"], operation: ["sendEmail"] }
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
 * @displayOptions.show { resource: ["contactSegment"], operation: ["add", "remove"] }
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
 * @displayOptions.show { resource: ["contactSegment"], operation: ["add", "remove"] }
 */
		segmentId: string | Expression<string>;
};

/** Send an email */
export type MauticV1SegmentEmailSendConfig = {
	resource: 'segmentEmail';
	operation: 'send';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["segmentEmail"], operation: ["send"] }
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
	| MauticV1SegmentEmailSendConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MauticV1Credentials {
	mauticApi: CredentialReference;
	mauticOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MauticV1NodeBase {
	type: 'n8n-nodes-base.mautic';
	version: 1;
	credentials?: MauticV1Credentials;
}

export type MauticV1CampaignContactAddNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1CampaignContactAddConfig>;
};

export type MauticV1CampaignContactRemoveNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1CampaignContactRemoveConfig>;
};

export type MauticV1CompanyCreateNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1CompanyCreateConfig>;
};

export type MauticV1CompanyDeleteNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1CompanyDeleteConfig>;
};

export type MauticV1CompanyGetNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1CompanyGetConfig>;
};

export type MauticV1CompanyGetAllNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1CompanyGetAllConfig>;
};

export type MauticV1CompanyUpdateNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1CompanyUpdateConfig>;
};

export type MauticV1CompanyContactAddNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1CompanyContactAddConfig>;
};

export type MauticV1CompanyContactRemoveNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1CompanyContactRemoveConfig>;
};

export type MauticV1ContactCreateNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1ContactCreateConfig>;
};

export type MauticV1ContactDeleteNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1ContactDeleteConfig>;
};

export type MauticV1ContactEditContactPointNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1ContactEditContactPointConfig>;
};

export type MauticV1ContactEditDoNotContactListNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1ContactEditDoNotContactListConfig>;
};

export type MauticV1ContactGetNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1ContactGetConfig>;
};

export type MauticV1ContactGetAllNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1ContactGetAllConfig>;
};

export type MauticV1ContactSendEmailNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1ContactSendEmailConfig>;
};

export type MauticV1ContactUpdateNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1ContactUpdateConfig>;
};

export type MauticV1ContactSegmentAddNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1ContactSegmentAddConfig>;
};

export type MauticV1ContactSegmentRemoveNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1ContactSegmentRemoveConfig>;
};

export type MauticV1SegmentEmailSendNode = MauticV1NodeBase & {
	config: NodeConfig<MauticV1SegmentEmailSendConfig>;
};

export type MauticV1Node =
	| MauticV1CampaignContactAddNode
	| MauticV1CampaignContactRemoveNode
	| MauticV1CompanyCreateNode
	| MauticV1CompanyDeleteNode
	| MauticV1CompanyGetNode
	| MauticV1CompanyGetAllNode
	| MauticV1CompanyUpdateNode
	| MauticV1CompanyContactAddNode
	| MauticV1CompanyContactRemoveNode
	| MauticV1ContactCreateNode
	| MauticV1ContactDeleteNode
	| MauticV1ContactEditContactPointNode
	| MauticV1ContactEditDoNotContactListNode
	| MauticV1ContactGetNode
	| MauticV1ContactGetAllNode
	| MauticV1ContactSendEmailNode
	| MauticV1ContactUpdateNode
	| MauticV1ContactSegmentAddNode
	| MauticV1ContactSegmentRemoveNode
	| MauticV1SegmentEmailSendNode
	;