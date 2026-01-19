/**
 * PostHog Node - Version 1
 * Consume PostHog API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an alias */
export type PostHogV1AliasCreateConfig = {
	resource: 'alias';
	operation: 'create';
/**
 * The name of the alias
 * @displayOptions.show { resource: ["alias"], operation: ["create"] }
 */
		alias: string | Expression<string>;
/**
 * The user's distinct ID
 * @displayOptions.show { resource: ["alias"], operation: ["create"] }
 */
		distinctId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create an alias */
export type PostHogV1EventCreateConfig = {
	resource: 'event';
	operation: 'create';
/**
 * The name of the event
 * @displayOptions.show { resource: ["event"], operation: ["create"] }
 */
		eventName: string | Expression<string>;
/**
 * The user's distinct ID
 * @displayOptions.show { resource: ["event"], operation: ["create"] }
 */
		distinctId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create an alias */
export type PostHogV1IdentityCreateConfig = {
	resource: 'identity';
	operation: 'create';
/**
 * The identity's distinct ID
 * @displayOptions.show { resource: ["identity"], operation: ["create"] }
 */
		distinctId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Track a page */
export type PostHogV1TrackPageConfig = {
	resource: 'track';
	operation: 'page';
	name: string | Expression<string>;
/**
 * The user's distinct ID
 * @displayOptions.show { resource: ["track"], operation: ["page", "screen"] }
 */
		distinctId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Track a screen */
export type PostHogV1TrackScreenConfig = {
	resource: 'track';
	operation: 'screen';
	name: string | Expression<string>;
/**
 * The user's distinct ID
 * @displayOptions.show { resource: ["track"], operation: ["page", "screen"] }
 */
		distinctId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type PostHogV1Params =
	| PostHogV1AliasCreateConfig
	| PostHogV1EventCreateConfig
	| PostHogV1IdentityCreateConfig
	| PostHogV1TrackPageConfig
	| PostHogV1TrackScreenConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type PostHogV1EventCreateOutput = {
	status?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface PostHogV1Credentials {
	postHogApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface PostHogV1NodeBase {
	type: 'n8n-nodes-base.postHog';
	version: 1;
	credentials?: PostHogV1Credentials;
}

export type PostHogV1AliasCreateNode = PostHogV1NodeBase & {
	config: NodeConfig<PostHogV1AliasCreateConfig>;
};

export type PostHogV1EventCreateNode = PostHogV1NodeBase & {
	config: NodeConfig<PostHogV1EventCreateConfig>;
	output?: PostHogV1EventCreateOutput;
};

export type PostHogV1IdentityCreateNode = PostHogV1NodeBase & {
	config: NodeConfig<PostHogV1IdentityCreateConfig>;
};

export type PostHogV1TrackPageNode = PostHogV1NodeBase & {
	config: NodeConfig<PostHogV1TrackPageConfig>;
};

export type PostHogV1TrackScreenNode = PostHogV1NodeBase & {
	config: NodeConfig<PostHogV1TrackScreenConfig>;
};

export type PostHogV1Node =
	| PostHogV1AliasCreateNode
	| PostHogV1EventCreateNode
	| PostHogV1IdentityCreateNode
	| PostHogV1TrackPageNode
	| PostHogV1TrackScreenNode
	;