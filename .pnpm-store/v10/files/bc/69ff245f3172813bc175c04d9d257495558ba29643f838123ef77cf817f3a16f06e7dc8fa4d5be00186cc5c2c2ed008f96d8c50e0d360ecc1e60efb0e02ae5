/// <reference types="node" />
import { EventEmitter } from "events";
import Cluster from "./cluster";
import Command from "./Command";
import { DataHandledable, FlushQueueOptions, Condition } from "./DataHandler";
import { RedisOptions } from "./redis/RedisOptions";
import ScanStream from "./ScanStream";
import { Transaction } from "./transaction";
import { Callback, CommandItem, NetStream, ScanStreamOptions, WriteableStream } from "./types";
import Commander from "./utils/Commander";
import Deque = require("denque");
declare type RedisStatus = "wait" | "reconnecting" | "connecting" | "connect" | "ready" | "close" | "end";
/**
 * This is the major component of ioredis.
 * Use it to connect to a standalone Redis server or Sentinels.
 *
 * ```typescript
 * const redis = new Redis(); // Default port is 6379
 * async function main() {
 *   redis.set("foo", "bar");
 *   redis.get("foo", (err, result) => {
 *     // `result` should be "bar"
 *     console.log(err, result);
 *   });
 *   // Or use Promise
 *   const result = await redis.get("foo");
 * }
 * ```
 */
