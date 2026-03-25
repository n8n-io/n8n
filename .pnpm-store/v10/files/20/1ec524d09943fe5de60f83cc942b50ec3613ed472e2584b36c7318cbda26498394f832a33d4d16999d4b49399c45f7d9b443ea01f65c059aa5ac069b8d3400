/// <reference types="node" />
import { SrvRecord } from "dns";
import { RedisOptions } from "../redis/RedisOptions";
import { CommanderOptions } from "../utils/Commander";
import { NodeRole } from "./util";
export declare type DNSResolveSrvFunction = (hostname: string, callback: (err: NodeJS.ErrnoException | null | undefined, records?: SrvRecord[]) => void) => void;
export declare type DNSLookupFunction = (hostname: string, callback: (err: NodeJS.ErrnoException | null | undefined, address: string, family?: number) => void) => void;
export interface NatMap {
    [key: string]: {
        host: string;
        port: number;
    };
}
/**
 * Options for Cluster constructor
 */
export interface ClusterOptions extends CommanderOptions {
    /**
     * See "Quick Start" section.
     *
     * @default (times) => Math.min(100 + times * 2, 2000)
     */
    clusterRetryStrategy?: (times: number, reason?: Error) => number | void | null;
    /**
     * See Redis class.
     *
     * @default true
     */
    enableOfflineQueue?: boolean;
    /**
     * When enabled, ioredis only emits "ready" event when `CLUSTER INFO`
     * command reporting the cluster is ready for handling commands.
     *
     * @default true
     */
    enableReadyCheck?: boolean;
    /**
     * Scale reads to the node with the specified role.
     *
     * @default "master"
     */
    scaleReads?: NodeRole | Function;
    /**
     * When a MOVED or ASK error is received, client will redirect the
     * command to another node.
     * This option limits the max redirections allowed to send a command.
     *
     * @default 16
     */
    maxRedirections?: number;
    /**
     * When an error is received when sending a command (e.g.
     * "Connection is closed." when the target Redis node is down), client will retry
     * if `retryDelayOnFailover` is valid delay time (in ms).
     *
     * @default 100
     */
    retryDelayOnFailover?: number;
    /**
     * When a CLUSTERDOWN error is received, client will retry
     * if `retryDelayOnClusterDown` is valid delay time (in ms).
     *
     * @default 100
     */
    retryDelayOnClusterDown?: number;
    /**
     * When a TRYAGAIN error is received, client will retry
     * if `retryDelayOnTryAgain` is valid delay time (in ms).
     *
     * @default 100
     */
    retryDelayOnTryAgain?: number;
    /**
     * By default, this value is 0, which means when a `MOVED` error is received,
     * the client will resend the command instantly to the node returned together with
     * the `MOVED` error. However, sometimes it takes time for a cluster to become
     * state stabilized after a failover, so adding a delay before resending can
     * prevent a ping pong effect.
     *
     * @default 0
     */
    retryDelayOnMoved?: number;
    /**
     * The milliseconds before a timeout occurs while refreshing
     * slots from the cluster.
     *
     * @default 1000
     */
    slotsRefreshTimeout?: number;
    /**
     * The milliseconds between every automatic slots refresh.
     *
     * @default 5000
     */
    slotsRefreshInterval?: number;
    /**
     * Passed to the constructor of `Redis`
     *
     * @default null
     */
    redisOptions?: Omit<RedisOptions, "port" | "host" | "path" | "sentinels" | "retryStrategy" | "enableOfflineQueue" | "readOnly">;
    /**
     * By default, When a new Cluster instance is created,
     * it will connect to the Redis cluster automatically.
     * If you want to keep the instance disconnected until the first command is called,
     * set this option to `true`.
     *
     * @default false
     */
    lazyConnect?: boolean;
    /**
     * Discover nodes using SRV records
     *
     * @default false
     */
    useSRVRecords?: boolean;
    /**
     * SRV records will be resolved via this function.
     *
     * You may provide a custom `resolveSrv` function when you want to customize
     * the cache behavior of the default function.
     *
     * @default require('dns').resolveSrv
     */
    resolveSrv?: DNSResolveSrvFunction;
    /**
     * Hostnames will be resolved to IP addresses via this function.
     * This is needed when the addresses of startup nodes are hostnames instead
     * of IPs.
     *
     * You may provide a custom `lookup` function when you want to customize
     * the cache behavior of the default function.
     *
     * @default require('dns').lookup
     */
    dnsLookup?: DNSLookupFunction;
    natMap?: NatMap;
    /**
     * See Redis class.
     *
     * @default false
     */
    enableAutoPipelining?: boolean;
    /**
     * See Redis class.
     *
     * @default []
     */
    autoPipeliningIgnoredCommands?: string[];
    /**
     * Custom LUA commands
     */
    scripts?: Record<string, {
        lua: string;
        numberOfKeys?: number;
        readOnly?: boolean;
    }>;
}
export declare const DEFAULT_CLUSTER_OPTIONS: ClusterOptions;
