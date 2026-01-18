/**
 * Asana Trigger Node - Version 1
 * Starts the workflow when Asana events occur.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AsanaTriggerV1Params {
	authentication?: 'accessToken' | 'oAuth2' | Expression<string>;
/**
 * The resource ID to subscribe to. The resource can be a task or project.
 */
		resource: string | Expression<string>;
/**
 * The workspace ID the resource is registered under. This is only required if you want to allow overriding existing webhooks. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		workspace?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AsanaTriggerV1Credentials {
	asanaApi: CredentialReference;
	asanaOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AsanaTriggerV1Node = {
	type: 'n8n-nodes-base.asanaTrigger';
	version: 1;
	config: NodeConfig<AsanaTriggerV1Params>;
	credentials?: AsanaTriggerV1Credentials;
	isTrigger: true;
};