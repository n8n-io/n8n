/**
 * Medium Node Types
 *
 * Consume Medium API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/medium/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a post */
export type MediumV1PostCreateConfig = {
	resource: 'post';
	operation: 'create';
	/**
	 * Whether you are posting for a publication
	 * @default false
	 */
	publication?: boolean | Expression<boolean>;
	/**
	 * Publication IDs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	publicationId?: string | Expression<string>;
	/**
	 * Title of the post. Max Length : 100 characters.
	 */
	title: string | Expression<string>;
	/**
	 * The format of the content to be posted
	 */
	contentFormat: 'html' | 'markdown' | Expression<string>;
	/**
	 * The body of the post, in a valid semantic HTML fragment, or Markdown
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

export type MediumV1Params = MediumV1PostCreateConfig | MediumV1PublicationGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MediumV1Credentials {
	mediumApi: CredentialReference;
	mediumOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MediumNode = {
	type: 'n8n-nodes-base.medium';
	version: 1;
	config: NodeConfig<MediumV1Params>;
	credentials?: MediumV1Credentials;
};
