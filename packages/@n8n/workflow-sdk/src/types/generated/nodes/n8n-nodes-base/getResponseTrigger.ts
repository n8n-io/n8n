/**
 * GetResponse Trigger Node Types
 *
 * Starts the workflow when GetResponse events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/getresponsetrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface GetResponseTriggerV1Params {
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
// Node Type
// ===========================================================================

export type GetResponseTriggerNode = {
	type: 'n8n-nodes-base.getResponseTrigger';
	version: 1;
	config: NodeConfig<GetResponseTriggerV1Params>;
	credentials?: GetResponseTriggerV1Credentials;
	isTrigger: true;
};
