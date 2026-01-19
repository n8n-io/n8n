/**
 * Wordpress Node - Version 1
 * Consume Wordpress API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a post */
export type WordpressV1PostCreateConfig = {
	resource: 'post';
	operation: 'create';
/**
 * The title for the post
 * @displayOptions.show { resource: ["post"], operation: ["create"] }
 */
		title: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a post */
export type WordpressV1PostGetConfig = {
	resource: 'post';
	operation: 'get';
/**
 * Unique identifier for the object
 * @displayOptions.show { resource: ["post"], operation: ["get"] }
 */
		postId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many posts */
export type WordpressV1PostGetAllConfig = {
	resource: 'post';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["post"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["post"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a post */
export type WordpressV1PostUpdateConfig = {
	resource: 'post';
	operation: 'update';
/**
 * Unique identifier for the object
 * @displayOptions.show { resource: ["post"], operation: ["update"] }
 */
		postId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a post */
export type WordpressV1PageCreateConfig = {
	resource: 'page';
	operation: 'create';
/**
 * The title for the page
 * @displayOptions.show { resource: ["page"], operation: ["create"] }
 */
		title: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a post */
export type WordpressV1PageGetConfig = {
	resource: 'page';
	operation: 'get';
/**
 * Unique identifier for the object
 * @displayOptions.show { resource: ["page"], operation: ["get"] }
 */
		pageId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many posts */
export type WordpressV1PageGetAllConfig = {
	resource: 'page';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["page"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["page"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a post */
export type WordpressV1PageUpdateConfig = {
	resource: 'page';
	operation: 'update';
/**
 * Unique identifier for the object
 * @displayOptions.show { resource: ["page"], operation: ["update"] }
 */
		pageId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a post */
export type WordpressV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
/**
 * Login name for the user
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		username: string | Expression<string>;
/**
 * Display name for the user
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		name: string | Expression<string>;
/**
 * First name for the user
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		firstName: string | Expression<string>;
/**
 * Last name for the user
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		lastName: string | Expression<string>;
/**
 * The email address for the user
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		email: string | Expression<string>;
/**
 * Password for the user (never included)
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		password: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a post */
export type WordpressV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
/**
 * Unique identifier for the user
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 */
		userId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many posts */
export type WordpressV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a post */
export type WordpressV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
/**
 * Unique identifier for the user
 * @displayOptions.show { resource: ["user"], operation: ["update"] }
 */
		userId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type WordpressV1PostCreateOutput = {
	_links?: {
		about?: Array<{
			href?: string;
		}>;
		author?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		collection?: Array<{
			href?: string;
		}>;
		curies?: Array<{
			href?: string;
			name?: string;
			templated?: boolean;
		}>;
		replies?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		self?: Array<{
			href?: string;
			targetHints?: {
				allow?: Array<string>;
			};
		}>;
		'version-history'?: Array<{
			count?: number;
			href?: string;
		}>;
		'wp:action-assign-author'?: Array<{
			href?: string;
		}>;
		'wp:action-assign-categories'?: Array<{
			href?: string;
		}>;
		'wp:action-assign-tags'?: Array<{
			href?: string;
		}>;
		'wp:action-create-categories'?: Array<{
			href?: string;
		}>;
		'wp:action-create-tags'?: Array<{
			href?: string;
		}>;
		'wp:action-publish'?: Array<{
			href?: string;
		}>;
		'wp:action-sticky'?: Array<{
			href?: string;
		}>;
		'wp:action-unfiltered-html'?: Array<{
			href?: string;
		}>;
		'wp:attachment'?: Array<{
			href?: string;
		}>;
		'wp:term'?: Array<{
			embeddable?: boolean;
			href?: string;
			taxonomy?: string;
		}>;
	};
	author?: number;
	categories?: Array<number>;
	comment_status?: string;
	content?: {
		block_version?: number;
		protected?: boolean;
		raw?: string;
		rendered?: string;
	};
	date?: string;
	date_gmt?: string;
	excerpt?: {
		protected?: boolean;
		raw?: string;
		rendered?: string;
	};
	featured_media?: number;
	format?: string;
	generated_slug?: string;
	guid?: {
		raw?: string;
		rendered?: string;
	};
	id?: number;
	link?: string;
	meta?: {
		footnotes?: string;
	};
	modified?: string;
	modified_gmt?: string;
	password?: string;
	permalink_template?: string;
	ping_status?: string;
	slug?: string;
	status?: string;
	sticky?: boolean;
	tags?: Array<number>;
	template?: string;
	title?: {
		raw?: string;
		rendered?: string;
	};
	type?: string;
};

export type WordpressV1PostGetOutput = {
	_links?: {
		about?: Array<{
			href?: string;
		}>;
		author?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		collection?: Array<{
			href?: string;
		}>;
		curies?: Array<{
			href?: string;
			name?: string;
			templated?: boolean;
		}>;
		'predecessor-version'?: Array<{
			href?: string;
			id?: number;
		}>;
		replies?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		self?: Array<{
			href?: string;
			targetHints?: {
				allow?: Array<string>;
			};
		}>;
		'version-history'?: Array<{
			count?: number;
			href?: string;
		}>;
		'wp:attachment'?: Array<{
			href?: string;
		}>;
		'wp:featuredmedia'?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		'wp:term'?: Array<{
			embeddable?: boolean;
			href?: string;
			taxonomy?: string;
		}>;
	};
	author?: number;
	categories?: Array<number>;
	comment_status?: string;
	content?: {
		protected?: boolean;
		rendered?: string;
	};
	date?: string;
	date_gmt?: string;
	excerpt?: {
		protected?: boolean;
		rendered?: string;
	};
	featured_media?: number;
	format?: string;
	guid?: {
		rendered?: string;
	};
	id?: number;
	link?: string;
	meta?: {
		footnotes?: string;
	};
	modified?: string;
	modified_gmt?: string;
	ping_status?: string;
	slug?: string;
	status?: string;
	sticky?: boolean;
	tags?: Array<number>;
	template?: string;
	title?: {
		rendered?: string;
	};
	type?: string;
};

export type WordpressV1PostGetAllOutput = {
	_links?: {
		about?: Array<{
			href?: string;
		}>;
		author?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		collection?: Array<{
			href?: string;
		}>;
		curies?: Array<{
			href?: string;
			name?: string;
			templated?: boolean;
		}>;
		'predecessor-version'?: Array<{
			href?: string;
			id?: number;
		}>;
		replies?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		self?: Array<{
			href?: string;
			targetHints?: {
				allow?: Array<string>;
			};
		}>;
		'version-history'?: Array<{
			count?: number;
			href?: string;
		}>;
		'wp:attachment'?: Array<{
			href?: string;
		}>;
		'wp:featuredmedia'?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		'wp:term'?: Array<{
			embeddable?: boolean;
			href?: string;
			taxonomy?: string;
		}>;
	};
	author?: number;
	categories?: Array<number>;
	comment_status?: string;
	content?: {
		protected?: boolean;
		rendered?: string;
	};
	date?: string;
	date_gmt?: string;
	excerpt?: {
		protected?: boolean;
		rendered?: string;
	};
	featured_media?: number;
	format?: string;
	guid?: {
		rendered?: string;
	};
	id?: number;
	link?: string;
	meta?: {
		footnotes?: string;
	};
	modified?: string;
	modified_gmt?: string;
	ping_status?: string;
	slug?: string;
	status?: string;
	sticky?: boolean;
	tags?: Array<number>;
	template?: string;
	title?: {
		rendered?: string;
	};
	type?: string;
};

export type WordpressV1PostUpdateOutput = {
	_links?: {
		about?: Array<{
			href?: string;
		}>;
		author?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		collection?: Array<{
			href?: string;
		}>;
		curies?: Array<{
			href?: string;
			name?: string;
			templated?: boolean;
		}>;
		'predecessor-version'?: Array<{
			href?: string;
			id?: number;
		}>;
		replies?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		self?: Array<{
			href?: string;
			targetHints?: {
				allow?: Array<string>;
			};
		}>;
		'version-history'?: Array<{
			count?: number;
			href?: string;
		}>;
		'wp:action-assign-author'?: Array<{
			href?: string;
		}>;
		'wp:action-assign-categories'?: Array<{
			href?: string;
		}>;
		'wp:action-assign-tags'?: Array<{
			href?: string;
		}>;
		'wp:action-create-categories'?: Array<{
			href?: string;
		}>;
		'wp:action-create-tags'?: Array<{
			href?: string;
		}>;
		'wp:action-publish'?: Array<{
			href?: string;
		}>;
		'wp:action-sticky'?: Array<{
			href?: string;
		}>;
		'wp:action-unfiltered-html'?: Array<{
			href?: string;
		}>;
		'wp:attachment'?: Array<{
			href?: string;
		}>;
		'wp:term'?: Array<{
			embeddable?: boolean;
			href?: string;
			taxonomy?: string;
		}>;
	};
	author?: number;
	categories?: Array<number>;
	comment_status?: string;
	content?: {
		block_version?: number;
		protected?: boolean;
		raw?: string;
		rendered?: string;
	};
	date?: string;
	date_gmt?: string;
	excerpt?: {
		protected?: boolean;
		raw?: string;
		rendered?: string;
	};
	featured_media?: number;
	format?: string;
	generated_slug?: string;
	guid?: {
		raw?: string;
		rendered?: string;
	};
	id?: number;
	link?: string;
	meta?: {
		footnotes?: string;
	};
	modified?: string;
	modified_gmt?: string;
	password?: string;
	permalink_template?: string;
	ping_status?: string;
	slug?: string;
	status?: string;
	sticky?: boolean;
	tags?: Array<number>;
	template?: string;
	title?: {
		raw?: string;
		rendered?: string;
	};
	type?: string;
};

export type WordpressV1PageCreateOutput = {
	_links?: {
		about?: Array<{
			href?: string;
		}>;
		author?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		collection?: Array<{
			href?: string;
		}>;
		curies?: Array<{
			href?: string;
			name?: string;
			templated?: boolean;
		}>;
		replies?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		self?: Array<{
			href?: string;
			targetHints?: {
				allow?: Array<string>;
			};
		}>;
		'version-history'?: Array<{
			count?: number;
			href?: string;
		}>;
		'wp:action-assign-author'?: Array<{
			href?: string;
		}>;
		'wp:action-publish'?: Array<{
			href?: string;
		}>;
		'wp:action-unfiltered-html'?: Array<{
			href?: string;
		}>;
		'wp:attachment'?: Array<{
			href?: string;
		}>;
	};
	author?: number;
	comment_status?: string;
	content?: {
		block_version?: number;
		protected?: boolean;
		raw?: string;
	};
	date?: string;
	date_gmt?: string;
	excerpt?: {
		protected?: boolean;
		raw?: string;
		rendered?: string;
	};
	featured_media?: number;
	generated_slug?: string;
	guid?: {
		raw?: string;
		rendered?: string;
	};
	id?: number;
	link?: string;
	menu_order?: number;
	meta?: {
		footnotes?: string;
	};
	modified?: string;
	modified_gmt?: string;
	parent?: number;
	password?: string;
	permalink_template?: string;
	ping_status?: string;
	slug?: string;
	status?: string;
	template?: string;
	title?: {
		raw?: string;
		rendered?: string;
	};
	type?: string;
};

export type WordpressV1PageGetOutput = {
	_links?: {
		about?: Array<{
			href?: string;
		}>;
		author?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		collection?: Array<{
			href?: string;
		}>;
		curies?: Array<{
			href?: string;
			name?: string;
			templated?: boolean;
		}>;
		'predecessor-version'?: Array<{
			href?: string;
			id?: number;
		}>;
		replies?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		self?: Array<{
			href?: string;
			targetHints?: {
				allow?: Array<string>;
			};
		}>;
		'version-history'?: Array<{
			count?: number;
			href?: string;
		}>;
		'wp:attachment'?: Array<{
			href?: string;
		}>;
	};
	author?: number;
	class_list?: Array<string>;
	comment_status?: string;
	content?: {
		protected?: boolean;
		rendered?: string;
	};
	date?: string;
	date_gmt?: string;
	excerpt?: {
		protected?: boolean;
		rendered?: string;
	};
	featured_media?: number;
	guid?: {
		rendered?: string;
	};
	link?: string;
	menu_order?: number;
	meta?: {
		footnotes?: string;
	};
	modified?: string;
	modified_gmt?: string;
	parent?: number;
	ping_status?: string;
	slug?: string;
	status?: string;
	template?: string;
	title?: {
		rendered?: string;
	};
	type?: string;
};

export type WordpressV1PageGetAllOutput = {
	_links?: {
		about?: Array<{
			href?: string;
		}>;
		author?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		collection?: Array<{
			href?: string;
		}>;
		curies?: Array<{
			href?: string;
			name?: string;
			templated?: boolean;
		}>;
		'predecessor-version'?: Array<{
			href?: string;
			id?: number;
		}>;
		replies?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		self?: Array<{
			href?: string;
			targetHints?: {
				allow?: Array<string>;
			};
		}>;
		'version-history'?: Array<{
			count?: number;
			href?: string;
		}>;
		'wp:attachment'?: Array<{
			href?: string;
		}>;
	};
	author?: number;
	comment_status?: string;
	content?: {
		protected?: boolean;
		rendered?: string;
	};
	date?: string;
	date_gmt?: string;
	excerpt?: {
		protected?: boolean;
		rendered?: string;
	};
	featured_media?: number;
	guid?: {
		rendered?: string;
	};
	id?: number;
	link?: string;
	menu_order?: number;
	meta?: {
		footnotes?: string;
	};
	modified?: string;
	modified_gmt?: string;
	parent?: number;
	ping_status?: string;
	slug?: string;
	status?: string;
	template?: string;
	title?: {
		rendered?: string;
	};
	type?: string;
};

export type WordpressV1PageUpdateOutput = {
	_links?: {
		about?: Array<{
			href?: string;
		}>;
		author?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		collection?: Array<{
			href?: string;
		}>;
		curies?: Array<{
			href?: string;
			name?: string;
			templated?: boolean;
		}>;
		'predecessor-version'?: Array<{
			href?: string;
			id?: number;
		}>;
		replies?: Array<{
			embeddable?: boolean;
			href?: string;
		}>;
		self?: Array<{
			href?: string;
			targetHints?: {
				allow?: Array<string>;
			};
		}>;
		'version-history'?: Array<{
			count?: number;
			href?: string;
		}>;
		'wp:action-assign-author'?: Array<{
			href?: string;
		}>;
		'wp:action-publish'?: Array<{
			href?: string;
		}>;
		'wp:action-unfiltered-html'?: Array<{
			href?: string;
		}>;
		'wp:attachment'?: Array<{
			href?: string;
		}>;
	};
	author?: number;
	comment_status?: string;
	content?: {
		block_version?: number;
		protected?: boolean;
		raw?: string;
		rendered?: string;
	};
	date?: string;
	date_gmt?: string;
	excerpt?: {
		protected?: boolean;
		raw?: string;
		rendered?: string;
	};
	featured_media?: number;
	generated_slug?: string;
	guid?: {
		raw?: string;
		rendered?: string;
	};
	id?: number;
	link?: string;
	menu_order?: number;
	meta?: {
		footnotes?: string;
	};
	modified?: string;
	modified_gmt?: string;
	parent?: number;
	password?: string;
	permalink_template?: string;
	ping_status?: string;
	slug?: string;
	status?: string;
	template?: string;
	title?: {
		raw?: string;
		rendered?: string;
	};
	type?: string;
};

export type WordpressV1UserCreateOutput = {
	_links?: {
		collection?: Array<{
			href?: string;
		}>;
		self?: Array<{
			href?: string;
			targetHints?: {
				allow?: Array<string>;
			};
		}>;
	};
	avatar_urls?: {
		'24'?: string;
		'48'?: string;
		'96'?: string;
	};
	capabilities?: {
		level_0?: boolean;
		read?: boolean;
		subscriber?: boolean;
	};
	description?: string;
	email?: string;
	extra_capabilities?: {
		subscriber?: boolean;
	};
	first_name?: string;
	id?: number;
	last_name?: string;
	link?: string;
	locale?: string;
	name?: string;
	nickname?: string;
	registered_date?: string;
	roles?: Array<string>;
	slug?: string;
	url?: string;
	username?: string;
};

export type WordpressV1UserGetOutput = {
	_links?: {
		collection?: Array<{
			href?: string;
		}>;
		self?: Array<{
			href?: string;
		}>;
	};
	description?: string;
	id?: number;
	link?: string;
	name?: string;
	slug?: string;
	url?: string;
};

export type WordpressV1UserGetAllOutput = {
	id: number;
	name: string;
	url: string;
	description: string;
	link: string;
	slug: string;
	avatar_urls?: {
		'24': string;
		'48': string;
		'96': string;
	};
	_links: {
		self: Array<{
			href: string;
		}>;
		collection: Array<{
			href: string;
		}>;
	};
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface WordpressV1Credentials {
	wordpressApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface WordpressV1NodeBase {
	type: 'n8n-nodes-base.wordpress';
	version: 1;
	credentials?: WordpressV1Credentials;
}

export type WordpressV1PostCreateNode = WordpressV1NodeBase & {
	config: NodeConfig<WordpressV1PostCreateConfig>;
	output?: WordpressV1PostCreateOutput;
};

export type WordpressV1PostGetNode = WordpressV1NodeBase & {
	config: NodeConfig<WordpressV1PostGetConfig>;
	output?: WordpressV1PostGetOutput;
};

export type WordpressV1PostGetAllNode = WordpressV1NodeBase & {
	config: NodeConfig<WordpressV1PostGetAllConfig>;
	output?: WordpressV1PostGetAllOutput;
};

export type WordpressV1PostUpdateNode = WordpressV1NodeBase & {
	config: NodeConfig<WordpressV1PostUpdateConfig>;
	output?: WordpressV1PostUpdateOutput;
};

export type WordpressV1PageCreateNode = WordpressV1NodeBase & {
	config: NodeConfig<WordpressV1PageCreateConfig>;
	output?: WordpressV1PageCreateOutput;
};

export type WordpressV1PageGetNode = WordpressV1NodeBase & {
	config: NodeConfig<WordpressV1PageGetConfig>;
	output?: WordpressV1PageGetOutput;
};

export type WordpressV1PageGetAllNode = WordpressV1NodeBase & {
	config: NodeConfig<WordpressV1PageGetAllConfig>;
	output?: WordpressV1PageGetAllOutput;
};

export type WordpressV1PageUpdateNode = WordpressV1NodeBase & {
	config: NodeConfig<WordpressV1PageUpdateConfig>;
	output?: WordpressV1PageUpdateOutput;
};

export type WordpressV1UserCreateNode = WordpressV1NodeBase & {
	config: NodeConfig<WordpressV1UserCreateConfig>;
	output?: WordpressV1UserCreateOutput;
};

export type WordpressV1UserGetNode = WordpressV1NodeBase & {
	config: NodeConfig<WordpressV1UserGetConfig>;
	output?: WordpressV1UserGetOutput;
};

export type WordpressV1UserGetAllNode = WordpressV1NodeBase & {
	config: NodeConfig<WordpressV1UserGetAllConfig>;
	output?: WordpressV1UserGetAllOutput;
};

export type WordpressV1UserUpdateNode = WordpressV1NodeBase & {
	config: NodeConfig<WordpressV1UserUpdateConfig>;
};

export type WordpressV1Node =
	| WordpressV1PostCreateNode
	| WordpressV1PostGetNode
	| WordpressV1PostGetAllNode
	| WordpressV1PostUpdateNode
	| WordpressV1PageCreateNode
	| WordpressV1PageGetNode
	| WordpressV1PageGetAllNode
	| WordpressV1PageUpdateNode
	| WordpressV1UserCreateNode
	| WordpressV1UserGetNode
	| WordpressV1UserGetAllNode
	| WordpressV1UserUpdateNode
	;