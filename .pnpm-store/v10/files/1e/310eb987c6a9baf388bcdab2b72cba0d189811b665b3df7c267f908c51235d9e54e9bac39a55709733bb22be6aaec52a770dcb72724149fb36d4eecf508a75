/// <reference types="node" />
import COMMANDS from './commands';
import { RedisCommand, RedisCommandArguments, RedisCommandRawReply, RedisCommandReply, RedisFunctions, RedisModules, RedisExtensions, RedisScript, RedisScripts, RedisCommandSignature, ConvertArgumentType, RedisFunction, ExcludeMappedString } from '../commands';
import { RedisSocketOptions } from './socket';
import { QueueCommandOptions } from './commands-queue';
import { RedisClientMultiCommandType } from './multi-command';
import { RedisMultiQueuedCommand } from '../multi-command';
import { EventEmitter } from 'events';
import { CommandOptions } from '../command-options';
import { ScanOptions, ZMember } from '../commands/generic-transformers';
import { ScanCommandOptions } from '../commands/SCAN';
import { HScanTuple } from '../commands/HSCAN';
import { Options as PoolOptions } from 'generic-pool';
import { PubSubType, PubSubListener, PubSubTypeListeners, ChannelListeners } from './pub-sub';
export interface RedisClientOptions<M extends RedisModules = RedisModules, F extends RedisFunctions = RedisFunctions, S extends RedisScripts = RedisScripts> extends RedisExtensions<M, F, S> {
    /**
     * `redis[s]://[[username][:password]@][host][:port][/db-number]`
     * See [`redis`](https://www.iana.org/assignments/uri-schemes/prov/redis) and [`rediss`](https://www.iana.org/assignments/uri-schemes/prov/rediss) IANA registration for more details
     */
    url?: string;
    /**
     * Socket connection properties
     */
    socket?: RedisSocketOptions;
    /**
     * ACL username ([see ACL guide](https://redis.io/topics/acl))
     */
    username?: string;
    /**
     * ACL password or the old "--requirepass" password
     */
    password?: string;
    /**
     * Client name ([see `CLIENT SETNAME`](https://redis.io/commands/client-setname))
     */
    name?: string;
    /**
     * Redis database number (see [`SELECT`](https://redis.io/commands/select) command)
     */
    database?: number;
    /**
     * Maximum length of the client's internal command queue
     */
    commandsQueueMaxLength?: number;
    /**
     * When `true`, commands are rejected when the client is reconnecting.
     * When `false`, commands are queued for execution after reconnection.
     */
    disableOfflineQueue?: boolean;
    /**
     * Connect in [`READONLY`](https://redis.io/commands/readonly) mode
     */
    readonly?: boolean;
    legacyMode?: boolean;
    isolationPoolOptions?: PoolOptions;
    /**
     * Send `PING` command at interval (in ms).
     * Useful with Redis deployments that do not use TCP Keep-Alive.
     */
    pingInterval?: number;
    /**
     * If set to true, disables sending client identifier (user-agent like message) to the redis server
     */
    disableClientInfo?: boolean;
    /**
     * Tag to append to library name that is sent to the Redis server
     */
    clientInfoTag?: string;
}
type WithCommands = {
    [P in keyof typeof COMMANDS]: RedisCommandSignature<(typeof COMMANDS)[P]>;
};
export type WithModules<M extends RedisModules> = {
    [P in keyof M as ExcludeMappedString<P>]: {
        [C in keyof M[P] as ExcludeMappedString<C>]: RedisCommandSignature<M[P][C]>;
    };
};
export type WithFunctions<F extends RedisFunctions> = {
    [P in keyof F as ExcludeMappedString<P>]: {
        [FF in keyof F[P] as ExcludeMappedString<FF>]: RedisCommandSignature<F[P][FF]>;
    };
};
export type WithScripts<S extends RedisScripts> = {
    [P in keyof S as ExcludeMappedString<P>]: RedisCommandSignature<S[P]>;
};
export type RedisClientType<M extends RedisModules = Record<string, never>, F extends RedisFunctions = Record<string, never>, S extends RedisScripts = Record<string, never>> = RedisClient<M, F, S> & WithCommands & WithModules<M> & WithFunctions<F> & WithScripts<S>;
export type InstantiableRedisClient<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = new (options?: RedisClientOptions<M, F, S>) => RedisClientType<M, F, S>;
export interface ClientCommandOptions extends QueueCommandOptions {
    isolated?: boolean;
}
export default class RedisClient<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> extends EventEmitter {
    #private;
    static commandOptions<T extends ClientCommandOptions>(options: T): CommandOptions<T>;
    commandOptions: typeof RedisClient.commandOptions;
    static extend<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts>(extensions?: RedisExtensions<M, F, S>): InstantiableRedisClient<M, F, S>;
    static create<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts>(options?: RedisClientOptions<M, F, S>): RedisClientType<M, F, S>;
    static parseURL(url: string): RedisClientOptions;
    get options(): RedisClientOptions<M, F, S> | undefined;
    get isOpen(): boolean;
    get isReady(): boolean;
    get isPubSubActive(): boolean;
    get v4(): Record<string, any>;
    constructor(options?: RedisClientOptions<M, F, S>);
    duplicate(overrides?: Partial<RedisClientOptions<M, F, S>>): RedisClientType<M, F, S>;
    connect(): Promise<RedisClientType<M, F, S>>;
    commandsExecutor<C extends RedisCommand>(command: C, args: Array<unknown>): Promise<RedisCommandReply<C>>;
    sendCommand<T = RedisCommandRawReply>(args: RedisCommandArguments, options?: ClientCommandOptions): Promise<T>;
    functionsExecuter<F extends RedisFunction>(fn: F, args: Array<unknown>, name: string): Promise<RedisCommandReply<F>>;
    executeFunction(name: string, fn: RedisFunction, args: RedisCommandArguments, options?: ClientCommandOptions): Promise<RedisCommandRawReply>;
    scriptsExecuter<S extends RedisScript>(script: S, args: Array<unknown>): Promise<RedisCommandReply<S>>;
    executeScript(script: RedisScript, args: RedisCommandArguments, options?: ClientCommandOptions): Promise<RedisCommandRawReply>;
    SELECT(db: number): Promise<void>;
    SELECT(options: CommandOptions<ClientCommandOptions>, db: number): Promise<void>;
    select: {
        (db: number): Promise<void>;
        (options: CommandOptions<ClientCommandOptions>, db: number): Promise<void>;
    };
    SUBSCRIBE<T extends boolean = false>(channels: string | Array<string>, listener: PubSubListener<T>, bufferMode?: T): Promise<void>;
    subscribe: <T extends boolean = false>(channels: string | Array<string>, listener: PubSubListener<T>, bufferMode?: T | undefined) => Promise<void>;
    UNSUBSCRIBE<T extends boolean = false>(channels?: string | Array<string>, listener?: PubSubListener<T>, bufferMode?: T): Promise<void>;
    unsubscribe: <T extends boolean = false>(channels?: string | Array<string>, listener?: PubSubListener<T> | undefined, bufferMode?: T | undefined) => Promise<void>;
    PSUBSCRIBE<T extends boolean = false>(patterns: string | Array<string>, listener: PubSubListener<T>, bufferMode?: T): Promise<void>;
    pSubscribe: <T extends boolean = false>(patterns: string | Array<string>, listener: PubSubListener<T>, bufferMode?: T | undefined) => Promise<void>;
    PUNSUBSCRIBE<T extends boolean = false>(patterns?: string | Array<string>, listener?: PubSubListener<T>, bufferMode?: T): Promise<void>;
    pUnsubscribe: <T extends boolean = false>(patterns?: string | Array<string>, listener?: PubSubListener<T> | undefined, bufferMode?: T | undefined) => Promise<void>;
    SSUBSCRIBE<T extends boolean = false>(channels: string | Array<string>, listener: PubSubListener<T>, bufferMode?: T): Promise<void>;
    sSubscribe: <T extends boolean = false>(channels: string | Array<string>, listener: PubSubListener<T>, bufferMode?: T | undefined) => Promise<void>;
    SUNSUBSCRIBE<T extends boolean = false>(channels?: string | Array<string>, listener?: PubSubListener<T>, bufferMode?: T): Promise<void>;
    sUnsubscribe: <T extends boolean = false>(channels?: string | Array<string>, listener?: PubSubListener<T> | undefined, bufferMode?: T | undefined) => Promise<void>;
    getPubSubListeners(type: PubSubType): PubSubTypeListeners;
    extendPubSubChannelListeners(type: PubSubType, channel: string, listeners: ChannelListeners): Promise<void>;
    extendPubSubListeners(type: PubSubType, listeners: PubSubTypeListeners): Promise<void>;
    QUIT(): Promise<string>;
    quit: () => Promise<string>;
    executeIsolated<T>(fn: (client: RedisClientType<M, F, S>) => T | Promise<T>): Promise<T>;
    MULTI(): RedisClientMultiCommandType<M, F, S>;
    multi: () => RedisClientMultiCommandType<M, F, S>;
    multiExecutor(commands: Array<RedisMultiQueuedCommand>, selectedDB?: number, chainId?: symbol): Promise<Array<RedisCommandRawReply>>;
    scanIterator(options?: ScanCommandOptions): AsyncIterable<string>;
    hScanIterator(key: string, options?: ScanOptions): AsyncIterable<ConvertArgumentType<HScanTuple, string>>;
    sScanIterator(key: string, options?: ScanOptions): AsyncIterable<string>;
    zScanIterator(key: string, options?: ScanOptions): AsyncIterable<ConvertArgumentType<ZMember, string>>;
    disconnect(): Promise<void>;
    ref(): void;
    unref(): void;
}
export {};
