/**
 * LinkedIn Node - Version 1
 * Consume LinkedIn API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
 * @displayOptions.show { operation: ["create"], postAs: ["person"], resource: ["post"] }
 */
		person: string | Expression<string>;
/**
 * URN of Organization as which the post should be posted as
 * @displayOptions.show { operation: ["create"], postAs: ["organization"], resource: ["post"] }
 */
		organization?: string | Expression<string>;
/**
 * The primary content of the post
 * @displayOptions.show { operation: ["create"], resource: ["post"] }
 */
		text?: string | Expression<string>;
	shareMediaCategory?: 'NONE' | 'ARTICLE' | 'IMAGE' | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type LinkedInV1Params =
	| LinkedInV1PostCreateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type LinkedInV1PostCreateOutput = {
	urn?: string;
};

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

interface LinkedInV1NodeBase {
	type: 'n8n-nodes-base.linkedIn';
	version: 1;
	credentials?: LinkedInV1Credentials;
}

export type LinkedInV1PostCreateNode = LinkedInV1NodeBase & {
	config: NodeConfig<LinkedInV1PostCreateConfig>;
	output?: LinkedInV1PostCreateOutput;
};

export type LinkedInV1Node = LinkedInV1PostCreateNode;