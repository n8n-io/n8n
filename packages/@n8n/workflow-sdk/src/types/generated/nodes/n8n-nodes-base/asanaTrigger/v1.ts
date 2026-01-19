/**
 * Asana Trigger Node - Version 1
 * Starts the workflow when Asana events occur.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AsanaTriggerV1Config {
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
// Node Types
// ===========================================================================

interface AsanaTriggerV1NodeBase {
	type: 'n8n-nodes-base.asanaTrigger';
	version: 1;
	credentials?: AsanaTriggerV1Credentials;
	isTrigger: true;
}

export type AsanaTriggerV1Node = AsanaTriggerV1NodeBase & {
	config: NodeConfig<AsanaTriggerV1Config>;
};

export type AsanaTriggerV1Node = AsanaTriggerV1Node;