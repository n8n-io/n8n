export type RedisClientType = N8nRedisClientType | BullRedisClientType;

/**
 * Redis client used by n8n.
 *
 * - `subscriber(n8n)` to listen for messages from scaling mode pubsub channels
 * - `publisher(n8n)` to send messages into scaling mode pubsub channels
 * - `cache(n8n)` for caching operations (variables, resource ownership, etc.)
 */
type N8nRedisClientType = 'subscriber(n8n)' | 'publisher(n8n)' | 'cache(n8n)';

/**
 * Redis client used internally by Bull. Suffixed with `(bull)` at `ScalingService.setupQueue`.
 *
 * - `subscriber(bull)` for event listening
 * - `client(bull)` for general queue operations
 * - `bclient(bull)` for blocking operations when processing jobs
 */
type BullRedisClientType = 'subscriber(bull)' | 'client(bull)' | 'bclient(bull)';
