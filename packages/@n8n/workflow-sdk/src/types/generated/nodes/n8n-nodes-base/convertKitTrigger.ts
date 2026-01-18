/**
 * ConvertKit Trigger Node Types
 *
 * Handle ConvertKit events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/convertkittrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ConvertKitTriggerV1Params {
	/**
	 * The events that can trigger the webhook and whether they are enabled
	 */
	event:
		| 'formSubscribe'
		| 'linkClick'
		| 'productPurchase'
		| 'purchaseCreate'
		| 'courseComplete'
		| 'courseSubscribe'
		| 'subscriberActivate'
		| 'subscriberUnsubscribe'
		| 'tagAdd'
		| 'tagRemove'
		| Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	formId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	courseId: string | Expression<string>;
	/**
	 * The URL of the initiating link
	 */
	link: string | Expression<string>;
	productId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	tagId: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface ConvertKitTriggerV1Credentials {
	convertKitApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ConvertKitTriggerNode = {
	type: 'n8n-nodes-base.convertKitTrigger';
	version: 1;
	config: NodeConfig<ConvertKitTriggerV1Params>;
	credentials?: ConvertKitTriggerV1Credentials;
	isTrigger: true;
};
