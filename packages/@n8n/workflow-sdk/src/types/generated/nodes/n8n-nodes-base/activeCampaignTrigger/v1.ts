/**
 * ActiveCampaign Trigger Node - Version 1
 * Handle ActiveCampaign events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ActiveCampaignTriggerV1Config {
/**
 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @default []
 */
		events?: string[];
	sources?: Array<'public' | 'admin' | 'api' | 'system'>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface ActiveCampaignTriggerV1Credentials {
	activeCampaignApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ActiveCampaignTriggerV1NodeBase {
	type: 'n8n-nodes-base.activeCampaignTrigger';
	version: 1;
	credentials?: ActiveCampaignTriggerV1Credentials;
	isTrigger: true;
}

export type ActiveCampaignTriggerV1Node = ActiveCampaignTriggerV1NodeBase & {
	config: NodeConfig<ActiveCampaignTriggerV1Config>;
};

export type ActiveCampaignTriggerV1Node = ActiveCampaignTriggerV1Node;