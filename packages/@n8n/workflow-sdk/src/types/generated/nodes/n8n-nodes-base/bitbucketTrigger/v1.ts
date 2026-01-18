/**
 * Bitbucket Trigger Node - Version 1
 * Handle Bitbucket events via webhooks
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface BitbucketTriggerV1Params {
	authentication?: 'password' | 'accessToken' | Expression<string>;
	resource: 'repository' | 'workspace' | Expression<string>;
/**
 * The repository of which to listen to the events. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["workspace", "repository"] }
 */
		workspace: string | Expression<string>;
/**
 * The events to listen to. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["workspace"] }
 * @default []
 */
		events: string[];
/**
 * The repository of which to listen to the events. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["repository"] }
 */
		repository: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface BitbucketTriggerV1Credentials {
	bitbucketApi: CredentialReference;
	bitbucketAccessTokenApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type BitbucketTriggerV1Node = {
	type: 'n8n-nodes-base.bitbucketTrigger';
	version: 1;
	config: NodeConfig<BitbucketTriggerV1Params>;
	credentials?: BitbucketTriggerV1Credentials;
	isTrigger: true;
};