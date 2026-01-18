/**
 * ActiveCampaign Trigger Node - Version 1
 * Handle ActiveCampaign events via webhooks
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ActiveCampaignTriggerV1Params {
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
// Node Type
// ===========================================================================

export type ActiveCampaignTriggerV1Node = {
	type: 'n8n-nodes-base.activeCampaignTrigger';
	version: 1;
	config: NodeConfig<ActiveCampaignTriggerV1Params>;
	credentials?: ActiveCampaignTriggerV1Credentials;
	isTrigger: true;
};