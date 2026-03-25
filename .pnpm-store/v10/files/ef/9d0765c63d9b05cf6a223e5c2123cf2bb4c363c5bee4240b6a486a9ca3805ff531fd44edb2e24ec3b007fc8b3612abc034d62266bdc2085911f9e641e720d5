/// <reference types="node" />
import { RedisClientType } from '../client';
import { RedisClusterOptions } from '.';
import { RedisCommandArgument, RedisFunctions, RedisModules, RedisScripts } from '../commands';
import { ChannelListeners } from '../client/pub-sub';
import { EventEmitter } from 'stream';
interface NodeAddress {
    host: string;
    port: number;
}
export type NodeAddressMap = {
    [address: string]: NodeAddress;
} | ((address: string) => NodeAddress | undefined);
type ValueOrPromise<T> = T | Promise<T>;
type ClientOrPromise<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = ValueOrPromise<RedisClientType<M, F, S>>;
export interface Node<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> {
    address: string;
    client?: ClientOrPromise<M, F, S>;
}
export interface ShardNode<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> extends Node<M, F, S> {
    id: string;
    host: string;
    port: number;
    readonly: boolean;
}
export interface MasterNode<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> extends ShardNode<M, F, S> {
    pubSubClient?: ClientOrPromise<M, F, S>;
}
export interface Shard<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> {
    master: MasterNode<M, F, S>;
    replicas?: Array<ShardNode<M, F, S>>;
    nodesIterator?: IterableIterator<ShardNode<M, F, S>>;
}
export type PubSubNode<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = Required<Node<M, F, S>>;
export type OnShardedChannelMovedError = (err: unknown, channel: string, listeners?: ChannelListeners) => void;
export default class RedisClusterSlots<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> {
    #private;
    slots: Shard<M, F, S>[];
    shards: Shard<M, F, S>[];
    masters: ShardNode<M, F, S>[];
    replicas: ShardNode<M, F, S>[];
    readonly nodeByAddress: Map<string, ShardNode<M, F, S> | MasterNode<M, F, S>>;
    pubSubNode?: PubSubNode<M, F, S>;
    get isOpen(): boolean;
    constructor(options: RedisClusterOptions<M, F, S>, emit: EventEmitter['emit']);
    connect(): Promise<void>;
    nodeClient(node: ShardNode<M, F, S>): ClientOrPromise<M, F, S>;
    rediscover(startWith: RedisClientType<M, F, S>): Promise<void>;
    quit(): Promise<void>;
    disconnect(): Promise<void>;
    getClient(firstKey: RedisCommandArgument | undefined, isReadonly: boolean | undefined): ClientOrPromise<M, F, S>;
    getRandomNode(): ShardNode<M, F, S>;
    getSlotRandomNode(slotNumber: number): ShardNode<M, F, S>;
    getMasterByAddress(address: string): ClientOrPromise<M, F, S> | undefined;
    getPubSubClient(): ClientOrPromise<M, F, S>;
    executeUnsubscribeCommand(unsubscribe: (client: RedisClientType<M, F, S>) => Promise<void>): Promise<void>;
    getShardedPubSubClient(channel: string): ClientOrPromise<M, F, S>;
    executeShardedUnsubscribeCommand(channel: string, unsubscribe: (client: RedisClientType<M, F, S>) => Promise<void>): Promise<void>;
}
export {};
