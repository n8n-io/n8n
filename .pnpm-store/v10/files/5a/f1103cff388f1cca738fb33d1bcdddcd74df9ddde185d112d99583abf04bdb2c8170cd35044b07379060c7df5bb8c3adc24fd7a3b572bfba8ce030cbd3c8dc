/// <reference types="node" />
import { EventEmitter } from "events";
import { NatMap } from "../../cluster/ClusterOptions";
import { ConnectionOptions } from "tls";
import SentinelIterator from "./SentinelIterator";
import { SentinelAddress } from "./types";
import AbstractConnector, { ErrorEmitter } from "../AbstractConnector";
import { NetStream } from "../../types";
interface AddressFromResponse {
    port: string;
    ip: string;
    flags?: string;
}
declare type PreferredSlaves = ((slaves: AddressFromResponse[]) => AddressFromResponse | null) | Array<{
    port: string;
    ip: string;
    prio?: number;
}> | {
    port: string;
    ip: string;
    prio?: number;
};
export { SentinelAddress, SentinelIterator };
export interface SentinelConnectionOptions {
    /**
     * Master group name of the Sentinel
     */
    name?: string;
    /**
     * @default "master"
     */
    role?: "master" | "slave";
    tls?: ConnectionOptions;
    sentinelUsername?: string;
    sentinelPassword?: string;
    sentinels?: Array<Partial<SentinelAddress>>;
    sentinelRetryStrategy?: (retryAttempts: number) => number | void | null;
    sentinelReconnectStrategy?: (retryAttempts: number) => number | void | null;
    preferredSlaves?: PreferredSlaves;
    connectTimeout?: number;
    disconnectTimeout?: number;
    sentinelCommandTimeout?: number;
    enableTLSForSentinelMode?: boolean;
    sentinelTLS?: ConnectionOptions;
    natMap?: NatMap;
    updateSentinels?: boolean;
    /**
     * @default 10
     */
    sentinelMaxConnections?: number;
    failoverDetector?: boolean;
}
export default class SentinelConnector extends AbstractConnector {
    protected options: SentinelConnectionOptions;
    emitter: EventEmitter | null;
    protected sentinelIterator: SentinelIterator;
    private retryAttempts;
    private failoverDetector;
    constructor(options: SentinelConnectionOptions);
    check(info: {
        role?: string;
    }): boolean;
    disconnect(): void;
    connect(eventEmitter: ErrorEmitter): Promise<NetStream>;
    private updateSentinels;
    private resolveMaster;
    private resolveSlave;
    private sentinelNatResolve;
    private connectToSentinel;
    private resolve;
    private initFailoverDetector;
}
