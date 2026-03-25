/**
 * This module provides a redis client allowing users to interact with redis,
 * directly from their k6 scripts.
 *
 * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/
 */

/**
 * `Client` is a Redis client for interacting with a Redis server or cluster.
 *
 * This client provides a promise-based API, enabling asynchronous operations with the Redis server.
 * It supports a wide range of configurations, including single-node connections, cluster mode, and connections through Redis Sentinel.
 *
 * The client can be configured either by passing a `RedisClientOptions` object for fine-grained configuration,
 * or by using a `RedisConnectionURL` string for simpler setups.
 *
 * For more information on the k6 Redis module, visit:
 * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client
 */
export class Client {
    protected __brand: never;

    /**
     * Creates a new instance of the Redis client.
     *
     * The client can be configured in two ways:
     * 1. By providing an object of `RedisClientOptions`, allowing detailed configuration including
     *    authentication, connection settings, client behaviors, and cluster or sentinel setups.
     * 2. By providing a `RedisConnectionURL` string, suitable for straightforward configurations.
     *    The URL should follow the format: redis[s]://[[username][:password]@][host][:port][/db-number]
     *
     * Example usage:
     * ```
     * // Using RedisClientOptions
     * const client = new Client({
     *   socket: {
     *     host: 'localhost',
     *     port: 6379
     *   },
     *   password: 'yourpassword'
     * });
     *
     * // Using RedisConnectionURL
     * const client = new Client('redis://user:password@localhost:6379/0');
     * ```
     *
     * @param options - The configuration options for the client, either as a `RedisClientOptions` object or a `RedisConnectionURL` string.
     * @returns The instantiated Redis client.
     */
    constructor(options: RedisClientOptions | RedisConnectionURL);

    /**
     * Sets the value of a key, with a time to live (ttl) value equal to
     * the provided expiration.
     *
     * If the key already exists, it is overwritten.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-set
     *
     * @param key - key to set
     * @param value - value to set
     * @param expiration - time to live in seconds. `0` means no expiration.
     * @returns a promise that resolves to "OK" if the operation succeeded.
     */
    set(key: string, value: string | number | boolean, expiration: number): Promise<string>;

    /**
     * Gets the value of a key.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-get
     *
     * @param key - key to get
     * @returns a promise that resolves to the value of the key.
     */
    get(key: string): Promise<string>;

    /**
     * Atomically sets the value of a key and returns the value
     * previously stored at that key.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-getset
     *
     * @param key - key to get and set
     * @param value - value to set
     * @returns a promise that resolves to the old value of the key.
     */
    getSet(key: string, value: string | number | boolean): Promise<string>;

    /**
     * Removes the specified keys.
     *
     * A key is ignored if it does not exist.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-del
     *
     * @param keys - keys to delete
     * @returns a promise that resolves to the number of keys that were removed.
     */
    del(keys: string[]): Promise<number>;

    /**
     * Get the value of a key and delete it.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-getdel
     *
     * @param key - the key to get and delete
     * @returns a promise that resolves to the value of the key that was deleted.
     */
    getDel(key: string): Promise<string>;

    /**
     * Returns the number of the provided keys arguments that exist.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-exists
     *
     * @param keys - the keys to check the existence of
     * @returns a promise that resolves to the number of keys that exist.
     */
    exists(keys: string[]): Promise<number>;

    /**
     * Increments the numerical value stored at key by one.
     *
     * If the key does not exist, it is set to 0 before performing the operation.
     * If the key exists but cannot be treated as a number, the returned promise will be rejected.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-incr
     *
     * @param key - key to increment the value of
     * @returns a promise that resolves to the value of the key after the increment.
     */
    incr(key: string): Promise<number>;

    /**
     * Increments the numerical value stored at key by the provided increment.
     *
     * If the key does not exist, it is set to 0 before performing the operation.
     * If the key exists but cannot be treated as a number, the returned promise will be rejected.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-incrby
     *
     * @param key - key to increment the value of
     * @param increment - amount to increment the value of the key by
     * @returns a promise that resolves to the value of the key after the increment.
     */
    incrBy(key: string, increment: number): Promise<number>;

