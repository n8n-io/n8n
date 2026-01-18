/**
 * Respond to Webhook Node - Version 1.2
 * Returns data for Webhook
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RespondToWebhookV12Params {
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

export interface RespondToWebhookV12Credentials {
	jwtAuth: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type RespondToWebhookV12Node = {
	type: 'n8n-nodes-base.respondToWebhook';
	version: 1.2;
	config: NodeConfig<RespondToWebhookV12Params>;
	credentials?: RespondToWebhookV12Credentials;
};