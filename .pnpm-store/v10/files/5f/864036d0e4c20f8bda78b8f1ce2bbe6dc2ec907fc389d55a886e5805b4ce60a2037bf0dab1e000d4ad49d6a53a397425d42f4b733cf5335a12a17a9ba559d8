import { ChannelControlHelper, LoadBalancer, TypedLoadBalancingConfig } from './load-balancer';
import { ServiceConfig } from './service-config';
import { ConfigSelector } from './resolver';
import { StatusObject } from './call-interface';
import { Endpoint } from './subchannel-address';
import { GrpcUri } from './uri-parser';
import { ChannelOptions } from './channel-options';
export interface ResolutionCallback {
    (serviceConfig: ServiceConfig, configSelector: ConfigSelector): void;
}
export interface ResolutionFailureCallback {
    (status: StatusObject): void;
}
export declare class ResolvingLoadBalancer implements LoadBalancer {
    private readonly target;
    private readonly channelControlHelper;
    private readonly channelOptions;
    private readonly onSuccessfulResolution;
    private readonly onFailedResolution;
    /**
     * The resolver class constructed for the target address.
     */
    private readonly innerResolver;
    private readonly childLoadBalancer;
    private latestChildState;
    private latestChildPicker;
    private latestChildErrorMessage;
    /**
     * This resolving load balancer's current connectivity state.
     */
    private currentState;
    private readonly defaultServiceConfig;
    /**
     * The service config object from the last successful resolution, if
     * available. A value of null indicates that we have not yet received a valid
     * service config from the resolver.
     */
    private previousServiceConfig;
    /**
     * The backoff timer for handling name resolution failures.
     */
    private readonly backoffTimeout;
    /**
     * Indicates whether we should attempt to resolve again after the backoff
     * timer runs out.
     */
    private continueResolving;
    /**
     * Wrapper class that behaves like a `LoadBalancer` and also handles name
     * resolution internally.
     * @param target The address of the backend to connect to.
     * @param channelControlHelper `ChannelControlHelper` instance provided by
     *     this load balancer's owner.
     * @param defaultServiceConfig The default service configuration to be used
     *     if none is provided by the name resolver. A `null` value indicates
     *     that the default behavior should be the default unconfigured behavior.
     *     In practice, that means using the "pick first" load balancer
     *     implmentation
     */
    constructor(target: GrpcUri, channelControlHelper: ChannelControlHelper, channelOptions: ChannelOptions, onSuccessfulResolution: ResolutionCallback, onFailedResolution: ResolutionFailureCallback);
    private updateResolution;
    private updateState;
    private handleResolutionFailure;
    exitIdle(): void;
    updateAddressList(endpointList: Endpoint[], lbConfig: TypedLoadBalancingConfig | null): never;
    resetBackoff(): void;
    destroy(): void;
    getTypeName(): string;
}
