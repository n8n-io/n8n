/**
 * Storyblok Node - Version 1
 * Consume Storyblok API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get a story */
export type StoryblokV1StoryGetConfig = {
	resource: 'story';
	operation: 'get';
/**
 * Pick where your data comes from, Content or Management API
 * @default contentApi
 */
		source?: 'contentApi' | 'managementApi' | Expression<string>;
/**
 * The ID or slug of the story to get
 * @displayOptions.show { source: ["contentApi"], resource: ["story"], operation: ["get"] }
 */
		identifier: string | Expression<string>;
/**
 * The name of the space. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { source: ["managementApi"], resource: ["story"], operation: ["get"] }
 */
		space: string | Expression<string>;
/**
 * Numeric ID of the story
 * @displayOptions.show { source: ["managementApi"], resource: ["story"], operation: ["get"] }
 */
		storyId: string | Expression<string>;
};

/** Get many stories */
export type StoryblokV1StoryGetAllConfig = {
	resource: 'story';
	operation: 'getAll';
/**
 * Pick where your data comes from, Content or Management API
 * @default contentApi
 */
		source?: 'contentApi' | 'managementApi' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { source: ["contentApi"], resource: ["story"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { source: ["contentApi"], resource: ["story"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
/**
 * The name of the space. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { source: ["managementApi"], resource: ["story"], operation: ["getAll"] }
 */
		space: string | Expression<string>;
};

export type StoryblokV1Params =
	| StoryblokV1StoryGetConfig
	| StoryblokV1StoryGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface StoryblokV1Credentials {
	storyblokContentApi: CredentialReference;
	storyblokManagementApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type StoryblokV1Node = {
	type: 'n8n-nodes-base.storyblok';
	version: 1;
	config: NodeConfig<StoryblokV1Params>;
	credentials?: StoryblokV1Credentials;
};