    /**
     * Decrements the numerical value stored at key by one.
     *
     * If the key does not exist, it is set to 0 before performing the operation.
     * If the key exists but cannot be treated as a number, the returned promise will be rejected.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-decr
     *
     * @param key - key to decrement the value of
     * @returns a promise that resolves to the value of the key after the decrement.
     */
    decr(key: string): Promise<number>;

    /**
     * Decrements the numerical value stored at key by the provided decrement.
     *
     * If the key does not exist, it is set to 0 before performing the operation.
     * If the key exists but cannot be treated as a number, the returned promise will be rejected.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-decrby
     *
     * @param key - key to decrement the value of
     * @param decrement - amount to decrement the value of the key by
     * @returns a promise that resolves to the value of the key after the decrement.
     */
    decrBy(key: string, decrement: number): Promise<number>;

    /**
     * Returns a random key from the keyspace.
     *
     * If the database is empty, the returned promise will be rejected.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-randomkey
     *
     * @returns a promise that resolves to a random key.
     */
    randomKey(): Promise<string>;

    /**
     * Returns the values of all the specified keys.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-mget
     *
     * @param keys - the keys to get the values of
     * @returns a promise that resolves to an array of the values of the keys.
     */
    mget(keys: string[]): Promise<any[]>;

    /**
     * Sets a timeout on a key. After the timeout has expired, the key will automatically be deleted.
     *
     * Calling expire with a non-positive timeout value will result in the being deleted rather
     * than expired.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-expire
     *
     * @param key - key to set the time to live of
     * @param seconds - value to set the time to live of the key to (in seconds)
     * @returns a promise that resolves to true if the operation succeeded, false otherwise.
     */
    expire(key: string, seconds: number): Promise<boolean>;

    /**
     * Returns the remaining time to live of a key that has a timeout.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-ttl
     *
     * @param key - the key to get the time to live of
     * @returns a promise that resolves to the time to live of the key, in seconds.
     */
    ttl(key: string): Promise<number>;

    /**
     * Removes the existing timeout on a key.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-persist
     *
     * @param key - the key to remove the timeout of.
     * @returns a promise that resolves to true if the operation succeeded, false otherwise.
     */
    persist(key: string): Promise<boolean>;

    /**
     * Prepends values to a list, creating the list if it does not already exist.
     *
     * If the key exists but does not hold a list, the returned promise will be rejected.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-lpush
     *
     * @param key - key holding the list to prepend to
     * @param values - values to prepend to the list
     * @returns a promise that resolves to the number of elements in the list after the prepend operation.
     */
    lpush(key: string, ...values: Array<string | number | boolean>): Promise<number>;

    /**
     * Appends values to a list, creating the list if it does not already exist.
     *
     * If the key exists but does not hold a list, the returned promise will be rejected.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-rpush
     *
     * @param key - key holding the list to append to
     * @param values - values to append to the list
     * @returns a promise that resolves to the number of elements in the list after the append operation.
     */
    rpush(key: string, ...values: Array<string | number | boolean>): Promise<number>;

    /**
     * Removes and returns the value at the head of the list stored at key.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-lpop
     *
     * @param key - key holding the list to pop the head of
     * @returns a promise that resolves to the value that was popped.
     */
    lpop(key: string): Promise<string>;

    /**
     * Removes and returns the value at the tail of the list stored at key.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-rpop
     *
     * @param key - key holding the list to pop the tail of
     * @returns a promise that resolves to the value that was popped.
     */
    rpop(key: string): Promise<string>;

    /**
     * Returns the elements stored in the list from start to end.
     *
     * The offsets are zero-based. These offsets can be negative numbers indicating
     * offsets starting at the end of the list.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-lrange
     *
     * @param key - key holding the list to get the range of
     * @param start - index of the first element to return
     * @param stop - index of the last element to return
     * @returns a promise that resolves to an array of the values in the specified range.
     */
    lrange(key: string, start: number, stop: number): Promise<string[]>;

