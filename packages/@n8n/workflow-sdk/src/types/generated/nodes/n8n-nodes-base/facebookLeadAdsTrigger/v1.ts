/**
 * Facebook Lead Ads Trigger Node - Version 1
 * Handle Facebook Lead Ads events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface FacebookLeadAdsTriggerV1Config {
	event: 'newLead' | Expression<string>;
/**
 * The page linked to the form for retrieving new leads
 * @default {"mode":"list","value":""}
 */
		page: ResourceLocatorValue;
/**
 * The form to monitor for fetching lead details upon submission
 * @default {"mode":"list","value":""}
 */
		form: ResourceLocatorValue;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface FacebookLeadAdsTriggerV1Credentials {
	facebookLeadAdsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface FacebookLeadAdsTriggerV1NodeBase {
	type: 'n8n-nodes-base.facebookLeadAdsTrigger';
	version: 1;
	credentials?: FacebookLeadAdsTriggerV1Credentials;
	isTrigger: true;
}

export type FacebookLeadAdsTriggerV1Node = FacebookLeadAdsTriggerV1NodeBase & {
	config: NodeConfig<FacebookLeadAdsTriggerV1Config>;
};

export type FacebookLeadAdsTriggerV1Node = FacebookLeadAdsTriggerV1Node;