/**
 * Lemlist Node Types
 *
 * Consume the Lemlist API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lemlist/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type LemlistV2ActivityGetAllConfig = {
	resource: 'activity';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type LemlistV2CampaignGetAllConfig = {
	resource: 'campaign';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type LemlistV2CampaignGetStatsConfig = {
	resource: 'campaign';
	operation: 'getStats';
	/**
	 * ID of the campaign to get stats for. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	campaignId: string | Expression<string>;
	startDate: string | Expression<string>;
	endDate: string | Expression<string>;
	timezone: string | Expression<string>;
};

export type LemlistV2EnrichGetConfig = {
	resource: 'enrich';
	operation: 'get';
	/**
	 * ID of the enrichment to retrieve
	 */
	enrichId: string | Expression<string>;
};

export type LemlistV2EnrichEnrichLeadConfig = {
	resource: 'enrich';
	operation: 'enrichLead';
	leadId: string | Expression<string>;
	findEmail?: boolean | Expression<boolean>;
	verifyEmail?: boolean | Expression<boolean>;
	linkedinEnrichment?: boolean | Expression<boolean>;
	findPhone?: boolean | Expression<boolean>;
};

export type LemlistV2EnrichEnrichPersonConfig = {
	resource: 'enrich';
	operation: 'enrichPerson';
	findEmail?: boolean | Expression<boolean>;
	verifyEmail?: boolean | Expression<boolean>;
	linkedinEnrichment?: boolean | Expression<boolean>;
	findPhone?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

export type LemlistV2LeadCreateConfig = {
	resource: 'lead';
	operation: 'create';
	/**
	 * ID of the campaign to create the lead under. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	campaignId: string | Expression<string>;
	/**
	 * Email of the lead to create
	 */
	email?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type LemlistV2LeadDeleteConfig = {
	resource: 'lead';
	operation: 'delete';
	/**
	 * ID of the campaign to remove the lead from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	campaignId: string | Expression<string>;
	/**
	 * Email of the lead to delete
	 */
	email?: string | Expression<string>;
};

export type LemlistV2LeadGetConfig = {
	resource: 'lead';
	operation: 'get';
	/**
	 * Email of the lead to retrieve
	 */
	email?: string | Expression<string>;
};

export type LemlistV2LeadUnsubscribeConfig = {
	resource: 'lead';
	operation: 'unsubscribe';
	/**
	 * ID of the campaign to unsubscribe the lead from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	campaignId: string | Expression<string>;
	/**
	 * Email of the lead to unsubscribe
	 */
	email?: string | Expression<string>;
};

export type LemlistV2TeamGetConfig = {
	resource: 'team';
	operation: 'get';
};

export type LemlistV2TeamGetCreditsConfig = {
	resource: 'team';
	operation: 'getCredits';
};

export type LemlistV2UnsubscribeAddConfig = {
	resource: 'unsubscribe';
	operation: 'add';
	/**
	 * Email to add to the unsubscribes
	 */
	email?: string | Expression<string>;
};

export type LemlistV2UnsubscribeDeleteConfig = {
	resource: 'unsubscribe';
	operation: 'delete';
	/**
	 * Email to delete from the unsubscribes
	 */
	email?: string | Expression<string>;
};

export type LemlistV2UnsubscribeGetAllConfig = {
	resource: 'unsubscribe';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
};

export type LemlistV2Params =
	| LemlistV2ActivityGetAllConfig
	| LemlistV2CampaignGetAllConfig
	| LemlistV2CampaignGetStatsConfig
	| LemlistV2EnrichGetConfig
	| LemlistV2EnrichEnrichLeadConfig
	| LemlistV2EnrichEnrichPersonConfig
	| LemlistV2LeadCreateConfig
	| LemlistV2LeadDeleteConfig
	| LemlistV2LeadGetConfig
	| LemlistV2LeadUnsubscribeConfig
	| LemlistV2TeamGetConfig
	| LemlistV2TeamGetCreditsConfig
	| LemlistV2UnsubscribeAddConfig
	| LemlistV2UnsubscribeDeleteConfig
	| LemlistV2UnsubscribeGetAllConfig;

export type LemlistV1ActivityGetAllConfig = {
	resource: 'activity';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type LemlistV1CampaignGetAllConfig = {
	resource: 'campaign';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
};

export type LemlistV1LeadCreateConfig = {
	resource: 'lead';
	operation: 'create';
	/**
	 * ID of the campaign to create the lead under. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	campaignId: string | Expression<string>;
	/**
	 * Email of the lead to create
	 */
	email?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type LemlistV1LeadDeleteConfig = {
	resource: 'lead';
	operation: 'delete';
	/**
	 * ID of the campaign to remove the lead from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	campaignId: string | Expression<string>;
	/**
	 * Email of the lead to delete
	 */
	email?: string | Expression<string>;
};

export type LemlistV1LeadGetConfig = {
	resource: 'lead';
	operation: 'get';
	/**
	 * Email of the lead to retrieve
	 */
	email?: string | Expression<string>;
};

export type LemlistV1LeadUnsubscribeConfig = {
	resource: 'lead';
	operation: 'unsubscribe';
	/**
	 * ID of the campaign to unsubscribe the lead from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	campaignId: string | Expression<string>;
	/**
	 * Email of the lead to unsubscribe
	 */
	email?: string | Expression<string>;
};

export type LemlistV1TeamGetConfig = {
	resource: 'team';
	operation: 'get';
};

export type LemlistV1UnsubscribeAddConfig = {
	resource: 'unsubscribe';
	operation: 'add';
	/**
	 * Email to add to the unsubscribes
	 */
	email?: string | Expression<string>;
};

export type LemlistV1UnsubscribeDeleteConfig = {
	resource: 'unsubscribe';
	operation: 'delete';
	/**
	 * Email to delete from the unsubscribes
	 */
	email?: string | Expression<string>;
};

export type LemlistV1UnsubscribeGetAllConfig = {
	resource: 'unsubscribe';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
};

export type LemlistV1Params =
	| LemlistV1ActivityGetAllConfig
	| LemlistV1CampaignGetAllConfig
	| LemlistV1LeadCreateConfig
	| LemlistV1LeadDeleteConfig
	| LemlistV1LeadGetConfig
	| LemlistV1LeadUnsubscribeConfig
	| LemlistV1TeamGetConfig
	| LemlistV1UnsubscribeAddConfig
	| LemlistV1UnsubscribeDeleteConfig
	| LemlistV1UnsubscribeGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LemlistV2Credentials {
	lemlistApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LemlistNode = {
	type: 'n8n-nodes-base.lemlist';
	version: 1 | 2;
	config: NodeConfig<LemlistV2Params>;
	credentials?: LemlistV2Credentials;
};
