import { ChannelOptions } from './channel-options';
import { Duration } from './duration';
import { ChannelControlHelper } from './experimental';
import { LoadBalancer, TypedLoadBalancingConfig } from './load-balancer';
import { Endpoint } from './subchannel-address';
import { LoadBalancingConfig } from './service-config';
export interface SuccessRateEjectionConfig {
    readonly stdev_factor: number;
    readonly enforcement_percentage: number;
    readonly minimum_hosts: number;
    readonly request_volume: number;
}
export interface FailurePercentageEjectionConfig {
    readonly threshold: number;
    readonly enforcement_percentage: number;
    readonly minimum_hosts: number;
    readonly request_volume: number;
}
export interface OutlierDetectionRawConfig {
    interval?: Duration;
    base_ejection_time?: Duration;
    max_ejection_time?: Duration;
    max_ejection_percent?: number;
    success_rate_ejection?: Partial<SuccessRateEjectionConfig>;
    failure_percentage_ejection?: Partial<FailurePercentageEjectionConfig>;
    child_policy: LoadBalancingConfig[];
}
export declare class OutlierDetectionLoadBalancingConfig implements TypedLoadBalancingConfig {
    private readonly childPolicy;
    private readonly intervalMs;
    private readonly baseEjectionTimeMs;
    private readonly maxEjectionTimeMs;
    private readonly maxEjectionPercent;
    private readonly successRateEjection;
    private readonly failurePercentageEjection;
    constructor(intervalMs: number | null, baseEjectionTimeMs: number | null, maxEjectionTimeMs: number | null, maxEjectionPercent: number | null, successRateEjection: Partial<SuccessRateEjectionConfig> | null, failurePercentageEjection: Partial<FailurePercentageEjectionConfig> | null, childPolicy: TypedLoadBalancingConfig);
    getLoadBalancerName(): string;
    toJsonObject(): object;
    getIntervalMs(): number;
    getBaseEjectionTimeMs(): number;
    getMaxEjectionTimeMs(): number;
    getMaxEjectionPercent(): number;
    getSuccessRateEjectionConfig(): SuccessRateEjectionConfig | null;
    getFailurePercentageEjectionConfig(): FailurePercentageEjectionConfig | null;
    getChildPolicy(): TypedLoadBalancingConfig;
    static createFromJson(obj: any): OutlierDetectionLoadBalancingConfig;
}
export declare class OutlierDetectionLoadBalancer implements LoadBalancer {
    private childBalancer;
    private entryMap;
    private latestConfig;
    private ejectionTimer;
    private timerStartTime;
    constructor(channelControlHelper: ChannelControlHelper);
    private isCountingEnabled;
    private getCurrentEjectionPercent;
    private runSuccessRateCheck;
    private runFailurePercentageCheck;
    private eject;
    private uneject;
    private switchAllBuckets;
    private startTimer;
    private runChecks;
    updateAddressList(endpointList: Endpoint[], lbConfig: TypedLoadBalancingConfig, options: ChannelOptions): void;
    exitIdle(): void;
    resetBackoff(): void;
    destroy(): void;
    getTypeName(): string;
}
export declare function setup(): void;
