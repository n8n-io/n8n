import { LoadBalancer, ChannelControlHelper, TypedLoadBalancingConfig } from './load-balancer';
import { ConnectivityState } from './connectivity-state';
import { Picker } from './picker';
import { Endpoint } from './subchannel-address';
import { ChannelOptions } from './channel-options';
import { StatusOr } from './call-interface';
export declare class PickFirstLoadBalancingConfig implements TypedLoadBalancingConfig {
    private readonly shuffleAddressList;
    constructor(shuffleAddressList: boolean);
    getLoadBalancerName(): string;
    toJsonObject(): object;
    getShuffleAddressList(): boolean;
    static createFromJson(obj: any): PickFirstLoadBalancingConfig;
}
/**
 * Return a new array with the elements of the input array in a random order
 * @param list The input array
 * @returns A shuffled array of the elements of list
 */
export declare function shuffled<T>(list: T[]): T[];
export declare class PickFirstLoadBalancer implements LoadBalancer {
    private readonly channelControlHelper;
    /**
     * The list of subchannels this load balancer is currently attempting to
     * connect to.
     */
    private children;
    /**
     * The current connectivity state of the load balancer.
     */
    private currentState;
    /**
     * The index within the `subchannels` array of the subchannel with the most
     * recently started connection attempt.
     */
    private currentSubchannelIndex;
    /**
     * The currently picked subchannel used for making calls. Populated if
     * and only if the load balancer's current state is READY. In that case,
     * the subchannel's current state is also READY.
     */
    private currentPick;
    /**
     * Listener callback attached to each subchannel in the `subchannels` list
     * while establishing a connection.
     */
    private subchannelStateListener;
    private pickedSubchannelHealthListener;
    /**
     * Timer reference for the timer tracking when to start
     */
    private connectionDelayTimeout;
    /**
     * The LB policy enters sticky TRANSIENT_FAILURE mode when all
     * subchannels have failed to connect at least once, and it stays in that
     * mode until a connection attempt is successful. While in sticky TF mode,
     * the LB policy continuously attempts to connect to all of its subchannels.
     */
    private stickyTransientFailureMode;
    private reportHealthStatus;
    /**
     * The most recent error reported by any subchannel as it transitioned to
     * TRANSIENT_FAILURE.
     */
    private lastError;
    private latestAddressList;
    private latestOptions;
    private latestResolutionNote;
    /**
     * Load balancer that attempts to connect to each backend in the address list
     * in order, and picks the first one that connects, using it for every
     * request.
     * @param channelControlHelper `ChannelControlHelper` instance provided by
     *     this load balancer's owner.
     */
    constructor(channelControlHelper: ChannelControlHelper);
    private allChildrenHaveReportedTF;
    private resetChildrenReportedTF;
    private calculateAndReportNewState;
    private requestReresolution;
    private maybeEnterStickyTransientFailureMode;
    private removeCurrentPick;
    private onSubchannelStateUpdate;
    private startNextSubchannelConnecting;
    /**
     * Have a single subchannel in the `subchannels` list start connecting.
     * @param subchannelIndex The index into the `subchannels` list.
     */
    private startConnecting;
    /**
     * Declare that the specified subchannel should be used to make requests.
     * This functions the same independent of whether subchannel is a member of
     * this.children and whether it is equal to this.currentPick.
     * Prerequisite: subchannel.getConnectivityState() === READY.
     * @param subchannel
     */
    private pickSubchannel;
    private updateState;
    private resetSubchannelList;
    private connectToAddressList;
    updateAddressList(maybeEndpointList: StatusOr<Endpoint[]>, lbConfig: TypedLoadBalancingConfig, options: ChannelOptions, resolutionNote: string): boolean;
    exitIdle(): void;
    resetBackoff(): void;
    destroy(): void;
    getTypeName(): string;
}
/**
 * This class handles the leaf load balancing operations for a single endpoint.
 * It is a thin wrapper around a PickFirstLoadBalancer with a different API
 * that more closely reflects how it will be used as a leaf balancer.
 */
export declare class LeafLoadBalancer {
    private endpoint;
    private options;
    private resolutionNote;
    private pickFirstBalancer;
    private latestState;
    private latestPicker;
    constructor(endpoint: Endpoint, channelControlHelper: ChannelControlHelper, options: ChannelOptions, resolutionNote: string);
    startConnecting(): void;
    /**
     * Update the endpoint associated with this LeafLoadBalancer to a new
     * endpoint. Does not trigger connection establishment if a connection
     * attempt is not already in progress.
     * @param newEndpoint
     */
    updateEndpoint(newEndpoint: Endpoint, newOptions: ChannelOptions): void;
    getConnectivityState(): ConnectivityState;
    getPicker(): Picker;
    getEndpoint(): Endpoint;
    exitIdle(): void;
    destroy(): void;
}
export declare function setup(): void;