    /**
     * Returns the element at the specified in the list stored at key.
     *
     * The offsets are zero-based. These offsets can be negative numbers indicating
     * offsets starting at the end of the list.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-lindex
     *
     * @param key - key holding the list to get the element of
     * @param index - index of the element to get
     * @returns a promise that resolves to the value of the element at the specified index.
     */
    lindex(key: string, index: number): Promise<string>;

    /**
     * Sets the value of an element in the list stored at key to new value.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-lset
     *
     * @param key - key holding the list to set the element of
     * @param index - index of the element to set
     * @param element - value to set the element to
     * @returns a promise that resolves to the 'OK' string if the operation succeeded
     */
    lset(key: string, index: number, element: string): Promise<string>;

    /**
     * Removes the first `count` occurrences of `value` from the list stored at `key`.
     *
     *  If the `count` is positive, elements are removed the from head of the list (from left to right)
     * If the `count` is 0, all occurrences of `value` are removed.
     * If the `count` is negative, elements are removed from the tail of the list (from right to left).
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-lrem
     *
     * @param key - key holding the list to remove the element of
     * @param count - the number of elements matching the value to remove
     * @param value - the value to remove
     * @returns a promise that resolves to the number of elements removed.
     */
    lrem(key: string, count: number, value: string): Promise<number>;

    /**
     * Returns the length of the list stored at the key.
     *
     * If the key does not exist, it is interpreted as an empty list and 0 is returned.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-llen
     *
     * @param key - key holding the list to get the length  of
     * @returns a promise that resolves to the length of the list.
     */
    llen(key: string): Promise<number>;

    /**
     * Sets the value of a hash field to the specified value.
     *
     * If the key does not exist, a new key holding a hash is created.
     * If the field already exists, it is overwritten.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-hset
     *
     * @param key - key holding the hash to set the field's value of
     * @param field - field to set the value of
     * @param value - value to set the field to
     * @returns a promise that resolves to the the number of fields that were changed.
     */
    hset(key: string, field: string, value: string | number | boolean): Promise<number>;

    /**
     * Sets the value of a hash field to the specified value, if and only if the field does not yet exist.
     *
     * If the key does not exist, a new key holding a hash is created.
     * If the field already exists, the returned promise will be rejected.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-hsetnx
     *
     * @param key - key holding the hash to set the field's value of
     * @param field - field to set the value of
     * @param value - value to set the field to
     * @returns a promise that resolves to true if the hash field was set, false otherwise.
     */
    hsetnx(key: string, field: string, value: string): Promise<boolean>;

    /**
     * Returns the value of the specified hash field.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-hget
     *
     * @param key - key holding the hash to get the field's value of
     * @param field - field to get the value of
     * @returns a promise that resolves to the value of the hash field.
     */
    hget(key: string, field: string): Promise<string>;

    /**
     * Deletes the specified fields from the hash stored at key.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-hdel
     *
     * @param key - key holding the hash to delete the fields of
     * @param fields - fields to delete from the hash
     * @returns a promise that resolves to the number of fields that were deleted.
     */
    hdel(key: string, fields: string[]): Promise<number>;

    /**
     * Returns all fields and values of the hash stored at key.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-hgetall
     *
     * @param key - the key holding the hash to get the fields of
     * @returns a promise that resolves to an object of field/value pairs.
     */
    hgetall(key: string): Promise<{ [key: string]: string }>;

    /**
     * Returns all fields of the hash stored at key.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-hkeys
     *
     * @param key - the key holding the hash to get the fields of
     * @returns a promise that resolves to an array of field names.
     */
    hkeys(key: string): Promise<string[]>;

    /**
     * Returns all values of the hash stored at key.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-hvals
     *
     * @param key - the key holding the hash to get the fields' values of
     * @returns a promise that resolves to an array of field values.
     */
    hvals(key: string): Promise<string[]>;

    /**
     * Return the number of fields contained in the hash stored at key.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-hlen
     *
     * @param key - the key holding the hash to get the number of fields of
     * @returns a promise that resolves to the number of fields in the hash.
     */
    hlen(key: string): Promise<number>;

