/**
 * PostHog Node Types
 *
 * Consume PostHog API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/posthog/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an alias */
export type PostHogV1AliasCreateConfig = {
	resource: 'alias';
	operation: 'create';
	/**
	 * The name of the alias
	 */
	alias: string | Expression<string>;
	/**
	 * The user's distinct ID
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
	 */
	eventName: string | Expression<string>;
	/**
	 * The user's distinct ID
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
	 */
	distinctId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type PostHogV1Params =
	| PostHogV1AliasCreateConfig
	| PostHogV1EventCreateConfig
	| PostHogV1IdentityCreateConfig
	| PostHogV1TrackPageConfig
	| PostHogV1TrackScreenConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface PostHogV1Credentials {
	postHogApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type PostHogNode = {
	type: 'n8n-nodes-base.postHog';
	version: 1;
	config: NodeConfig<PostHogV1Params>;
	credentials?: PostHogV1Credentials;
};
