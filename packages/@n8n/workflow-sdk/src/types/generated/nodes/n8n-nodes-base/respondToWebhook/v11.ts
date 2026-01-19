/**
 * Respond to Webhook Node - Version 1.1
 * Returns data for Webhook
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RespondToWebhookV11Params {
/**
 * The data that should be returned
 * @default firstIncomingItem
 */
		respondWith?: 'allIncomingItems' | 'binary' | 'firstIncomingItem' | 'json' | 'jwt' | 'noData' | 'redirect' | 'text' | Expression<string>;
/**
 * The URL to redirect to
 * @displayOptions.show { respondWith: ["redirect"] }
 */
		redirectURL: string | Expression<string>;
/**
 * The HTTP response JSON data
 * @displayOptions.show { respondWith: ["json"] }
 * @default {
  "myField": "value"
}
 */
		responseBody?: IDataObject | string | Expression<string>;
/**
 * The payload to include in the JWT token
 * @displayOptions.show { respondWith: ["jwt"] }
 * @default {
  "myField": "value"
}
 */
		payload?: IDataObject | string | Expression<string>;
	responseDataSource?: 'automatically' | 'set' | Expression<string>;
/**
 * The name of the node input field with the binary data
 * @displayOptions.show { respondWith: ["binary"], responseDataSource: ["set"] }
 * @default data
 */
		inputFieldName: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface RespondToWebhookV11Credentials {
	jwtAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface RespondToWebhookV11NodeBase {
	type: 'n8n-nodes-base.respondToWebhook';
	version: 1.1;
	credentials?: RespondToWebhookV11Credentials;
}

export type RespondToWebhookV11ParamsNode = RespondToWebhookV11NodeBase & {
	config: NodeConfig<RespondToWebhookV11Params>;
};

export type RespondToWebhookV11Node = RespondToWebhookV11ParamsNode;