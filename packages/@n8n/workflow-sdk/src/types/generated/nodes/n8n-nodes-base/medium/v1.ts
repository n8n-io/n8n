/**
 * Medium Node - Version 1
 * Consume Medium API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a post */
export type MediumV1PostCreateConfig = {
	resource: 'post';
	operation: 'create';
/**
 * Whether you are posting for a publication
 * @displayOptions.show { resource: ["post"], operation: ["create"] }
 * @default false
 */
		publication?: boolean | Expression<boolean>;
/**
 * Publication IDs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["post"], operation: ["create"], publication: [true] }
 */
		publicationId?: string | Expression<string>;
/**
 * Title of the post. Max Length : 100 characters.
 * @displayOptions.show { operation: ["create"], resource: ["post"] }
 */
		title: string | Expression<string>;
/**
 * The format of the content to be posted
 * @displayOptions.show { operation: ["create"], resource: ["post"] }
 */
		contentFormat: 'html' | 'markdown' | Expression<string>;
/**
 * The body of the post, in a valid semantic HTML fragment, or Markdown
 * @displayOptions.show { operation: ["create"], resource: ["post"] }
 */
		content: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many publications */
export type MediumV1PublicationGetAllConfig = {
	resource: 'publication';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["publication"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["publication"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

export type MediumV1Params =
	| MediumV1PostCreateConfig
	| MediumV1PublicationGetAllConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type MediumV1PostCreateOutput = {
	authorId?: string;
	canonicalUrl?: string;
	id?: string;
	license?: string;
	licenseUrl?: string;
	publishedAt?: number;
	publishStatus?: string;
	tags?: Array<string>;
	title?: string;
	url?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface MediumV1Credentials {
	mediumApi: CredentialReference;
	mediumOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MediumV1NodeBase {
	type: 'n8n-nodes-base.medium';
	version: 1;
	credentials?: MediumV1Credentials;
}

export type MediumV1PostCreateNode = MediumV1NodeBase & {
	config: NodeConfig<MediumV1PostCreateConfig>;
	output?: MediumV1PostCreateOutput;
};

export type MediumV1PublicationGetAllNode = MediumV1NodeBase & {
	config: NodeConfig<MediumV1PublicationGetAllConfig>;
};

export type MediumV1Node =
	| MediumV1PostCreateNode
	| MediumV1PublicationGetAllNode
	;