/**
 * Redis Node - Version 1
 * Get, send and update data in Redis
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RedisV1Params {
	operation?: 'delete' | 'get' | 'incr' | 'info' | 'keys' | 'llen' | 'pop' | 'publish' | 'push' | 'set' | Expression<string>;
/**
 * Name of the key to delete from Redis
 * @displayOptions.show { operation: ["delete"] }
 */
		key: string | Expression<string>;
/**
 * Name of the property to write received data to. Supports dot-notation. Example: "data.person[0].name".
 * @displayOptions.show { operation: ["get"] }
 * @default propertyName
 */
		propertyName: string | Expression<string>;
/**
 * The type of the key to get
 * @displayOptions.show { operation: ["get"] }
 * @default automatic
 */
		keyType?: 'automatic' | 'hash' | 'list' | 'sets' | 'string' | Expression<string>;
	options?: Record<string, unknown>;
/**
 * Whether to set a timeout on key
 * @displayOptions.show { operation: ["incr"] }
 * @default false
 */
		expire?: boolean | Expression<boolean>;
/**
 * Number of seconds before key expiration
 * @displayOptions.show { operation: ["incr"], expire: [true] }
 * @default 60
 */
		ttl?: number | Expression<number>;
/**
 * The key pattern for the keys to return
 * @displayOptions.show { operation: ["keys"] }
 */
		keyPattern: string | Expression<string>;
/**
 * Whether to get the value of matching keys
 * @displayOptions.show { operation: ["keys"] }
 * @default true
 */
		getValues?: boolean | Expression<boolean>;
/**
 * Name of the list in Redis
 * @displayOptions.show { operation: ["llen"] }
 */
		list: string | Expression<string>;
/**
 * The value to write in Redis
 * @displayOptions.show { operation: ["set"] }
 */
		value?: string | Expression<string>;
/**
 * Whether the value is JSON or key value pairs
 * @displayOptions.show { keyType: ["hash"] }
 * @default true
 */
		valueIsJSON?: boolean | Expression<boolean>;
/**
 * Channel name
 * @displayOptions.show { operation: ["publish"] }
 */
		channel: string | Expression<string>;
/**
 * Data to publish
 * @displayOptions.show { operation: ["publish"] }
 */
		messageData: string | Expression<string>;
/**
 * Whether to push or pop data from the end of the list
 * @displayOptions.show { operation: ["push", "pop"] }
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

interface RedisV1NodeBase {
	type: 'n8n-nodes-base.redis';
	version: 1;
	credentials?: RedisV1Credentials;
}

export type RedisV1ParamsNode = RedisV1NodeBase & {
	config: NodeConfig<RedisV1Params>;
};

export type RedisV1Node = RedisV1ParamsNode;