    /**
     * Increments the numberical value stored at the hash field by the specified amount.
     *
     * If the key does not exist, a new key holding a hash is created.
     * If the field does not exist, it is set to 0 before the operation is performed.
     * If the field does not hold a nummerical value, the returned promise will be rejected.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-hincrby
     *
     * @param key - the key holding the hash to get the number of fields of
     * @param field - the hash's field to increment the value of
     * @param increment - the amount to increment the value by
     * @returns a promise that resolves to the value of the field after the increment.
     */
    hincrby(key: string, field: string, increment: number): Promise<number>;

    /**
     * Adds the specified elements to the set stored at key.
     *
     * Specified elements that are already a member of the set are ignored.
     * If the key does not exist, a new set is created before adding the specified elements.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-sadd
     *
     * @param key - the key holding the set to add a member to
     * @param members - the members to add to the set
     * @returns a promise that resolves to the number of members that were added to the set; excluding those that were already present.
     */
    sadd(key: string, ...members: Array<string | number | boolean>): Promise<number>;

    /**
     * Removes the specified members from the set stored at key.
     *
     * Specified members that are not a member of this set are ignored.
     * If key does not exist, it is treated as an empty set and this command returns 0.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-srem
     *
     * @param key - the key holding the set to remove a member from
     * @param members - the members to remove from the set
     * @returns a promise that resolves to the number of members that were removed from the set.
     */
    srem(key: string, ...members: Array<string | number | boolean>): Promise<number>;

    /**
     * Returns whether or not the specified member is a member of the set stored at key.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-sismember
     *
     * @param key - the key holding the set to check the belonging of
     * @param member - the member to check the belonging of
     * @returns a promise that resolves to true if the member is a member of the set, false otherwise.
     */
    sismember(key: string, member: string | number | boolean): Promise<boolean>;

    /**
     * Returns the members of the set stored at key.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-smembers
     *
     * @param key - the key holding the set to get the members of
     * @returns a promise that resolves to an array of members in the set.
     */
    smembers(key: string): Promise<string[]>;

    /**
     * Returns a random member of the set value stored at key.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-srandmember
     *
     * @param key - the key holding the set to get the random member of
     * @returns a promise that resolves to a random member of the set.
     */
    srandmember(key: string): Promise<string>;

    /**
     * Pops a random member from the set stored at key.
     *
     * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/redis/client/client-spop
     *
     * @param key - the key holding the set to pop the random member of
     * @returns a promise that resolves to the popped member.
     */
    spop(key: string): Promise<string>;
}

/**
 * Represents a Redis connection URL.
 * The URL follows the format: redis[s]://[[username][:password]@][host][:port][/db-number]
 *
 * - `RedisProtocol` indicates the protocol used ('redis' for standard connections, 'rediss' for secure TLS connections).
 * - `RedisUserInfo` optionally includes the username and password for authentication.
 * - The `host` is the IP address or hostname of the Redis server.
 * - `RedisPort` is the port on which the Redis server is listening (optional, defaults to 6379 if not specified).
 * - `RedisDbNumber` specifies a particular database number to connect to (optional).
 */
export type RedisConnectionURL = `${RedisProtocol}://${RedisUserInfo}${string}${RedisPort}${RedisDbNumber}`;

/**
 * Represents the protocol part of a Redis URL.
 * - `redis`: Standard, non-encrypted connections.
 * - `rediss`: Secure connections using TLS.
 */
export type RedisProtocol = "redis" | "rediss";

/**
 * Represents the user authentication information part of a Redis URL.
 * Formats:
 * - `username:password@`: Both username and password are provided for authentication.
 * - `username@`: Only username is provided, no password.
 * - `"": No authentication information is included.
 */
export type RedisUserInfo = `${string}:${string}@` | `${string}@` | "";

export type RedisHost = string;

/**
 * Represents the port part of a Redis URL.
 * - `:number`: The port number on which the Redis server is listening.
 * - `"": No port is specified, implying the default port (usually 6379).
 */
export type RedisPort = `:${number}` | "";

