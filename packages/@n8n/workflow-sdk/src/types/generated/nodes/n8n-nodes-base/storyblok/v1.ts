/**
 * Storyblok Node - Version 1
 * Consume Storyblok API
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
// Output Types
// ===========================================================================

export type StoryblokV1StoryGetAllOutput = {
	content_type?: string;
	created_at?: string;
	default_root?: null;
	deleted_at?: null;
	disable_fe_editor?: boolean;
	disble_fe_editor?: boolean;
	expire_at?: null;
	full_slug?: string;
	group_id?: string;
	id?: number;
	is_folder?: boolean;
	is_startpage?: boolean;
	last_author?: {
		friendly_name?: string;
		id?: number;
		userid?: string;
	};
	last_author_id?: number;
	name?: string;
	path?: null;
	pinned?: boolean;
	position?: number;
	publish_at?: null;
	published?: boolean;
	scheduled_dates?: null;
	slug?: string;
	sort_by_date?: null;
	tag_list?: Array<string>;
	unpublished_changes?: boolean;
	updated_at?: string;
	uuid?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface StoryblokV1Credentials {
	storyblokContentApi: CredentialReference;
	storyblokManagementApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface StoryblokV1NodeBase {
	type: 'n8n-nodes-base.storyblok';
	version: 1;
	credentials?: StoryblokV1Credentials;
}

export type StoryblokV1StoryGetNode = StoryblokV1NodeBase & {
	config: NodeConfig<StoryblokV1StoryGetConfig>;
};

export type StoryblokV1StoryGetAllNode = StoryblokV1NodeBase & {
	config: NodeConfig<StoryblokV1StoryGetAllConfig>;
	output?: StoryblokV1StoryGetAllOutput;
};

export type StoryblokV1Node =
	| StoryblokV1StoryGetNode
	| StoryblokV1StoryGetAllNode
	;