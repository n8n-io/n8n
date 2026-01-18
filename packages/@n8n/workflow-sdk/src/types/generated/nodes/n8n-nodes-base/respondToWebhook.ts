/**
 * Respond to Webhook Node Types
 *
 * Returns data for Webhook
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/respondtowebhook/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RespondToWebhookV15Params {
	/**
	 * Whether to provide an additional output branch with the response sent to the webhook
	 * @default false
	 */
	enableResponseOutput?: boolean | Expression<boolean>;
	/**
	 * The data that should be returned
	 * @default firstIncomingItem
	 */
	respondWith?:
		| 'allIncomingItems'
		| 'binary'
		| 'firstIncomingItem'
		| 'json'
		| 'jwt'
		| 'noData'
		| 'redirect'
		| 'text'
		| Expression<string>;
	/**
	 * The URL to redirect to
	 */
	redirectURL: string | Expression<string>;
	/**
 * The HTTP response JSON data
 * @default {
  "myField": "value"
}
 */
	responseBody?: IDataObject | string | Expression<string>;
	/**
 * The payload to include in the JWT token
 * @default {
  "myField": "value"
}
 */
	payload?: IDataObject | string | Expression<string>;
	responseDataSource?: 'automatically' | 'set' | Expression<string>;
	/**
	 * The name of the node input field with the binary data
	 * @default data
	 */
	inputFieldName: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface RespondToWebhookV15Credentials {
	jwtAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type RespondToWebhookV15Node = {
	type: 'n8n-nodes-base.respondToWebhook';
	version: 1 | 1.1 | 1.2 | 1.3 | 1.4 | 1.5;
	config: NodeConfig<RespondToWebhookV15Params>;
	credentials?: RespondToWebhookV15Credentials;
};

export type RespondToWebhookNode = RespondToWebhookV15Node;
