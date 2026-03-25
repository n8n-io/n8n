import { ChannelCredentials } from './channel-credentials';
import { Metadata } from './metadata';
import { ChannelOptions } from './channel-options';
import { ConnectivityState } from './connectivity-state';
import { GrpcUri } from './uri-parser';
import { SubchannelAddress } from './subchannel-address';
import { SubchannelRef } from './channelz';
import { ConnectivityStateListener, SubchannelInterface } from './subchannel-interface';
import { SubchannelCallInterceptingListener } from './subchannel-call';
import { SubchannelCall } from './subchannel-call';
import { SubchannelConnector } from './transport';
import { CallCredentials } from './call-credentials';
export declare class Subchannel implements SubchannelInterface {
    private channelTarget;
    private subchannelAddress;
    private options;
    private connector;
    /**
     * The subchannel's current connectivity state. Invariant: `session` === `null`
     * if and only if `connectivityState` is IDLE or TRANSIENT_FAILURE.
     */
    private connectivityState;
    /**
     * The underlying http2 session used to make requests.
     */
    private transport;
    /**
     * Indicates that the subchannel should transition from TRANSIENT_FAILURE to
     * CONNECTING instead of IDLE when the backoff timeout ends.
     */
    private continueConnecting;
    /**
     * A list of listener functions that will be called whenever the connectivity
     * state changes. Will be modified by `addConnectivityStateListener` and
     * `removeConnectivityStateListener`
     */
    private stateListeners;
    private backoffTimeout;
    private keepaliveTime;
    /**
     * Tracks channels and subchannel pools with references to this subchannel
     */
    private refcount;
    /**
     * A string representation of the subchannel address, for logging/tracing
     */
    private subchannelAddressString;
    private readonly channelzEnabled;
    private channelzRef;
    private channelzTrace;
    private callTracker;
    private childrenTracker;
    private streamTracker;
    private secureConnector;
    /**
     * A class representing a connection to a single backend.
     * @param channelTarget The target string for the channel as a whole
     * @param subchannelAddress The address for the backend that this subchannel
     *     will connect to
     * @param options The channel options, plus any specific subchannel options
     *     for this subchannel
     * @param credentials The channel credentials used to establish this
     *     connection
     */
    constructor(channelTarget: GrpcUri, subchannelAddress: SubchannelAddress, options: ChannelOptions, credentials: ChannelCredentials, connector: SubchannelConnector);
    private getChannelzInfo;
    private trace;
    private refTrace;
    private handleBackoffTimer;
    /**
     * Start a backoff timer with the current nextBackoff timeout
     */
    private startBackoff;
    private stopBackoff;
    private startConnectingInternal;
    /**
     * Initiate a state transition from any element of oldStates to the new
     * state. If the current connectivityState is not in oldStates, do nothing.
     * @param oldStates The set of states to transition from
     * @param newState The state to transition to
     * @returns True if the state changed, false otherwise
     */
    private transitionToState;
    ref(): void;
    unref(): void;
    unrefIfOneRef(): boolean;
    createCall(metadata: Metadata, host: string, method: string, listener: SubchannelCallInterceptingListener): SubchannelCall;
    /**
     * If the subchannel is currently IDLE, start connecting and switch to the
     * CONNECTING state. If the subchannel is current in TRANSIENT_FAILURE,
     * the next time it would transition to IDLE, start connecting again instead.
     * Otherwise, do nothing.
     */
    startConnecting(): void;
    /**
     * Get the subchannel's current connectivity state.
     */
    getConnectivityState(): ConnectivityState;
    /**
     * Add a listener function to be called whenever the subchannel's
     * connectivity state changes.
     * @param listener
     */
    addConnectivityStateListener(listener: ConnectivityStateListener): void;
    /**
     * Remove a listener previously added with `addConnectivityStateListener`
     * @param listener A reference to a function previously passed to
     *     `addConnectivityStateListener`
     */
    removeConnectivityStateListener(listener: ConnectivityStateListener): void;
    /**
     * Reset the backoff timeout, and immediately start connecting if in backoff.
     */
    resetBackoff(): void;
    getAddress(): string;
    getChannelzRef(): SubchannelRef;
    isHealthy(): boolean;
    addHealthStateWatcher(listener: (healthy: boolean) => void): void;
    removeHealthStateWatcher(listener: (healthy: boolean) => void): void;
    getRealSubchannel(): this;
    realSubchannelEquals(other: SubchannelInterface): boolean;
    throttleKeepalive(newKeepaliveTime: number): void;
    getCallCredentials(): CallCredentials;
}
