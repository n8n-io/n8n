/**
 * Google Business Profile Node Types
 *
 * Consume Google Business Profile API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googlebusinessprofile/
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

/** Create a new post on Google Business Profile */
export type GoogleBusinessProfileV1PostCreateConfig = {
	resource: 'post';
	operation: 'create';
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
	/**
	 * The type of post to create (standard, event, offer, or alert)
	 * @default STANDARD
	 */
	postType: 'STANDARD' | 'EVENT' | 'OFFER' | 'ALERT' | Expression<string>;
	/**
	 * The main text of the post
	 */
	summary: string | Expression<string>;
	/**
	 * E.g. Sales this week.
	 */
	title: string | Expression<string>;
	/**
	 * The start date and time of the event
	 */
	startDateTime: string | Expression<string>;
	/**
	 * The end date and time of the event
	 */
	endDateTime: string | Expression<string>;
	/**
	 * The start date of the offer
	 */
	startDate: string | Expression<string>;
	/**
	 * The end date of the offer
	 */
	endDate: string | Expression<string>;
	/**
	 * The sub-type of the alert
	 * @default COVID_19
	 */
	alertType: 'COVID_19' | Expression<string>;
	additionalOptions?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Delete an existing post */
export type GoogleBusinessProfileV1PostDeleteConfig = {
	resource: 'post';
	operation: 'delete';
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
	/**
	 * Select the post to retrieve its details
	 * @default {"mode":"list","value":""}
	 */
	post?: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve details of a specific post */
export type GoogleBusinessProfileV1PostGetConfig = {
	resource: 'post';
	operation: 'get';
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
	/**
	 * Select the post to retrieve its details
	 * @default {"mode":"list","value":""}
	 */
	post?: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve multiple posts */
export type GoogleBusinessProfileV1PostGetAllConfig = {
	resource: 'post';
	operation: 'getAll';
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
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 20
	 */
	limit?: number | Expression<number>;
	requestOptions?: Record<string, unknown>;
};

/** Update an existing post */
export type GoogleBusinessProfileV1PostUpdateConfig = {
	resource: 'post';
	operation: 'update';
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
	/**
	 * Select the post to retrieve its details
	 * @default {"mode":"list","value":""}
	 */
	post?: ResourceLocatorValue;
	additionalOptions?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Delete an existing post */
export type GoogleBusinessProfileV1ReviewDeleteConfig = {
	resource: 'review';
	operation: 'delete';
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
	/**
	 * Select the review to retrieve its details
	 * @default {"mode":"list","value":""}
	 */
	review: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve details of a specific post */
export type GoogleBusinessProfileV1ReviewGetConfig = {
	resource: 'review';
	operation: 'get';
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
	/**
	 * Select the review to retrieve its details
	 * @default {"mode":"list","value":""}
	 */
	review: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve multiple posts */
export type GoogleBusinessProfileV1ReviewGetAllConfig = {
	resource: 'review';
	operation: 'getAll';
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
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 20
	 */
	limit: number | Expression<number>;
	requestOptions?: Record<string, unknown>;
};

/** Reply to a review */
export type GoogleBusinessProfileV1ReviewReplyConfig = {
	resource: 'review';
	operation: 'reply';
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
	/**
	 * Select the review to retrieve its details
	 * @default {"mode":"list","value":""}
	 */
	review: ResourceLocatorValue;
	/**
	 * The body of the reply (up to 4096 characters)
	 */
	reply?: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type GoogleBusinessProfileV1Params =
	| GoogleBusinessProfileV1PostCreateConfig
	| GoogleBusinessProfileV1PostDeleteConfig
	| GoogleBusinessProfileV1PostGetConfig
	| GoogleBusinessProfileV1PostGetAllConfig
	| GoogleBusinessProfileV1PostUpdateConfig
	| GoogleBusinessProfileV1ReviewDeleteConfig
	| GoogleBusinessProfileV1ReviewGetConfig
	| GoogleBusinessProfileV1ReviewGetAllConfig
	| GoogleBusinessProfileV1ReviewReplyConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleBusinessProfileV1Credentials {
	googleBusinessProfileOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GoogleBusinessProfileV1Node = {
	type: 'n8n-nodes-base.googleBusinessProfile';
	version: 1;
	config: NodeConfig<GoogleBusinessProfileV1Params>;
	credentials?: GoogleBusinessProfileV1Credentials;
};

export type GoogleBusinessProfileNode = GoogleBusinessProfileV1Node;
