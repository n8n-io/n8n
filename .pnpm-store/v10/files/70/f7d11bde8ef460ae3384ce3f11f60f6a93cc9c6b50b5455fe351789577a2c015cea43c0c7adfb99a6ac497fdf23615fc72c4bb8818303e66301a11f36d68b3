import { ChannelOptions } from './channel-options';
import { Endpoint, SubchannelAddress } from './subchannel-address';
import { ConnectivityState } from './connectivity-state';
import { Picker } from './picker';
import type { ChannelRef, SubchannelRef } from './channelz';
import { SubchannelInterface } from './subchannel-interface';
import { LoadBalancingConfig } from './service-config';
import { StatusOr } from './call-interface';
/**
 * A collection of functions associated with a channel that a load balancer
 * can call as necessary.
 */
export interface ChannelControlHelper {
    /**
     * Returns a subchannel connected to the specified address.
     * @param subchannelAddress The address to connect to
     * @param subchannelArgs Channel arguments to use to construct the subchannel
     */
    createSubchannel(subchannelAddress: SubchannelAddress, subchannelArgs: ChannelOptions): SubchannelInterface;
    /**
     * Passes a new subchannel picker up to the channel. This is called if either
     * the connectivity state changes or if a different picker is needed for any
     * other reason.
     * @param connectivityState New connectivity state
     * @param picker New picker
     */
    updateState(connectivityState: ConnectivityState, picker: Picker, errorMessage: string | null): void;
    /**
     * Request new data from the resolver.
     */
    requestReresolution(): void;
    addChannelzChild(child: ChannelRef | SubchannelRef): void;
    removeChannelzChild(child: ChannelRef | SubchannelRef): void;
}
/**
 * Create a child ChannelControlHelper that overrides some methods of the
 * parent while letting others pass through to the parent unmodified. This
 * allows other code to create these children without needing to know about
 * all of the methods to be passed through.
 * @param parent
 * @param overrides
 */
export declare function createChildChannelControlHelper(parent: ChannelControlHelper, overrides: Partial<ChannelControlHelper>): ChannelControlHelper;
/**
 * Tracks one or more connected subchannels and determines which subchannel
 * each request should use.
 */
export interface LoadBalancer {
    /**
     * Gives the load balancer a new list of addresses to start connecting to.
     * The load balancer will start establishing connections with the new list,
     * but will continue using any existing connections until the new connections
     * are established
     * @param endpointList The new list of addresses to connect to
     * @param lbConfig The load balancing config object from the service config,
     *     if one was provided
     * @param channelOptions Channel options from the channel, plus resolver
     *     attributes
     * @param resolutionNote A not from the resolver to include in errors
     */
    updateAddressList(endpointList: StatusOr<Endpoint[]>, lbConfig: TypedLoadBalancingConfig, channelOptions: ChannelOptions, resolutionNote: string): boolean;
    /**
     * If the load balancer is currently in the IDLE state, start connecting.
     */
    exitIdle(): void;
    /**
     * If the load balancer is currently in the CONNECTING or TRANSIENT_FAILURE
     * state, reset the current connection backoff timeout to its base value and
     * transition to CONNECTING if in TRANSIENT_FAILURE.
     */
    resetBackoff(): void;
    /**
     * The load balancer unrefs all of its subchannels and stops calling methods
     * of its channel control helper.
     */
    destroy(): void;
    /**
     * Get the type name for this load balancer type. Must be constant across an
     * entire load balancer implementation class and must match the name that the
     * balancer implementation class was registered with.
     */
    getTypeName(): string;
}
export interface LoadBalancerConstructor {
    new (channelControlHelper: ChannelControlHelper): LoadBalancer;
}
export interface TypedLoadBalancingConfig {
    getLoadBalancerName(): string;
    toJsonObject(): object;
}
export interface TypedLoadBalancingConfigConstructor {
    new (...args: any): TypedLoadBalancingConfig;
    createFromJson(obj: any): TypedLoadBalancingConfig;
}
export declare function registerLoadBalancerType(typeName: string, loadBalancerType: LoadBalancerConstructor, loadBalancingConfigType: TypedLoadBalancingConfigConstructor): void;
export declare function registerDefaultLoadBalancerType(typeName: string): void;
export declare function createLoadBalancer(config: TypedLoadBalancingConfig, channelControlHelper: ChannelControlHelper): LoadBalancer | null;
export declare function isLoadBalancerNameRegistered(typeName: string): boolean;
export declare function parseLoadBalancingConfig(rawConfig: LoadBalancingConfig): TypedLoadBalancingConfig;
export declare function getDefaultConfig(): TypedLoadBalancingConfig;
export declare function selectLbConfigFromList(configs: LoadBalancingConfig[], fallbackTodefault?: boolean): TypedLoadBalancingConfig | null;
