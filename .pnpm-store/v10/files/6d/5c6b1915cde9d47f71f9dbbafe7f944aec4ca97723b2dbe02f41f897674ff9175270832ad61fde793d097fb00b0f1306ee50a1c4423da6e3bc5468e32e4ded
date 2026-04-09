import { ChannelControlHelper, TypedLoadBalancingConfig } from './load-balancer';
import { Endpoint } from './subchannel-address';
import { ChannelOptions } from './channel-options';
import { StatusOr } from './call-interface';
export declare class ChildLoadBalancerHandler {
    private readonly channelControlHelper;
    private currentChild;
    private pendingChild;
    private latestConfig;
    private ChildPolicyHelper;
    constructor(channelControlHelper: ChannelControlHelper);
    protected configUpdateRequiresNewPolicyInstance(oldConfig: TypedLoadBalancingConfig, newConfig: TypedLoadBalancingConfig): boolean;
    /**
     * Prerequisites: lbConfig !== null and lbConfig.name is registered
     * @param endpointList
     * @param lbConfig
     * @param attributes
     */
    updateAddressList(endpointList: StatusOr<Endpoint[]>, lbConfig: TypedLoadBalancingConfig, options: ChannelOptions, resolutionNote: string): boolean;
    exitIdle(): void;
    resetBackoff(): void;
    destroy(): void;
    getTypeName(): string;
}
