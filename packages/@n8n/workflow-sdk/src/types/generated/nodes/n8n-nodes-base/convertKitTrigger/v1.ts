/**
 * ConvertKit Trigger Node - Version 1
 * Handle ConvertKit events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ConvertKitTriggerV1Config {
/**
 * The events that can trigger the webhook and whether they are enabled
 */
		event: 'formSubscribe' | 'linkClick' | 'productPurchase' | 'purchaseCreate' | 'courseComplete' | 'courseSubscribe' | 'subscriberActivate' | 'subscriberUnsubscribe' | 'tagAdd' | 'tagRemove' | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { event: ["formSubscribe"] }
 */
		formId: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { event: ["courseSubscribe", "courseComplete"] }
 */
		courseId: string | Expression<string>;
/**
 * The URL of the initiating link
 * @displayOptions.show { event: ["linkClick"] }
 */
		link: string | Expression<string>;
	productId: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { event: ["tagAdd", "tagRemove"] }
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
// Node Types
// ===========================================================================

interface ConvertKitTriggerV1NodeBase {
	type: 'n8n-nodes-base.convertKitTrigger';
	version: 1;
	credentials?: ConvertKitTriggerV1Credentials;
	isTrigger: true;
}

export type ConvertKitTriggerV1Node = ConvertKitTriggerV1NodeBase & {
	config: NodeConfig<ConvertKitTriggerV1Config>;
};

export type ConvertKitTriggerV1Node = ConvertKitTriggerV1Node;