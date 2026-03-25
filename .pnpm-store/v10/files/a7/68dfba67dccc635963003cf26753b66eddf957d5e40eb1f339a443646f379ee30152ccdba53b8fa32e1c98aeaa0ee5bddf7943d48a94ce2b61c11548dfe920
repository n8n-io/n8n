/// <reference types="node" />
import COMMANDS from './commands';
import { RedisCommand, RedisCommandArgument, RedisCommandArguments, RedisCommandRawReply, RedisCommandReply, RedisFunctions, RedisModules, RedisExtensions, RedisScript, RedisScripts, RedisCommandSignature, RedisFunction } from '../commands';
import { ClientCommandOptions, RedisClientOptions, RedisClientType, WithFunctions, WithModules, WithScripts } from '../client';
import { NodeAddressMap, ShardNode } from './cluster-slots';
import { EventEmitter } from 'events';
import { RedisClusterMultiCommandType } from './multi-command';
import { PubSubListener } from '../client/pub-sub';
export type RedisClusterClientOptions = Omit<RedisClientOptions, 'modules' | 'functions' | 'scripts' | 'database'>;
export interface RedisClusterOptions<M extends RedisModules = Record<string, never>, F extends RedisFunctions = Record<string, never>, S extends RedisScripts = Record<string, never>> extends RedisExtensions<M, F, S> {
    /**
     * Should contain details for some of the cluster nodes that the client will use to discover
     * the "cluster topology". We recommend including details for at least 3 nodes here.
     */
    rootNodes: Array<RedisClusterClientOptions>;
    /**
     * Default values used for every client in the cluster. Use this to specify global values,
     * for example: ACL credentials, timeouts, TLS configuration etc.
     */
    defaults?: Partial<RedisClusterClientOptions>;
    /**
     * When `true`, `.connect()` will only discover the cluster topology, without actually connecting to all the nodes.
     * Useful for short-term or PubSub-only connections.
     */
    minimizeConnections?: boolean;
    /**
     * When `true`, distribute load by executing readonly commands (such as `GET`, `GEOSEARCH`, etc.) across all cluster nodes. When `false`, only use master nodes.
     */
    useReplicas?: boolean;
    /**
     * The maximum number of times a command will be redirected due to `MOVED` or `ASK` errors.
     */
    maxCommandRedirections?: number;
    /**
     * Mapping between the addresses in the cluster (see `CLUSTER SHARDS`) and the addresses the client should connect to
     * Useful when the cluster is running on another network
     *
     */
    nodeAddressMap?: NodeAddressMap;
}
type WithCommands = {
    [P in keyof typeof COMMANDS]: RedisCommandSignature<(typeof COMMANDS)[P]>;
};
export type RedisClusterType<M extends RedisModules = Record<string, never>, F extends RedisFunctions = Record<string, never>, S extends RedisScripts = Record<string, never>> = RedisCluster<M, F, S> & WithCommands & WithModules<M> & WithFunctions<F> & WithScripts<S>;
export default class RedisCluster<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> extends EventEmitter {
    #private;
    static extractFirstKey(command: RedisCommand, originalArgs: Array<unknown>, redisArgs: RedisCommandArguments): RedisCommandArgument | undefined;
    static create<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts>(options?: RedisClusterOptions<M, F, S>): RedisClusterType<M, F, S>;
    get slots(): import("./cluster-slots").Shard<M, F, S>[];
    get shards(): import("./cluster-slots").Shard<M, F, S>[];
    get masters(): ShardNode<M, F, S>[];
    get replicas(): ShardNode<M, F, S>[];
    get nodeByAddress(): Map<string, ShardNode<M, F, S> | import("./cluster-slots").MasterNode<M, F, S>>;
    get pubSubNode(): Required<import("./cluster-slots").Node<M, F, S>> | undefined;
    get isOpen(): boolean;
    constructor(options: RedisClusterOptions<M, F, S>);
    duplicate(overrides?: Partial<RedisClusterOptions<M, F, S>>): RedisClusterType<M, F, S>;
    connect(): Promise<void>;
    commandsExecutor<C extends RedisCommand>(command: C, args: Array<unknown>): Promise<RedisCommandReply<C>>;
    sendCommand<T = RedisCommandRawReply>(firstKey: RedisCommandArgument | undefined, isReadonly: boolean | undefined, args: RedisCommandArguments, options?: ClientCommandOptions): Promise<T>;
    functionsExecutor<F extends RedisFunction>(fn: F, args: Array<unknown>, name: string): Promise<RedisCommandReply<F>>;
    executeFunction(name: string, fn: RedisFunction, originalArgs: Array<unknown>, redisArgs: RedisCommandArguments, options?: ClientCommandOptions): Promise<RedisCommandRawReply>;
    scriptsExecutor<S extends RedisScript>(script: S, args: Array<unknown>): Promise<RedisCommandReply<S>>;
    executeScript(script: RedisScript, originalArgs: Array<unknown>, redisArgs: RedisCommandArguments, options?: ClientCommandOptions): Promise<RedisCommandRawReply>;
    MULTI(routing?: RedisCommandArgument): RedisClusterMultiCommandType<M, F, S>;
    multi: (routing?: RedisCommandArgument) => RedisClusterMultiCommandType<M, F, S>;
    SUBSCRIBE<T extends boolean = false>(channels: string | Array<string>, listener: PubSubListener<T>, bufferMode?: T): Promise<void>;
    subscribe: <T extends boolean = false>(channels: string | Array<string>, listener: PubSubListener<T>, bufferMode?: T | undefined) => Promise<void>;
    UNSUBSCRIBE<T extends boolean = false>(channels?: string | Array<string>, listener?: PubSubListener<boolean>, bufferMode?: T): Promise<void>;
    unsubscribe: <T extends boolean = false>(channels?: string | Array<string>, listener?: PubSubListener<boolean>, bufferMode?: T | undefined) => Promise<void>;
    PSUBSCRIBE<T extends boolean = false>(patterns: string | Array<string>, listener: PubSubListener<T>, bufferMode?: T): Promise<void>;
    pSubscribe: <T extends boolean = false>(patterns: string | Array<string>, listener: PubSubListener<T>, bufferMode?: T | undefined) => Promise<void>;
    PUNSUBSCRIBE<T extends boolean = false>(patterns?: string | Array<string>, listener?: PubSubListener<T>, bufferMode?: T): Promise<void>;
    pUnsubscribe: <T extends boolean = false>(patterns?: string | Array<string>, listener?: PubSubListener<T> | undefined, bufferMode?: T | undefined) => Promise<void>;
    SSUBSCRIBE<T extends boolean = false>(channels: string | Array<string>, listener: PubSubListener<T>, bufferMode?: T): Promise<void>;
    sSubscribe: <T extends boolean = false>(channels: string | Array<string>, listener: PubSubListener<T>, bufferMode?: T | undefined) => Promise<void>;
    SUNSUBSCRIBE<T extends boolean = false>(channels: string | Array<string>, listener?: PubSubListener<T>, bufferMode?: T): Promise<void>;
    sUnsubscribe: <T extends boolean = false>(channels: string | Array<string>, listener?: PubSubListener<T> | undefined, bufferMode?: T | undefined) => Promise<void>;
    quit(): Promise<void>;
    disconnect(): Promise<void>;
    nodeClient(node: ShardNode<M, F, S>): RedisClientType<M, F, S> | Promise<RedisClientType<M, F, S>>;
    getRandomNode(): ShardNode<M, F, S>;
    getSlotRandomNode(slot: number): ShardNode<M, F, S>;
    /**
     * @deprecated use `.masters` instead
     */
    getMasters(): ShardNode<M, F, S>[];
    /**
     * @deprecated use `.slots[<SLOT>]` instead
     */
    getSlotMaster(slot: number): import("./cluster-slots").MasterNode<M, F, S>;
}
export {};
