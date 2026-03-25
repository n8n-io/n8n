import { LoadBalancer, ChannelControlHelper, TypedLoadBalancingConfig } from './load-balancer';
import { Endpoint } from './subchannel-address';
import { ChannelOptions } from './channel-options';
export declare class RoundRobinLoadBalancer implements LoadBalancer {
    private readonly channelControlHelper;
    private children;
    private currentState;
    private currentReadyPicker;
    private updatesPaused;
    private childChannelControlHelper;
    private lastError;
    constructor(channelControlHelper: ChannelControlHelper);
    private countChildrenWithState;
    private calculateAndUpdateState;
    private updateState;
    private resetSubchannelList;
    updateAddressList(endpointList: Endpoint[], lbConfig: TypedLoadBalancingConfig, options: ChannelOptions): void;
    exitIdle(): void;
    resetBackoff(): void;
    destroy(): void;
    getTypeName(): string;
}
export declare function setup(): void;
