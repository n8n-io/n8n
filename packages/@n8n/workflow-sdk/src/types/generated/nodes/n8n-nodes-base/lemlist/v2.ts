/**
 * Lemlist Node - Version 2
 * Consume the Lemlist API
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


// ===========================================================================
// Output Types
// ===========================================================================

export type LemlistV2ActivityGetAllOutput = {
	_id?: string;
	bot?: boolean;
	campaignId?: string;
	campaignName?: string;
	companyName?: string;
	contactId?: string;
	createdAt?: string;
	createdBy?: string;
	email?: string;
	emailTemplateId?: string;
	emailTemplateName?: string;
	firstName?: string;
	isFirst?: boolean;
	lastName?: string;
	leadCompanyName?: string;
	leadEmail?: string;
	leadFirstName?: string;
	leadId?: string;
	leadLastName?: string;
	leadPhone?: string;
	linkedinUrl?: string;
	metaData?: {
		campaignId?: string;
		createdBy?: string;
		leadId?: string;
		taskId?: string;
		teamId?: string;
		type?: string;
	};
	name?: string;
	phone?: string;
	relatedSentAt?: string;
	sendUserName?: string;
	sequenceId?: string;
	sequenceStep?: number;
	sequenceTested?: string;
	stopped?: boolean;
	teamId?: string;
	totalSequenceStep?: number;
	type?: string;
};

export type LemlistV2CampaignGetAllOutput = {
	_id?: string;
	createdAt?: string;
	createdBy?: string;
	name?: string;
	status?: string;
};

export type LemlistV2CampaignGetStatsOutput = {
	clickedCount?: number;
	deliveredCount?: number;
	interestedCount?: number;
	leadCompleted?: number;
	leadInProgress?: number;
	leadReadyToSend?: number;
	leadToLaunch?: number;
	leadTotal?: number;
	openedCount?: number;
	repliedCount?: number;
	sentCount?: number;
};

export type LemlistV2EnrichGetOutput = {
	data?: {
		email?: {
			email?: string;
			notFound?: boolean;
			status?: string;
		};
		linkedin?: {
			companyDescription?: string;
			companyDomain?: string;
			companyHeadQuarter?: string;
			companyIndustry?: string;
			companyLinkedinUrl?: string;
			companyLogo?: string;
			companyName?: string;
			companyType?: string;
			firstName?: string;
			industry?: string;
			languages?: string;
			lastName?: string;
			linkedinClassicId?: string;
			linkedinMemberId?: number;
			linkedinUrl?: string;
			locationName?: string;
			occupation?: string;
			picture?: string;
			positionGroups?: Array<{
				company?: {
					description?: string;
					domain?: string;
					employeesOnLinkedin?: number;
					foundedOn?: number;
					industry?: string;
					linkedinUrlSalesNav?: string;
					name?: string;
					size?: string;
					tagline?: string;
					type?: string;
					website?: string;
				};
				date?: {
					start?: {
						month?: number;
						year?: number;
					};
				};
				profilePositions?: Array<{
					date?: {
						start?: {
							month?: number;
							year?: number;
						};
					};
					title?: string;
				}>;
			}>;
			skills?: string;
			tagline?: string;
		};
	};
	enrichmentId?: string;
	enrichmentStatus?: string;
	input?: {
		companyDomain?: string;
		companyName?: string;
		email?: string;
		firstName?: string;
		lastName?: string;
		linkedinUrl?: string;
	};
};

export type LemlistV2EnrichEnrichPersonOutput = {
	id?: string;
};

export type LemlistV2LeadCreateOutput = {
	_id?: string;
	campaignId?: string;
	campaignName?: string;
	companyName?: string;
	contactId?: string;
	email?: string;
	firstName?: string;
	isPaused?: boolean;
	lastName?: string;
	linkedinUrl?: string;
};

export type LemlistV2LeadGetOutput = {
	_id?: string;
	campaignId?: string;
	companyName?: string;
	contactId?: string;
	email?: string;
	firstName?: string;
	isPaused?: boolean;
	lastName?: string;
	linkedinUrl?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface LemlistV2Credentials {
	lemlistApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LemlistV2NodeBase {
	type: 'n8n-nodes-base.lemlist';
	version: 2;
	credentials?: LemlistV2Credentials;
}

export type LemlistV2ActivityGetAllNode = LemlistV2NodeBase & {
	config: NodeConfig<LemlistV2ActivityGetAllConfig>;
	output?: LemlistV2ActivityGetAllOutput;
};

export type LemlistV2CampaignGetAllNode = LemlistV2NodeBase & {
	config: NodeConfig<LemlistV2CampaignGetAllConfig>;
	output?: LemlistV2CampaignGetAllOutput;
};

export type LemlistV2CampaignGetStatsNode = LemlistV2NodeBase & {
	config: NodeConfig<LemlistV2CampaignGetStatsConfig>;
	output?: LemlistV2CampaignGetStatsOutput;
};

export type LemlistV2EnrichGetNode = LemlistV2NodeBase & {
	config: NodeConfig<LemlistV2EnrichGetConfig>;
	output?: LemlistV2EnrichGetOutput;
};

export type LemlistV2EnrichEnrichLeadNode = LemlistV2NodeBase & {
	config: NodeConfig<LemlistV2EnrichEnrichLeadConfig>;
};

export type LemlistV2EnrichEnrichPersonNode = LemlistV2NodeBase & {
	config: NodeConfig<LemlistV2EnrichEnrichPersonConfig>;
	output?: LemlistV2EnrichEnrichPersonOutput;
};

export type LemlistV2LeadCreateNode = LemlistV2NodeBase & {
	config: NodeConfig<LemlistV2LeadCreateConfig>;
	output?: LemlistV2LeadCreateOutput;
};

export type LemlistV2LeadDeleteNode = LemlistV2NodeBase & {
	config: NodeConfig<LemlistV2LeadDeleteConfig>;
};

export type LemlistV2LeadGetNode = LemlistV2NodeBase & {
	config: NodeConfig<LemlistV2LeadGetConfig>;
	output?: LemlistV2LeadGetOutput;
};

export type LemlistV2LeadUnsubscribeNode = LemlistV2NodeBase & {
	config: NodeConfig<LemlistV2LeadUnsubscribeConfig>;
};

export type LemlistV2TeamGetNode = LemlistV2NodeBase & {
	config: NodeConfig<LemlistV2TeamGetConfig>;
};

export type LemlistV2TeamGetCreditsNode = LemlistV2NodeBase & {
	config: NodeConfig<LemlistV2TeamGetCreditsConfig>;
};

export type LemlistV2UnsubscribeAddNode = LemlistV2NodeBase & {
	config: NodeConfig<LemlistV2UnsubscribeAddConfig>;
};

export type LemlistV2UnsubscribeDeleteNode = LemlistV2NodeBase & {
	config: NodeConfig<LemlistV2UnsubscribeDeleteConfig>;
};

export type LemlistV2UnsubscribeGetAllNode = LemlistV2NodeBase & {
	config: NodeConfig<LemlistV2UnsubscribeGetAllConfig>;
};

export type LemlistV2Node =
	| LemlistV2ActivityGetAllNode
	| LemlistV2CampaignGetAllNode
	| LemlistV2CampaignGetStatsNode
	| LemlistV2EnrichGetNode
	| LemlistV2EnrichEnrichLeadNode
	| LemlistV2EnrichEnrichPersonNode
	| LemlistV2LeadCreateNode
	| LemlistV2LeadDeleteNode
	| LemlistV2LeadGetNode
	| LemlistV2LeadUnsubscribeNode
	| LemlistV2TeamGetNode
	| LemlistV2TeamGetCreditsNode
	| LemlistV2UnsubscribeAddNode
	| LemlistV2UnsubscribeDeleteNode
	| LemlistV2UnsubscribeGetAllNode
	;