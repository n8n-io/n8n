/**
 * Emelia Node Types
 *
 * Consume the Emelia API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/emelia/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type EmeliaV1CampaignAddContactConfig = {
	resource: 'campaign';
	operation: 'addContact';
	/**
	 * The ID of the campaign to add the contact to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	campaignId: string | Expression<string>;
	/**
	 * The email of the contact to add to the campaign
	 */
	contactEmail: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type EmeliaV1CampaignCreateConfig = {
	resource: 'campaign';
	operation: 'create';
	/**
	 * The name of the campaign to create
	 */
	campaignName: string | Expression<string>;
};

export type EmeliaV1CampaignDuplicateConfig = {
	resource: 'campaign';
	operation: 'duplicate';
	/**
	 * The ID of the campaign to duplicate. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	campaignId: string | Expression<string>;
	/**
	 * The name of the new campaign to create
	 */
	campaignName: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type EmeliaV1CampaignGetConfig = {
	resource: 'campaign';
	operation: 'get';
	/**
	 * The ID of the campaign to retrieve
	 */
	campaignId: string | Expression<string>;
};

export type EmeliaV1CampaignGetAllConfig = {
	resource: 'campaign';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

export type EmeliaV1CampaignPauseConfig = {
	resource: 'campaign';
	operation: 'pause';
	/**
	 * The ID of the campaign to pause. The campaign must be in RUNNING mode.
	 */
	campaignId: string | Expression<string>;
};

export type EmeliaV1CampaignStartConfig = {
	resource: 'campaign';
	operation: 'start';
	/**
	 * The ID of the campaign to start. Email provider and contacts must be set.
	 */
	campaignId: string | Expression<string>;
};

export type EmeliaV1ContactListAddConfig = {
	resource: 'contactList';
	operation: 'add';
	/**
	 * The ID of the contact list to add the contact to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	contactListId: string | Expression<string>;
	/**
	 * The email of the contact to add to the contact list
	 */
	contactEmail: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type EmeliaV1ContactListGetAllConfig = {
	resource: 'contactList';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	| EmeliaV1ContactListGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface EmeliaV1Credentials {
	emeliaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type EmeliaV1Node = {
	type: 'n8n-nodes-base.emelia';
	version: 1;
	config: NodeConfig<EmeliaV1Params>;
	credentials?: EmeliaV1Credentials;
};

export type EmeliaNode = EmeliaV1Node;
