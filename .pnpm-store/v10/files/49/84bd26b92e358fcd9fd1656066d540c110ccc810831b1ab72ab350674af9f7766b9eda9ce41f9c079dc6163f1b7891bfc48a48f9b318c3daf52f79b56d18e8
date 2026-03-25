import { CommanderOptions } from "../utils/Commander";
import ConnectorConstructor from "../connectors/ConnectorConstructor";
import { SentinelConnectionOptions } from "../connectors/SentinelConnector";
import { StandaloneConnectionOptions } from "../connectors/StandaloneConnector";
export declare type ReconnectOnError = (err: Error) => boolean | 1 | 2;
export interface CommonRedisOptions extends CommanderOptions {
    Connector?: ConnectorConstructor;
    retryStrategy?: (times: number) => number | void | null;
    /**
     * If a command does not return a reply within a set number of milliseconds,
     * a "Command timed out" error will be thrown.
     */
    commandTimeout?: number;
    /**
     * Enable/disable keep-alive functionality.
     * @link https://nodejs.org/api/net.html#socketsetkeepaliveenable-initialdelay
     * @default 0
     */
    keepAlive?: number;
    /**
     * Enable/disable the use of Nagle's algorithm.
     * @link https://nodejs.org/api/net.html#socketsetnodelaynodelay
     * @default true
     */
    noDelay?: boolean;
    /**
     * Set the name of the connection to make it easier to identity the connection
     * in client list.
     * @link https://redis.io/commands/client-setname
     */
    connectionName?: string;
    /**
     * If set, client will send AUTH command with the value of this option as the first argument when connected.
     * This is supported since Redis 6.
     */
    username?: string;
    /**
     * If set, client will send AUTH command with the value of this option when connected.
     */
    password?: string;
    /**
     * Database index to use.
     *
     * @default 0
     */
    db?: number;
    /**
     * When the client reconnects, channels subscribed in the previous connection will be
     * resubscribed automatically if `autoResubscribe` is `true`.
     * @default true
     */
    autoResubscribe?: boolean;
    /**
     * Whether or not to resend unfulfilled commands on reconnect.
     * Unfulfilled commands are most likely to be blocking commands such as `brpop` or `blpop`.
     * @default true
     */
    autoResendUnfulfilledCommands?: boolean;
    /**
     * Whether or not to reconnect on certain Redis errors.
     * This options by default is `null`, which means it should never reconnect on Redis errors.
     * You can pass a function that accepts an Redis error, and returns:
     * - `true` or `1` to trigger a reconnection.
     * - `false` or `0` to not reconnect.
     * - `2` to reconnect and resend the failed command (who triggered the error) after reconnection.
     * @example
     * ```js
     * const redis = new Redis({
     *   reconnectOnError(err) {
     *     const targetError = "READONLY";
     *     if (err.message.includes(targetError)) {
     *       // Only reconnect when the error contains "READONLY"
     *       return true; // or `return 1;`
     *     }
     *   },
     * });
     * ```
     * @default null
     */
    reconnectOnError?: ReconnectOnError | null;
    /**
     * @default false
     */
    readOnly?: boolean;
    /**
     * When enabled, numbers returned by Redis will be converted to JavaScript strings instead of numbers.
     * This is necessary if you want to handle big numbers (above `Number.MAX_SAFE_INTEGER` === 2^53).
     * @default false
     */
    stringNumbers?: boolean;
    /**
     * How long the client will wait before killing a socket due to inactivity during initial connection.
     * @default 10000
     */
    connectTimeout?: number;
    /**
     * This option is used internally when you call `redis.monitor()` to tell Redis
     * to enter the monitor mode when the connection is established.
     *
     * @default false
     */
    monitor?: boolean;
    /**
     * The commands that don't get a reply due to the connection to the server is lost are
     * put into a queue and will be resent on reconnect (if allowed by the `retryStrategy` option).
     * This option is used to configure how many reconnection attempts should be allowed before
     * the queue is flushed with a `MaxRetriesPerRequestError` error.
     * Set this options to `null` instead of a number to let commands wait forever
     * until the connection is alive again.
     *
     * @default 20
     */
    maxRetriesPerRequest?: number | null;
    /**
     * @default 10000
     */
    maxLoadingRetryTime?: number;
    /**
     * @default false
     */
    enableAutoPipelining?: boolean;
    /**
     * @default []
     */
    autoPipeliningIgnoredCommands?: string[];
    offlineQueue?: boolean;
    commandQueue?: boolean;
    /**
     *
     * By default, if the connection to Redis server has not been established, commands are added to a queue
     * and are executed once the connection is "ready" (when `enableReadyCheck` is true, "ready" means
     * the Redis server has loaded the database from disk, otherwise means the connection to the Redis
     * server has been established). If this option is false, when execute the command when the connection
     * isn't ready, an error will be returned.
     *
     * @default true
     */
    enableOfflineQueue?: boolean;
    /**
     * The client will sent an INFO command to check whether the server is still loading data from the disk (
     * which happens when the server is just launched) when the connection is established, and only wait until
     * the loading process is finished before emitting the `ready` event.
     *
     * @default true
     */
    enableReadyCheck?: boolean;
    /**
     * When a Redis instance is initialized, a connection to the server is immediately established. Set this to
     * true will delay the connection to the server until the first command is sent or `redis.connect()` is called
     * explicitly.
     *
     * @default false
     */
    lazyConnect?: boolean;
    /**
     * @default undefined
     */
    scripts?: Record<string, {
        lua: string;
        numberOfKeys?: number;
        readOnly?: boolean;
    }>;
}
export declare type RedisOptions = CommonRedisOptions & SentinelConnectionOptions & StandaloneConnectionOptions;
export declare const DEFAULT_REDIS_OPTIONS: RedisOptions;
