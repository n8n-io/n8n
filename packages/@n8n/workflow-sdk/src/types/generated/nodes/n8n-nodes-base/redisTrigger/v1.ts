/**
 * Redis Trigger Node - Version 1
 * Subscribe to redis channel
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
// Node Types
// ===========================================================================

interface RedisTriggerV1NodeBase {
	type: 'n8n-nodes-base.redisTrigger';
	version: 1;
	credentials?: RedisTriggerV1Credentials;
	isTrigger: true;
}

export type RedisTriggerV1ParamsNode = RedisTriggerV1NodeBase & {
	config: NodeConfig<RedisTriggerV1Params>;
};

export type RedisTriggerV1Node = RedisTriggerV1ParamsNode;