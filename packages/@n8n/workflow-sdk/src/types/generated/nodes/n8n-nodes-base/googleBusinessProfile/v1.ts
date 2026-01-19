/**
 * Google Business Profile Node - Version 1
 * Consume Google Business Profile API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
 * @displayOptions.show { resource: ["post"], operation: ["create"] }
 * @default {"mode":"list","value":""}
 */
		account: ResourceLocatorValue;
/**
 * The specific location or business associated with the account
 * @displayOptions.show { resource: ["post"], operation: ["create"] }
 * @default {"mode":"list","value":""}
 */
		location: ResourceLocatorValue;
/**
 * The type of post to create (standard, event, offer, or alert)
 * @displayOptions.show { resource: ["post"], operation: ["create"] }
 * @default STANDARD
 */
		postType: 'STANDARD' | 'EVENT' | 'OFFER' | 'ALERT' | Expression<string>;
/**
 * The main text of the post
 * @displayOptions.show { resource: ["post"], operation: ["create"] }
 */
		summary: string | Expression<string>;
/**
 * E.g. Sales this week.
 * @displayOptions.show { resource: ["post"], operation: ["create"], postType: ["EVENT"] }
 */
		title: string | Expression<string>;
/**
 * The start date and time of the event
 * @displayOptions.show { resource: ["post"], operation: ["create"], postType: ["EVENT"] }
 */
		startDateTime: string | Expression<string>;
/**
 * The end date and time of the event
 * @displayOptions.show { resource: ["post"], operation: ["create"], postType: ["EVENT"] }
 */
		endDateTime: string | Expression<string>;
/**
 * The start date of the offer
 * @displayOptions.show { resource: ["post"], operation: ["create"], postType: ["OFFER"] }
 */
		startDate: string | Expression<string>;
/**
 * The end date of the offer
 * @displayOptions.show { resource: ["post"], operation: ["create"], postType: ["OFFER"] }
 */
		endDate: string | Expression<string>;
/**
 * The sub-type of the alert
 * @displayOptions.show { resource: ["post"], operation: ["create"], postType: ["ALERT"] }
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
 * @displayOptions.show { resource: ["post"], operation: ["delete"] }
 * @default {"mode":"list","value":""}
 */
		account: ResourceLocatorValue;
/**
 * The specific location or business associated with the account
 * @displayOptions.show { resource: ["post"], operation: ["delete"] }
 * @default {"mode":"list","value":""}
 */
		location: ResourceLocatorValue;
/**
 * Select the post to retrieve its details
 * @displayOptions.show { resource: ["post"], operation: ["delete"] }
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
 * @displayOptions.show { resource: ["post"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		account: ResourceLocatorValue;
/**
 * The specific location or business associated with the account
 * @displayOptions.show { resource: ["post"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		location: ResourceLocatorValue;
/**
 * Select the post to retrieve its details
 * @displayOptions.show { resource: ["post"], operation: ["get"] }
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
 * @displayOptions.show { resource: ["post"], operation: ["getAll"] }
 * @default {"mode":"list","value":""}
 */
		account: ResourceLocatorValue;
