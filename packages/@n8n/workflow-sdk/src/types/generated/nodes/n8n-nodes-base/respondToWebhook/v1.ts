/**
 * Respond to Webhook Node - Version 1
 * Returns data for Webhook
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RespondToWebhookV1Config {
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

export interface RespondToWebhookV1Credentials {
	jwtAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface RespondToWebhookV1NodeBase {
	type: 'n8n-nodes-base.respondToWebhook';
	version: 1;
	credentials?: RespondToWebhookV1Credentials;
}

export type RespondToWebhookV1Node = RespondToWebhookV1NodeBase & {
	config: NodeConfig<RespondToWebhookV1Config>;
};

export type RespondToWebhookV1Node = RespondToWebhookV1Node;