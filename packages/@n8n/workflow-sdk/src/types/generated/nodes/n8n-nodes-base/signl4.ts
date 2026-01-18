/**
 * SIGNL4 Node Types
 *
 * Consume SIGNL4 API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/signl4/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Send an alert */
export type Signl4V1AlertSendConfig = {
	resource: 'alert';
	operation: 'send';
	/**
	 * A more detailed description for the alert
	 */
	message?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Resolve an alert */
export type Signl4V1AlertResolveConfig = {
	resource: 'alert';
	operation: 'resolve';
	/**
	 * If the event originates from a record in a 3rd party system, use this parameter to pass the unique ID of that record. That ID will be communicated in outbound webhook notifications from SIGNL4, which is great for correlation/synchronization of that record with the alert. If you resolve / close an alert you must use the same External ID as in the original alert.
	 */
	externalId?: string | Expression<string>;
};

export type Signl4V1Params = Signl4V1AlertSendConfig | Signl4V1AlertResolveConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface Signl4V1Credentials {
	signl4Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type Signl4Node = {
	type: 'n8n-nodes-base.signl4';
	version: 1;
	config: NodeConfig<Signl4V1Params>;
	credentials?: Signl4V1Credentials;
};
