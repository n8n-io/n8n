/**
 * Vonage Node Types
 *
 * Consume Vonage API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/vonage/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type VonageV1SmsSendConfig = {
	resource: 'sms';
	operation: 'send';
	/**
	 * The name or number the message should be sent from
	 * @displayOptions.show { resource: ["sms"], operation: ["send"] }
	 */
	from?: string | Expression<string>;
	/**
	 * The number that the message should be sent to. Numbers are specified in E.164 format.
	 * @displayOptions.show { resource: ["sms"], operation: ["send"] }
	 */
	to?: string | Expression<string>;
	/**
	 * The body of the message being sent
	 * @displayOptions.show { resource: ["sms"], operation: ["send"] }
	 */
	message?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type VonageV1Params = VonageV1SmsSendConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface VonageV1Credentials {
	vonageApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type VonageV1Node = {
	type: 'n8n-nodes-base.vonage';
	version: 1;
	config: NodeConfig<VonageV1Params>;
	credentials?: VonageV1Credentials;
};

export type VonageNode = VonageV1Node;