/**
 * Represents the database number part of a Redis URL.
 * - `/${number}`: Specifies the database number to connect to.
 * - `"": No database number is specified, implying the default database (usually 0).
 */
export type RedisDbNumber = `/${number}` | "";

/**
 * Represents the configuration options for a Redis client.
 *
 * These options define how the client connects to and interacts with a Redis server or cluster,
 * including authentication, connection settings, and specific Redis features.
 */
export interface RedisClientOptions {
    /**
     * Socket connection options for the Redis client.
     *
     * This includes the host, port, and other socket-level settings such as timeouts and TLS configuration.
     */
    socket: SocketOptions;

    /**
     * Optional username for client authentication.
     *
     * This is used when the Redis server is configured with ACLs (Access Control Lists),
     * requiring a username for authentication in addition to a password.
     */
    username?: string;

    /**
     * Optional password for client authentication.
     *
     * If the Redis server is secured with a password, this must be provided to establish a connection.
     */
    password?: string;

    /**
     * Optional name to assign to the client connection.
     *
     * This can be used for identifying and tracking connections on the Redis server.
     * It's useful for debugging and monitoring purposes.
     */
    clientName?: string;

    /**
     * The ID of the database to be selected after connecting to the Redis server.
     *
     * Redis supports multiple databases (numbered from 0), allowing separate datasets on the same server instance.
     * This option is typically used when connecting to a single-node setup.
     */
    database?: number;

    /**
     * The name of the master instance to connect to when using Redis Sentinel.
     *
     * Sentinel manages failover in a Redis deployment, and specifying a master name allows the client to connect to the current master.
     * This option is required when connecting through Redis Sentinel.
     */
    masterName?: string;

    /**
     * Optional username for client authentication with Redis Sentinel.
     *
     * If the Sentinel servers are secured with ACLs, this username is used for authentication.
     */
    sentinelUsername?: string;

    /**
     * Optional password for client authentication with Redis Sentinel.
     *
     * If the Sentinel servers are secured with a password, it must be provided to connect successfully.
     */
    sentinelPassword?: string;

    /**
     * Optional configuration for connecting to a Redis Cluster.
     *
     * If the client is connecting to a Redis Cluster, this option provides cluster-specific settings such as node addresses and routing options.
     */
    cluster?: ClusterOptions;
}

/**
 * Represents the configuration options for a socket connection to a Redis server.
 *
 * These options allow fine-tuning of the connection properties, timeouts, and TLS settings.
 */
export interface SocketOptions {
    /**
     * The IP address or hostname of the Redis server.
     * This should be a valid, resolvable address or hostname used to establish the connection.
     */
    host: string;

    /**
     * The port number on which the Redis server is listening.
     *
     * If omitted, a default port (typically 6379 for Redis) will be used.
     */
    port?: number;

    /**
     * Optional configuration for TLS (Transport Layer Security).
     *
     * This is used to establish a secure, encrypted connection to the Redis server.
     * If provided, the connection will use TLS; otherwise, it will be a regular, non-encrypted connection.
     */
    tls?: TLSOptions;

    /**
     * The maximum amount of time, in milliseconds, to wait for a connection attempt to the Redis server to succeed.
     *
     * If the connection is not established within this time frame, the attempt will be aborted.
     * This helps in avoiding long waits if the server is not reachable.
     */
    dialTimeout?: number;

    /**
     * The maximum amount of time, in milliseconds, the client will wait for a read operation to complete.
     *
     * A value of `-1` indicates no timeout, meaning the client will wait indefinitely.
     * Setting a read timeout can prevent indefinitely blocking operations if the server becomes unresponsive.
     */
    readTimeout?: number;

    /**
     * The maximum amount of time, in milliseconds, the client will wait for a write operation to complete.
     *
     * A value of `-1` indicates no timeout, allowing the client to wait indefinitely.
     * Similar to readTimeout, this can prevent blocking in case of server issues.
     */
    writeTimeout?: number;

    /**
     * The maximum number of socket connections that can be kept open in the pool.
     * A larger pool size can handle more concurrent connections, but also uses more resources.
     */
    poolSize?: number;

