/**
 * LinkedIn Node Types
 *
 * Consume LinkedIn API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/linkedin/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new post */
export type LinkedInV1PostCreateConfig = {
	resource: 'post';
	operation: 'create';
	/**
	 * If to post on behalf of a user or an organization
	 * @default person
	 */
	postAs?: 'person' | 'organization' | Expression<string>;
	/**
	 * Person as which the post should be posted as. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	person: string | Expression<string>;
	/**
	 * URN of Organization as which the post should be posted as
	 */
	organization?: string | Expression<string>;
	/**
	 * The primary content of the post
	 */
	text?: string | Expression<string>;
	shareMediaCategory?: 'NONE' | 'ARTICLE' | 'IMAGE' | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type LinkedInV1Params = LinkedInV1PostCreateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LinkedInV1Credentials {
	linkedInOAuth2Api: CredentialReference;
	linkedInCommunityManagementOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LinkedInV1Node = {
	type: 'n8n-nodes-base.linkedIn';
	version: 1;
	config: NodeConfig<LinkedInV1Params>;
	credentials?: LinkedInV1Credentials;
};

export type LinkedInNode = LinkedInV1Node;
