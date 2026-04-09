import { CallCredentials } from './call-credentials';
import { Channel } from './channel';
import type { SubchannelRef } from './channelz';
import { ConnectivityState } from './connectivity-state';
import { Subchannel } from './subchannel';
export type ConnectivityStateListener = (subchannel: SubchannelInterface, previousState: ConnectivityState, newState: ConnectivityState, keepaliveTime: number, errorMessage?: string) => void;
export type HealthListener = (healthy: boolean) => void;
export interface DataWatcher {
    setSubchannel(subchannel: Subchannel): void;
    destroy(): void;
}
/**
 * This is an interface for load balancing policies to use to interact with
 * subchannels. This allows load balancing policies to wrap and unwrap
 * subchannels.
 *
 * Any load balancing policy that wraps subchannels must unwrap the subchannel
 * in the picker, so that other load balancing policies consistently have
 * access to their own wrapper objects.
 */
export interface SubchannelInterface {
    getConnectivityState(): ConnectivityState;
    addConnectivityStateListener(listener: ConnectivityStateListener): void;
    removeConnectivityStateListener(listener: ConnectivityStateListener): void;
    startConnecting(): void;
    getAddress(): string;
    throttleKeepalive(newKeepaliveTime: number): void;
    ref(): void;
    unref(): void;
    getChannelzRef(): SubchannelRef;
    isHealthy(): boolean;
    addHealthStateWatcher(listener: HealthListener): void;
    removeHealthStateWatcher(listener: HealthListener): void;
    addDataWatcher(dataWatcher: DataWatcher): void;
    /**
     * If this is a wrapper, return the wrapped subchannel, otherwise return this
     */
    getRealSubchannel(): Subchannel;
    /**
     * Returns true if this and other both proxy the same underlying subchannel.
     * Can be used instead of directly accessing getRealSubchannel to allow mocks
     * to avoid implementing getRealSubchannel
     */
    realSubchannelEquals(other: SubchannelInterface): boolean;
    /**
     * Get the call credentials associated with the channel credentials for this
     * subchannel.
     */
    getCallCredentials(): CallCredentials;
    /**
     * Get a channel that can be used to make requests with just this
     */
    getChannel(): Channel;
}
export declare abstract class BaseSubchannelWrapper implements SubchannelInterface {
    protected child: SubchannelInterface;
    private healthy;
    private healthListeners;
    private refcount;
    private dataWatchers;
    constructor(child: SubchannelInterface);
    private updateHealthListeners;
    getConnectivityState(): ConnectivityState;
    addConnectivityStateListener(listener: ConnectivityStateListener): void;
    removeConnectivityStateListener(listener: ConnectivityStateListener): void;
    startConnecting(): void;
    getAddress(): string;
    throttleKeepalive(newKeepaliveTime: number): void;
    ref(): void;
    unref(): void;
    protected destroy(): void;
    getChannelzRef(): SubchannelRef;
    isHealthy(): boolean;
    addHealthStateWatcher(listener: HealthListener): void;
    removeHealthStateWatcher(listener: HealthListener): void;
    addDataWatcher(dataWatcher: DataWatcher): void;
    protected setHealthy(healthy: boolean): void;
    getRealSubchannel(): Subchannel;
    realSubchannelEquals(other: SubchannelInterface): boolean;
    getCallCredentials(): CallCredentials;
    getChannel(): Channel;
}
