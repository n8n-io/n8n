/**
 * Philips Hue Node Types
 *
 * Consume Philips Hue API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/philipshue/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Delete a light */
export type PhilipsHueV1LightDeleteConfig = {
	resource: 'light';
	operation: 'delete';
	lightId: string | Expression<string>;
};

/** Retrieve a light */
export type PhilipsHueV1LightGetConfig = {
	resource: 'light';
	operation: 'get';
	lightId: string | Expression<string>;
};

/** Retrieve many lights */
export type PhilipsHueV1LightGetAllConfig = {
	resource: 'light';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"], resource: ["light"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], resource: ["light"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Update a light */
export type PhilipsHueV1LightUpdateConfig = {
	resource: 'light';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["update"], resource: ["light"] }
	 */
	lightId: string | Expression<string>;
	/**
	 * On/Off state of the light
	 * @displayOptions.show { operation: ["update"], resource: ["light"] }
	 * @default true
	 */
	on: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

export type PhilipsHueV1Params =
	| PhilipsHueV1LightDeleteConfig
	| PhilipsHueV1LightGetConfig
	| PhilipsHueV1LightGetAllConfig
	| PhilipsHueV1LightUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface PhilipsHueV1Credentials {
	philipsHueOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type PhilipsHueV1Node = {
	type: 'n8n-nodes-base.philipsHue';
	version: 1;
	config: NodeConfig<PhilipsHueV1Params>;
	credentials?: PhilipsHueV1Credentials;
};

export type PhilipsHueNode = PhilipsHueV1Node;
