/**
 * Facebook Lead Ads Trigger Node Types
 *
 * Handle Facebook Lead Ads events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/facebookleadadstrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface FacebookLeadAdsTriggerV1Params {
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

export type FacebookLeadAdsTriggerV1Node = {
	type: 'n8n-nodes-base.facebookLeadAdsTrigger';
	version: 1;
	config: NodeConfig<FacebookLeadAdsTriggerV1Params>;
	credentials?: FacebookLeadAdsTriggerV1Credentials;
	isTrigger: true;
};

export type FacebookLeadAdsTriggerNode = FacebookLeadAdsTriggerV1Node;
