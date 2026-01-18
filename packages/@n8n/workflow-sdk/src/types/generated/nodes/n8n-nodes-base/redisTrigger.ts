/**
 * Redis Trigger Node Types
 *
 * Subscribe to redis channel
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/redistrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RedisTriggerV1Params {
	/**
	 * Channels to subscribe to, multiple channels be defined with comma. Wildcard character(*) is supported.
	 */
	channels: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface RedisTriggerV1Credentials {
	redis: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type RedisTriggerNode = {
	type: 'n8n-nodes-base.redisTrigger';
	version: 1;
	config: NodeConfig<RedisTriggerV1Params>;
	credentials?: RedisTriggerV1Credentials;
	isTrigger: true;
};