declare class Redis extends Commander implements DataHandledable {
    static Cluster: typeof Cluster;
    static Command: typeof Command;
    /**
     * Default options
     */
    private static defaultOptions;
    /**
     * Create a Redis instance.
     * This is the same as `new Redis()` but is included for compatibility with node-redis.
     */
    static createClient(...args: ConstructorParameters<typeof Redis>): Redis;
    options: RedisOptions;
    status: RedisStatus;
    /**
     * @ignore
     */
    stream: NetStream;
    /**
     * @ignore
     */
    isCluster: boolean;
    /**
     * @ignore
     */
    condition: Condition | null;
    /**
     * @ignore
     */
    commandQueue: Deque<CommandItem>;
    private connector;
    private reconnectTimeout;
    private offlineQueue;
    private connectionEpoch;
    private retryAttempts;
    private manuallyClosing;
    private _autoPipelines;
    private _runningAutoPipelines;
    constructor(port: number, host: string, options: RedisOptions);
    constructor(path: string, options: RedisOptions);
    constructor(port: number, options: RedisOptions);
    constructor(port: number, host: string);
    constructor(options: RedisOptions);
    constructor(port: number);
    constructor(path: string);
    constructor();
    get autoPipelineQueueSize(): number;
    /**
     * Create a connection to Redis.
     * This method will be invoked automatically when creating a new Redis instance
     * unless `lazyConnect: true` is passed.
     *
     * When calling this method manually, a Promise is returned, which will
     * be resolved when the connection status is ready.
     */
    connect(callback?: Callback<void>): Promise<void>;
    /**
     * Disconnect from Redis.
     *
     * This method closes the connection immediately,
     * and may lose some pending replies that haven't written to client.
     * If you want to wait for the pending replies, use Redis#quit instead.
     */
    disconnect(reconnect?: boolean): void;
    /**
     * Disconnect from Redis.
     *
     * @deprecated
     */
    end(): void;
    /**
     * Create a new instance with the same options as the current one.
     *
     * @example
     * ```js
     * var redis = new Redis(6380);
     * var anotherRedis = redis.duplicate();
     * ```
     */
    duplicate(override?: Partial<RedisOptions>): Redis;
    /**
     * Mode of the connection.
     *
     * One of `"normal"`, `"subscriber"`, or `"monitor"`. When the connection is
     * not in `"normal"` mode, certain commands are not allowed.
     */
    get mode(): "normal" | "subscriber" | "monitor";
    /**
     * Listen for all requests received by the server in real time.
     *
     * This command will create a new connection to Redis and send a
     * MONITOR command via the new connection in order to avoid disturbing
     * the current connection.
     *
     * @param callback The callback function. If omit, a promise will be returned.
     * @example
     * ```js
     * var redis = new Redis();
     * redis.monitor(function (err, monitor) {
     *   // Entering monitoring mode.
     *   monitor.on('monitor', function (time, args, source, database) {
     *     console.log(time + ": " + util.inspect(args));
     *   });
     * });
     *
     * // supports promise as well as other commands
     * redis.monitor().then(function (monitor) {
     *   monitor.on('monitor', function (time, args, source, database) {
     *     console.log(time + ": " + util.inspect(args));
     *   });
     * });
     * ```
     */
    monitor(callback?: Callback<Redis>): Promise<Redis>;
    /**
     * Send a command to Redis
     *
     * This method is used internally and in most cases you should not
     * use it directly. If you need to send a command that is not supported
     * by the library, you can use the `call` method:
     *
     * ```js
     * const redis = new Redis();
     *
     * redis.call('set', 'foo', 'bar');
     * // or
     * redis.call(['set', 'foo', 'bar']);
     * ```
     *
     * @ignore
     */
    sendCommand(command: Command, stream?: WriteableStream): unknown;
    scanStream(options?: ScanStreamOptions): ScanStream;
    scanBufferStream(options?: ScanStreamOptions): ScanStream;
    sscanStream(key: string, options?: ScanStreamOptions): ScanStream;
    sscanBufferStream(key: string, options?: ScanStreamOptions): ScanStream;
    hscanStream(key: string, options?: ScanStreamOptions): ScanStream;
    hscanBufferStream(key: string, options?: ScanStreamOptions): ScanStream;
    zscanStream(key: string, options?: ScanStreamOptions): ScanStream;
    zscanBufferStream(key: string, options?: ScanStreamOptions): ScanStream;
    /**
     * Emit only when there's at least one listener.
     *
     * @ignore
     */
    silentEmit(eventName: string, arg?: unknown): boolean;
    /**
     * @ignore
     */
    recoverFromFatalError(_commandError: Error, err: Error, options: FlushQueueOptions): void;
    /**
     * @ignore
     */
    handleReconnection(err: Error, item: CommandItem): void;
    /**
     * Get description of the connection. Used for debugging.
     */
    private _getDescription;
    private resetCommandQueue;
    private resetOfflineQueue;
    private parseOptions;
    /**
     * Change instance's status
     */
    private setStatus;
    private createScanStream;
    /**
     * Flush offline queue and command queue with error.
     *
     * @param error The error object to send to the commands
     * @param options options
     */
    private flushQueue;
    /**
     * Check whether Redis has finished loading the persistent data and is able to
     * process commands.
     */
    private _readyCheck;
}
interface Redis extends EventEmitter {
    on(event: "message", cb: (channel: string, message: string) => void): this;
    once(event: "message", cb: (channel: string, message: string) => void): this;
    on(event: "messageBuffer", cb: (channel: Buffer, message: Buffer) => void): this;
    once(event: "messageBuffer", cb: (channel: Buffer, message: Buffer) => void): this;
    on(event: "pmessage", cb: (pattern: string, channel: string, message: string) => void): this;
    once(event: "pmessage", cb: (pattern: string, channel: string, message: string) => void): this;
    on(event: "pmessageBuffer", cb: (pattern: string, channel: Buffer, message: Buffer) => void): this;
    once(event: "pmessageBuffer", cb: (pattern: string, channel: Buffer, message: Buffer) => void): this;
    on(event: "error", cb: (error: Error) => void): this;
    once(event: "error", cb: (error: Error) => void): this;
    on(event: RedisStatus, cb: () => void): this;
    once(event: RedisStatus, cb: () => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
}
interface Redis extends Transaction {
}
export default Redis;
