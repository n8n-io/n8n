/**
 * Emelia Node - Version 1
 * Consume the Emelia API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type EmeliaV1CampaignAddContactConfig = {
	resource: 'campaign';
	operation: 'addContact';
/**
 * The ID of the campaign to add the contact to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["campaign"], operation: ["addContact"] }
 * @default []
 */
		campaignId: string | Expression<string>;
/**
 * The email of the contact to add to the campaign
 * @displayOptions.show { resource: ["campaign"], operation: ["addContact"] }
 */
		contactEmail: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type EmeliaV1CampaignCreateConfig = {
	resource: 'campaign';
	operation: 'create';
/**
 * The name of the campaign to create
 * @displayOptions.show { resource: ["campaign"], operation: ["create"] }
 */
		campaignName: string | Expression<string>;
};

export type EmeliaV1CampaignDuplicateConfig = {
	resource: 'campaign';
	operation: 'duplicate';
/**
 * The ID of the campaign to duplicate. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["campaign"], operation: ["duplicate"] }
 */
		campaignId: string | Expression<string>;
/**
 * The name of the new campaign to create
 * @displayOptions.show { resource: ["campaign"], operation: ["duplicate"] }
 */
		campaignName: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type EmeliaV1CampaignGetConfig = {
	resource: 'campaign';
	operation: 'get';
/**
 * The ID of the campaign to retrieve
 * @displayOptions.show { resource: ["campaign"], operation: ["get"] }
 */
		campaignId: string | Expression<string>;
};

export type EmeliaV1CampaignGetAllConfig = {
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
 * @default 100
 */
		limit?: number | Expression<number>;
};

export type EmeliaV1CampaignPauseConfig = {
	resource: 'campaign';
	operation: 'pause';
/**
 * The ID of the campaign to pause. The campaign must be in RUNNING mode.
 * @displayOptions.show { resource: ["campaign"], operation: ["pause"] }
 */
		campaignId: string | Expression<string>;
};

export type EmeliaV1CampaignStartConfig = {
	resource: 'campaign';
	operation: 'start';
/**
 * The ID of the campaign to start. Email provider and contacts must be set.
 * @displayOptions.show { resource: ["campaign"], operation: ["start"] }
 */
		campaignId: string | Expression<string>;
};

export type EmeliaV1ContactListAddConfig = {
	resource: 'contactList';
	operation: 'add';
/**
 * The ID of the contact list to add the contact to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["contactList"], operation: ["add"] }
 * @default []
 */
		contactListId: string | Expression<string>;
/**
 * The email of the contact to add to the contact list
 * @displayOptions.show { resource: ["contactList"], operation: ["add"] }
 */
		contactEmail: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type EmeliaV1ContactListGetAllConfig = {
	resource: 'contactList';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["contactList"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["contactList"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

export type EmeliaV1Params =
	| EmeliaV1CampaignAddContactConfig
	| EmeliaV1CampaignCreateConfig
	| EmeliaV1CampaignDuplicateConfig
	| EmeliaV1CampaignGetConfig
	| EmeliaV1CampaignGetAllConfig
	| EmeliaV1CampaignPauseConfig
	| EmeliaV1CampaignStartConfig
	| EmeliaV1ContactListAddConfig
	| EmeliaV1ContactListGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface EmeliaV1Credentials {
	emeliaApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type EmeliaV1Node = {
	type: 'n8n-nodes-base.emelia';
	version: 1;
	config: NodeConfig<EmeliaV1Params>;
	credentials?: EmeliaV1Credentials;
};