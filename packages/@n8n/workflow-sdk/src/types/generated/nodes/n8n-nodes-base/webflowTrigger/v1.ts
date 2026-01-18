/**
 * Webflow Trigger Node - Version 1
 * Handle Webflow events via webhooks
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface WebflowTriggerV1Params {
	authentication?: 'accessToken' | 'oAuth2' | Expression<string>;
/**
 * Site that will trigger the events. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		site: string | Expression<string>;
	event: 'collection_item_created' | 'collection_item_deleted' | 'collection_item_changed' | 'ecomm_inventory_changed' | 'ecomm_new_order' | 'ecomm_order_changed' | 'form_submission' | 'site_publish' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface WebflowTriggerV1Credentials {
	webflowApi: CredentialReference;
	webflowOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type WebflowTriggerV1Node = {
	type: 'n8n-nodes-base.webflowTrigger';
	version: 1;
	config: NodeConfig<WebflowTriggerV1Params>;
	credentials?: WebflowTriggerV1Credentials;
	isTrigger: true;
};