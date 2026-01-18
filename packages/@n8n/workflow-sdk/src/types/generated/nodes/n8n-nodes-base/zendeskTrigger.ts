/**
 * Zendesk Trigger Node Types
 *
 * Handle Zendesk events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/zendesktrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ZendeskTriggerV1Params {
	authentication?: 'apiToken' | 'oAuth2' | Expression<string>;
	service: 'support' | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * The condition to set
	 * @default {}
	 */
	conditions?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface ZendeskTriggerV1Credentials {
	zendeskApi: CredentialReference;
	zendeskOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ZendeskTriggerNode = {
	type: 'n8n-nodes-base.zendeskTrigger';
	version: 1;
	config: NodeConfig<ZendeskTriggerV1Params>;
	credentials?: ZendeskTriggerV1Credentials;
	isTrigger: true;
};
