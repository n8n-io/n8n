import { TypedLoadBalancingConfig } from './load-balancer';
export declare class WeightedRoundRobinLoadBalancingConfig implements TypedLoadBalancingConfig {
    private readonly enableOobLoadReport;
    private readonly oobLoadReportingPeriodMs;
    private readonly blackoutPeriodMs;
    private readonly weightExpirationPeriodMs;
    private readonly weightUpdatePeriodMs;
    private readonly errorUtilizationPenalty;
    constructor(enableOobLoadReport: boolean | null, oobLoadReportingPeriodMs: number | null, blackoutPeriodMs: number | null, weightExpirationPeriodMs: number | null, weightUpdatePeriodMs: number | null, errorUtilizationPenalty: number | null);
    getLoadBalancerName(): string;
    toJsonObject(): object;
    static createFromJson(obj: any): WeightedRoundRobinLoadBalancingConfig;
    getEnableOobLoadReport(): boolean;
    getOobLoadReportingPeriodMs(): number;
    getBlackoutPeriodMs(): number;
    getWeightExpirationPeriodMs(): number;
    getWeightUpdatePeriodMs(): number;
    getErrorUtilizationPenalty(): number;
}
export declare function setup(): void;