    /**
     * The minimum number of idle connections that the pool maintains for faster access.
     *
     * Keeping some connections idle can improve performance by avoiding the need to establish new connections.
     */
    minIdleConns?: number;

    /**
     * The maximum amount of time, in milliseconds, a connection can stay idle in the pool before being closed.
     *
     * This can help in cycling connections and preventing stale connections.
     */
    maxConnAge?: number;

    /**
     * The maximum amount of time, in milliseconds, to wait for a connection from the pool.
     *
     * If no connections are available within this time frame, the request for a connection will fail.
     * This prevents indefinite blocking when all connections are in use.
     */
    poolTimeout?: number;

    /**
     * The maximum amount of time, in milliseconds, a connection can be idle in the pool before being considered for closure.
     *
     * This helps in keeping the pool fresh and closing unused connections.
     */
    idleTimeout?: number;

    /**
     * The frequency, in milliseconds, at which the client checks for idle connections in the pool.
     *
     * A value of `-1` disables these checks. Regularly checking for idle connections helps in maintaining a healthy connection pool.
     */
    idleCheckFrequency?: number;
}

/**
 * Represents the options for configuring TLS (Transport Layer Security) for a Redis connection.
 * This configuration is essential for establishing a secure connection using SSL/TLS,
 * which ensures data is encrypted during transmission.
 */
export interface TLSOptions {
    /**
     * Specifies one or multiple Certificate Authority (CA) certificates to use for validating the server certificate.
     *
     * The CA certificates are essential for ensuring that the server's certificate is issued by a trusted authority.
     * This is an array of ArrayBuffer, where each ArrayBuffer represents a CA certificate in a binary format.
     */
    ca: ArrayBuffer[];

    /**
     * An optional client certificate used for mutual TLS authentication.
     *
     * Providing a client certificate is part of mutual TLS (mTLS), where both the client and the server authenticate each other.
     * This property should be an ArrayBuffer representing the client's certificate in a binary format.
     * If this property is omitted, the client will not use a certificate for authentication.
     */
    cert?: ArrayBuffer;

    /**
     * An optional private key associated with the client certificate.
     *
     * This key is required if a client certificate is provided (via the `cert` property).
     * The private key must correspond to the public key in the client certificate and should be in a binary format represented by an ArrayBuffer.
     * If this property is omitted but a client certificate is provided, the connection attempt will fail due to the lack of a corresponding private key.
     */
    key?: ArrayBuffer;
}

/**
 * Represents the configuration options for a Redis Cluster client.
 *
 * These options define the behavior of the client when connecting to and interacting with a Redis Cluster.
 */
export interface ClusterOptions {
    /**
     * The maximum number of redirects the client will follow when a command is redirected.
     *
     * In a Redis Cluster, certain commands may be redirected to other nodes. This option limits the number of such redirections.
     * If this value is not set, a default value (typically defined by the client library) will be used.
     */
    maxRedirects?: number;

    /**
     * Determines if the client operates in read-only mode.
     *
     * When set to true, the client sends read commands to replica nodes, potentially improving read scalability.
     * This is useful in a cluster setup where you want to distribute read operations across multiple replicas.
     */
    readOnly?: boolean;

    /**
     * Enables routing read commands by latency.
     *
     * when true, the client attempts to route read commands to the node with the lowest latency.
     * This can optimize read performance by utilizing the fastest available node.
     */
    routeByLatency?: boolean;

    /**
     * Enables random routing for read commands.
     *
     * When true, read commands are sent to random nodes in the cluster, potentially distributing the load more evenly.
     * This can be beneficial in scenarios where distributing read operations evenly is more important than routing based on latency.
     */
    routeRandomly?: boolean;

    /**
     * A list of nodes in the Redis Cluster.
     *
     * This can either be a list of connection URLs or a list of socket options for each node.
     * The client uses this list to initially connect to the cluster and discover other nodes.
     *
     * Each node can be specified as a `RedisConnectionURL` string (e.g., 'redis://host:port') or as a `SocketOptions` object defining host and port.
     */
    nodes: RedisConnectionURL[] | SocketOptions[];
}
