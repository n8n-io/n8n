/**
 * GetResponse Trigger Node - Version 1
 * Starts the workflow when GetResponse events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface GetResponseTriggerV1Config {
	authentication?: 'apiKey' | 'oAuth2' | Expression<string>;
	events: Array<'subscribe' | 'unsubscribe' | 'click' | 'open' | 'survey'>;
/**
 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @default []
 */
		listIds?: string[];
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GetResponseTriggerV1Credentials {
	getResponseApi: CredentialReference;
	getResponseOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GetResponseTriggerV1NodeBase {
	type: 'n8n-nodes-base.getResponseTrigger';
	version: 1;
	credentials?: GetResponseTriggerV1Credentials;
	isTrigger: true;
}

export type GetResponseTriggerV1Node = GetResponseTriggerV1NodeBase & {
	config: NodeConfig<GetResponseTriggerV1Config>;
};

export type GetResponseTriggerV1Node = GetResponseTriggerV1Node;