/**
 * Lemlist Node - Version 2
 * Consume the Lemlist API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type LemlistV2ActivityGetAllConfig = {
	resource: 'activity';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["activity"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["activity"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["campaign"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["campaign"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["campaign"], operation: ["getStats"] }
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
 * @displayOptions.show { resource: ["enrich"], operation: ["get"] }
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
 * @displayOptions.show { resource: ["lead"], operation: ["create"] }
 * @default []
 */
		campaignId: string | Expression<string>;
/**
 * Email of the lead to create
 * @displayOptions.show { resource: ["lead"], operation: ["create"] }
 */
		email?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type LemlistV2LeadDeleteConfig = {
	resource: 'lead';
	operation: 'delete';
/**
 * ID of the campaign to remove the lead from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["lead"], operation: ["delete"] }
 * @default []
 */
		campaignId: string | Expression<string>;
/**
 * Email of the lead to delete
 * @displayOptions.show { resource: ["lead"], operation: ["delete"] }
 */
		email?: string | Expression<string>;
};

export type LemlistV2LeadGetConfig = {
	resource: 'lead';
	operation: 'get';
/**
 * Email of the lead to retrieve
 * @displayOptions.show { resource: ["lead"], operation: ["get"] }
 */
		email?: string | Expression<string>;
};

export type LemlistV2LeadUnsubscribeConfig = {
	resource: 'lead';
	operation: 'unsubscribe';
/**
 * ID of the campaign to unsubscribe the lead from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["lead"], operation: ["unsubscribe"] }
 * @default []
 */
		campaignId: string | Expression<string>;
/**
 * Email of the lead to unsubscribe
 * @displayOptions.show { resource: ["lead"], operation: ["unsubscribe"] }
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
 * @displayOptions.show { resource: ["unsubscribe"], operation: ["add"] }
 */
		email?: string | Expression<string>;
};

export type LemlistV2UnsubscribeDeleteConfig = {
	resource: 'unsubscribe';
	operation: 'delete';
/**
 * Email to delete from the unsubscribes
 * @displayOptions.show { resource: ["unsubscribe"], operation: ["delete"] }
 */
		email?: string | Expression<string>;
};

export type LemlistV2UnsubscribeGetAllConfig = {
	resource: 'unsubscribe';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["unsubscribe"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["unsubscribe"], operation: ["getAll"], returnAll: [false] }
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
	| LemlistV2UnsubscribeGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LemlistV2Credentials {
	lemlistApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LemlistV2Node = {
	type: 'n8n-nodes-base.lemlist';
	version: 2;
	config: NodeConfig<LemlistV2Params>;
	credentials?: LemlistV2Credentials;
};