/**
 * Google Ads Node - Version 1
 * Use the Google Ads API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
 * @displayOptions.show { resource: ["campaign"], operation: ["getAll"] }
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
 * @displayOptions.show { operation: ["get"], resource: ["campaign"] }
 */
		campaignId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type GoogleAdsV1Params =
	| GoogleAdsV1CampaignGetAllConfig
	| GoogleAdsV1CampaignGetConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleAdsV1Credentials {
	googleAdsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleAdsV1NodeBase {
	type: 'n8n-nodes-base.googleAds';
	version: 1;
	credentials?: GoogleAdsV1Credentials;
}

export type GoogleAdsV1CampaignGetAllNode = GoogleAdsV1NodeBase & {
	config: NodeConfig<GoogleAdsV1CampaignGetAllConfig>;
};

export type GoogleAdsV1CampaignGetNode = GoogleAdsV1NodeBase & {
	config: NodeConfig<GoogleAdsV1CampaignGetConfig>;
};

export type GoogleAdsV1Node =
	| GoogleAdsV1CampaignGetAllNode
	| GoogleAdsV1CampaignGetNode
	;