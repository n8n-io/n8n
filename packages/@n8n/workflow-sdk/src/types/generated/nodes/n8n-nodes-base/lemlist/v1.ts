/**
 * Lemlist Node - Version 1
 * Consume the Lemlist API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type LemlistV1ActivityGetAllConfig = {
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

export type LemlistV1CampaignGetAllConfig = {
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
};

export type LemlistV1LeadCreateConfig = {
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

export type LemlistV1LeadDeleteConfig = {
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

export type LemlistV1LeadGetConfig = {
	resource: 'lead';
	operation: 'get';
/**
 * Email of the lead to retrieve
 * @displayOptions.show { resource: ["lead"], operation: ["get"] }
 */
		email?: string | Expression<string>;
};

export type LemlistV1LeadUnsubscribeConfig = {
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

export type LemlistV1TeamGetConfig = {
	resource: 'team';
	operation: 'get';
};

export type LemlistV1UnsubscribeAddConfig = {
	resource: 'unsubscribe';
	operation: 'add';
/**
 * Email to add to the unsubscribes
 * @displayOptions.show { resource: ["unsubscribe"], operation: ["add"] }
 */
		email?: string | Expression<string>;
};

export type LemlistV1UnsubscribeDeleteConfig = {
	resource: 'unsubscribe';
	operation: 'delete';
/**
 * Email to delete from the unsubscribes
 * @displayOptions.show { resource: ["unsubscribe"], operation: ["delete"] }
 */
		email?: string | Expression<string>;
};

export type LemlistV1UnsubscribeGetAllConfig = {
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
	| LemlistV1UnsubscribeGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LemlistV1Credentials {
	lemlistApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LemlistV1NodeBase {
	type: 'n8n-nodes-base.lemlist';
	version: 1;
	credentials?: LemlistV1Credentials;
}

export type LemlistV1ActivityGetAllNode = LemlistV1NodeBase & {
	config: NodeConfig<LemlistV1ActivityGetAllConfig>;
};

export type LemlistV1CampaignGetAllNode = LemlistV1NodeBase & {
	config: NodeConfig<LemlistV1CampaignGetAllConfig>;
};

export type LemlistV1LeadCreateNode = LemlistV1NodeBase & {
	config: NodeConfig<LemlistV1LeadCreateConfig>;
};

export type LemlistV1LeadDeleteNode = LemlistV1NodeBase & {
	config: NodeConfig<LemlistV1LeadDeleteConfig>;
};

export type LemlistV1LeadGetNode = LemlistV1NodeBase & {
	config: NodeConfig<LemlistV1LeadGetConfig>;
};

export type LemlistV1LeadUnsubscribeNode = LemlistV1NodeBase & {
	config: NodeConfig<LemlistV1LeadUnsubscribeConfig>;
};

export type LemlistV1TeamGetNode = LemlistV1NodeBase & {
	config: NodeConfig<LemlistV1TeamGetConfig>;
};

export type LemlistV1UnsubscribeAddNode = LemlistV1NodeBase & {
	config: NodeConfig<LemlistV1UnsubscribeAddConfig>;
};

export type LemlistV1UnsubscribeDeleteNode = LemlistV1NodeBase & {
	config: NodeConfig<LemlistV1UnsubscribeDeleteConfig>;
};

export type LemlistV1UnsubscribeGetAllNode = LemlistV1NodeBase & {
	config: NodeConfig<LemlistV1UnsubscribeGetAllConfig>;
};

export type LemlistV1Node =
	| LemlistV1ActivityGetAllNode
	| LemlistV1CampaignGetAllNode
	| LemlistV1LeadCreateNode
	| LemlistV1LeadDeleteNode
	| LemlistV1LeadGetNode
	| LemlistV1LeadUnsubscribeNode
	| LemlistV1TeamGetNode
	| LemlistV1UnsubscribeAddNode
	| LemlistV1UnsubscribeDeleteNode
	| LemlistV1UnsubscribeGetAllNode
	;