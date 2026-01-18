/**
 * Google Business Profile Trigger Node Types
 *
 * Fetches reviews from Google Business Profile and starts the workflow on specified polling intervals.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googlebusinessprofiletrigger/
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

export interface GoogleBusinessProfileTriggerV1Params {
	/**
	 * Time at which polling should occur
	 * @default {"item":[{"mode":"everyMinute"}]}
	 */
	pollTimes?: Record<string, unknown>;
	event: 'reviewAdded' | Expression<string>;
	/**
	 * The Google Business Profile account
	 * @default {"mode":"list","value":""}
	 */
	account: ResourceLocatorValue;
	/**
	 * The specific location or business associated with the account
	 * @default {"mode":"list","value":""}
	 */
	location: ResourceLocatorValue;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleBusinessProfileTriggerV1Credentials {
	googleBusinessProfileOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GoogleBusinessProfileTriggerNode = {
	type: 'n8n-nodes-base.googleBusinessProfileTrigger';
	version: 1;
	config: NodeConfig<GoogleBusinessProfileTriggerV1Params>;
	credentials?: GoogleBusinessProfileTriggerV1Credentials;
	isTrigger: true;
};
