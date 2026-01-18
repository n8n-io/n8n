/**
 * Redis Node Types
 *
 * Get, send and update data in Redis
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/redis/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RedisV1Params {
	operation?:
		| 'delete'
		| 'get'
		| 'incr'
		| 'info'
		| 'keys'
		| 'llen'
		| 'pop'
		| 'publish'
		| 'push'
		| 'set'
		| Expression<string>;
	/**
	 * Name of the key to delete from Redis
	 */
	key: string | Expression<string>;
	/**
	 * Name of the property to write received data to. Supports dot-notation. Example: "data.person[0].name".
	 * @default propertyName
	 */
	propertyName: string | Expression<string>;
	/**
	 * The type of the key to get
	 * @default automatic
	 */
	keyType?: 'automatic' | 'hash' | 'list' | 'sets' | 'string' | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * Whether to set a timeout on key
	 * @default false
	 */
	expire?: boolean | Expression<boolean>;
	/**
	 * Number of seconds before key expiration
	 * @default 60
	 */
	ttl?: number | Expression<number>;
	/**
	 * The key pattern for the keys to return
	 */
	keyPattern: string | Expression<string>;
	/**
	 * Whether to get the value of matching keys
	 * @default true
	 */
	getValues?: boolean | Expression<boolean>;
	/**
	 * Name of the list in Redis
	 */
	list: string | Expression<string>;
	/**
	 * The value to write in Redis
	 */
	value?: string | Expression<string>;
	/**
	 * Whether the value is JSON or key value pairs
	 * @default true
	 */
	valueIsJSON?: boolean | Expression<boolean>;
	/**
	 * Channel name
	 */
	channel: string | Expression<string>;
	/**
	 * Data to publish
	 */
	messageData: string | Expression<string>;
	/**
	 * Whether to push or pop data from the end of the list
	 * @default false
	 */
	tail?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface RedisV1Credentials {
	redis: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type RedisV1Node = {
	type: 'n8n-nodes-base.redis';
	version: 1;
	config: NodeConfig<RedisV1Params>;
	credentials?: RedisV1Credentials;
};

export type RedisNode = RedisV1Node;