/**
 * The specific location or business associated with the account
 * @displayOptions.show { resource: ["post"], operation: ["getAll"] }
 * @default {"mode":"list","value":""}
 */
		location: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["post"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["post"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["post"], operation: ["update"] }
 * @default {"mode":"list","value":""}
 */
		account: ResourceLocatorValue;
/**
 * The specific location or business associated with the account
 * @displayOptions.show { resource: ["post"], operation: ["update"] }
 * @default {"mode":"list","value":""}
 */
		location: ResourceLocatorValue;
/**
 * Select the post to retrieve its details
 * @displayOptions.show { resource: ["post"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["review"], operation: ["delete"] }
 * @default {"mode":"list","value":""}
 */
		account: ResourceLocatorValue;
/**
 * The specific location or business associated with the account
 * @displayOptions.show { resource: ["review"], operation: ["delete"] }
 * @default {"mode":"list","value":""}
 */
		location: ResourceLocatorValue;
/**
 * Select the review to retrieve its details
 * @displayOptions.show { resource: ["review"], operation: ["delete"] }
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
 * @displayOptions.show { resource: ["review"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		account: ResourceLocatorValue;
/**
 * The specific location or business associated with the account
 * @displayOptions.show { resource: ["review"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		location: ResourceLocatorValue;
/**
 * Select the review to retrieve its details
 * @displayOptions.show { resource: ["review"], operation: ["get"] }
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
 * @displayOptions.show { resource: ["review"], operation: ["getAll"] }
 * @default {"mode":"list","value":""}
 */
		account: ResourceLocatorValue;
/**
 * The specific location or business associated with the account
 * @displayOptions.show { resource: ["review"], operation: ["getAll"] }
 * @default {"mode":"list","value":""}
 */
		location: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["review"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["review"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["review"], operation: ["reply"] }
 * @default {"mode":"list","value":""}
 */
		account: ResourceLocatorValue;
/**
 * The specific location or business associated with the account
 * @displayOptions.show { resource: ["review"], operation: ["reply"] }
 * @default {"mode":"list","value":""}
 */
		location: ResourceLocatorValue;
/**
 * Select the review to retrieve its details
 * @displayOptions.show { resource: ["review"], operation: ["reply"] }
 * @default {"mode":"list","value":""}
 */
		review: ResourceLocatorValue;
/**
 * The body of the reply (up to 4096 characters)
 * @displayOptions.show { resource: ["review"], operation: ["reply"] }
 */
		reply?: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleBusinessProfileV1Credentials {
	googleBusinessProfileOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleBusinessProfileV1NodeBase {
	type: 'n8n-nodes-base.googleBusinessProfile';
	version: 1;
	credentials?: GoogleBusinessProfileV1Credentials;
}

export type GoogleBusinessProfileV1PostCreateNode = GoogleBusinessProfileV1NodeBase & {
	config: NodeConfig<GoogleBusinessProfileV1PostCreateConfig>;
};

export type GoogleBusinessProfileV1PostDeleteNode = GoogleBusinessProfileV1NodeBase & {
	config: NodeConfig<GoogleBusinessProfileV1PostDeleteConfig>;
};

export type GoogleBusinessProfileV1PostGetNode = GoogleBusinessProfileV1NodeBase & {
	config: NodeConfig<GoogleBusinessProfileV1PostGetConfig>;
};

export type GoogleBusinessProfileV1PostGetAllNode = GoogleBusinessProfileV1NodeBase & {
	config: NodeConfig<GoogleBusinessProfileV1PostGetAllConfig>;
};

export type GoogleBusinessProfileV1PostUpdateNode = GoogleBusinessProfileV1NodeBase & {
	config: NodeConfig<GoogleBusinessProfileV1PostUpdateConfig>;
};

export type GoogleBusinessProfileV1ReviewDeleteNode = GoogleBusinessProfileV1NodeBase & {
	config: NodeConfig<GoogleBusinessProfileV1ReviewDeleteConfig>;
};

export type GoogleBusinessProfileV1ReviewGetNode = GoogleBusinessProfileV1NodeBase & {
	config: NodeConfig<GoogleBusinessProfileV1ReviewGetConfig>;
};

export type GoogleBusinessProfileV1ReviewGetAllNode = GoogleBusinessProfileV1NodeBase & {
	config: NodeConfig<GoogleBusinessProfileV1ReviewGetAllConfig>;
};

export type GoogleBusinessProfileV1ReviewReplyNode = GoogleBusinessProfileV1NodeBase & {
	config: NodeConfig<GoogleBusinessProfileV1ReviewReplyConfig>;
};

export type GoogleBusinessProfileV1Node =
	| GoogleBusinessProfileV1PostCreateNode
	| GoogleBusinessProfileV1PostDeleteNode
	| GoogleBusinessProfileV1PostGetNode
	| GoogleBusinessProfileV1PostGetAllNode
	| GoogleBusinessProfileV1PostUpdateNode
	| GoogleBusinessProfileV1ReviewDeleteNode
	| GoogleBusinessProfileV1ReviewGetNode
	| GoogleBusinessProfileV1ReviewGetAllNode
	| GoogleBusinessProfileV1ReviewReplyNode
	;