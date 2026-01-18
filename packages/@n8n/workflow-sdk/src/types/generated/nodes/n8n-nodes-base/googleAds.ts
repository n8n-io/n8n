/**
 * Google Ads Node Types
 *
 * Use the Google Ads API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googleads/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many campaigns linked to the specified account */
export type GoogleAdsV1CampaignGetAllConfig = {
	resource: 'campaign';
	operation: 'getAll';
	managerCustomerId: string | Expression<string>;
	clientCustomerId: string | Expression<string>;
	/**
	 * Additional options for fetching campaigns
	 * @default {}
	 */
	additionalOptions?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Get a specific campaign */
export type GoogleAdsV1CampaignGetConfig = {
	resource: 'campaign';
	operation: 'get';
	managerCustomerId: string | Expression<string>;
	clientCustomerId: string | Expression<string>;
	/**
	 * ID of the campaign
	 */
	campaignId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type GoogleAdsV1Params = GoogleAdsV1CampaignGetAllConfig | GoogleAdsV1CampaignGetConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleAdsV1Credentials {
	googleAdsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GoogleAdsV1Node = {
	type: 'n8n-nodes-base.googleAds';
	version: 1;
	config: NodeConfig<GoogleAdsV1Params>;
	credentials?: GoogleAdsV1Credentials;
};

export type GoogleAdsNode = GoogleAdsV1Node;
