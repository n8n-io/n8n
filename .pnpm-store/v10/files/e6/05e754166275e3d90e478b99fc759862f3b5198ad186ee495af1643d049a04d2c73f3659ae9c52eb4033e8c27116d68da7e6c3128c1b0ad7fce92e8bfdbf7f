/// <reference types="node" />
import { EventEmitter } from "events";
import Command from "../Command";
import Redis from "../Redis";
import ScanStream from "../ScanStream";
import { Transaction } from "../transaction";
import { Callback, ScanStreamOptions, WriteableStream } from "../types";
import Commander from "../utils/Commander";
import { ClusterOptions } from "./ClusterOptions";
import { NodeKey, NodeRole } from "./util";
export declare type ClusterNode = string | number | {
    host?: string | undefined;
    port?: number | undefined;
};
declare type ClusterStatus = "end" | "close" | "wait" | "connecting" | "connect" | "ready" | "reconnecting" | "disconnecting";
/**
 * Client for the official Redis Cluster
 */
declare class Cluster extends Commander {
    options: ClusterOptions;
    slots: NodeKey[][];
    status: ClusterStatus;
    /**
     * @ignore
     */
    _groupsIds: {
        [key: string]: number;
    };
    /**
     * @ignore
     */
    _groupsBySlot: number[];
    /**
     * @ignore
     */
    isCluster: boolean;
    private startupNodes;
    private connectionPool;
    private manuallyClosing;
    private retryAttempts;
    private delayQueue;
    private offlineQueue;
    private subscriber;
    private slotsTimer;
    private reconnectTimeout;
    private isRefreshing;
    private _autoPipelines;
    private _runningAutoPipelines;
    private _readyDelayedCallbacks;
    /**
     * Every time Cluster#connect() is called, this value will be
     * auto-incrementing. The purpose of this value is used for
     * discarding previous connect attampts when creating a new
     * connection.
     */
    private connectionEpoch;
    /**
     * Creates an instance of Cluster.
     */
    constructor(startupNodes: ClusterNode[], options?: ClusterOptions);
    /**
     * Connect to a cluster
     */
    connect(): Promise<void>;
    /**
     * Disconnect from every node in the cluster.
     */
    disconnect(reconnect?: boolean): void;
    /**
     * Quit the cluster gracefully.
     */
    quit(callback?: Callback<"OK">): Promise<"OK">;
    /**
     * Create a new instance with the same startup nodes and options as the current one.
     *
     * @example
     * ```js
     * var cluster = new Redis.Cluster([{ host: "127.0.0.1", port: "30001" }]);
     * var anotherCluster = cluster.duplicate();
     * ```
     */
    duplicate(overrideStartupNodes?: any[], overrideOptions?: {}): Cluster;
    /**
     * Get nodes with the specified role
     */
    nodes(role?: NodeRole): Redis[];
    /**
     * This is needed in order not to install a listener for each auto pipeline
     *
     * @ignore
     */
    delayUntilReady(callback: Callback): void;
    /**
     * Get the number of commands queued in automatic pipelines.
     *
     * This is not available (and returns 0) until the cluster is connected and slots information have been received.
     */
    get autoPipelineQueueSize(): number;
    /**
     * Refresh the slot cache
     *
     * @ignore
     */
    refreshSlotsCache(callback?: Callback<void>): void;
    /**
     * @ignore
     */
    sendCommand(command: Command, stream?: WriteableStream, node?: any): unknown;
    sscanStream(key: string, options?: ScanStreamOptions): ScanStream;
    sscanBufferStream(key: string, options?: ScanStreamOptions): ScanStream;
    hscanStream(key: string, options?: ScanStreamOptions): ScanStream;
    hscanBufferStream(key: string, options?: ScanStreamOptions): ScanStream;
    zscanStream(key: string, options?: ScanStreamOptions): ScanStream;
    zscanBufferStream(key: string, options?: ScanStreamOptions): ScanStream;
    /**
     * @ignore
     */
    handleError(error: Error, ttl: {
        value?: any;
    }, handlers: any): void;
    private resetOfflineQueue;
    private clearNodesRefreshInterval;
    private resetNodesRefreshInterval;
    /**
     * Change cluster instance's status
     */
    private setStatus;
    /**
     * Called when closed to check whether a reconnection should be made
     */
    private handleCloseEvent;
    /**
     * Flush offline queue with error.
     */
    private flushQueue;
    private executeOfflineCommands;
    private natMapper;
    private getInfoFromNode;
    private invokeReadyDelayedCallbacks;
    /**
     * Check whether Cluster is able to process commands
     */
    private readyCheck;
    private resolveSrv;
    private dnsLookup;
    /**
     * Normalize startup nodes, and resolving hostnames to IPs.
     *
     * This process happens every time when #connect() is called since
     * #startupNodes and DNS records may chanage.
     */
    private resolveStartupNodeHostnames;
    private createScanStream;
}
interface Cluster extends EventEmitter {
}
interface Cluster extends Transaction {
}
export default Cluster;
