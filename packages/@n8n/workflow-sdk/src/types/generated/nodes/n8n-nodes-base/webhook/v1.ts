/**
 * Webhook Node - Version 1
 * Starts the workflow when a webhook is called
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface WebhookV1Params {
/**
 * Whether to allow the webhook to listen for multiple HTTP methods
 * @default false
 */
		multipleMethods?: boolean | Expression<boolean>;
/**
 * The HTTP method to listen to
 * @displayOptions.show { multipleMethods: [false] }
 * @default GET
 */
		httpMethod?: 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | Expression<string>;
/**
 * The path to listen to, dynamic values could be specified by using ':', e.g. 'your-path/:dynamic-value'. If dynamic values are set 'webhookId' would be prepended to path.
 */
		path?: string | Expression<string>;
/**
 * The way to authenticate
 * @default none
 */
		authentication?: 'basicAuth' | 'headerAuth' | 'jwtAuth' | 'none' | Expression<string>;
/**
 * When and how to respond to the webhook
 * @default onReceived
 */
		responseMode?: 'onReceived' | 'lastNode' | 'responseNode' | Expression<string>;
/**
 * The HTTP Response code to return
 * @displayOptions.hide { responseMode: ["responseNode"] }
 * @default 200
 */
		responseCode?: number | Expression<number>;
/**
 * What data should be returned. If it should return all items as an array or only the first item as object.
 * @displayOptions.show { responseMode: ["lastNode"] }
 * @default firstEntryJson
 */
		responseData?: 'allEntries' | 'firstEntryJson' | 'firstEntryBinary' | 'noData' | Expression<string>;
/**
 * Name of the binary property to return
 * @displayOptions.show { responseData: ["firstEntryBinary"] }
 * @default data
 */
		responseBinaryPropertyName: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface WebhookV1Credentials {
	httpBasicAuth: CredentialReference;
	httpHeaderAuth: CredentialReference;
	jwtAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface WebhookV1NodeBase {
	type: 'n8n-nodes-base.webhook';
	version: 1;
	credentials?: WebhookV1Credentials;
	isTrigger: true;
}

export type WebhookV1ParamsNode = WebhookV1NodeBase & {
	config: NodeConfig<WebhookV1Params>;
};

export type WebhookV1Node = WebhookV1ParamsNode;