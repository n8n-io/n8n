import { OrcaLoadReport__Output } from "./generated/xds/data/orca/v3/OrcaLoadReport";
import { OpenRcaServiceClient } from "./generated/xds/service/orca/v3/OpenRcaService";
import { Server } from "./server";
import { Channel } from "./channel";
import { OnCallEnded } from "./picker";
import { BaseSubchannelWrapper, SubchannelInterface } from "./subchannel-interface";
/**
 * ORCA metrics recorder for a single request
 */
export declare class PerRequestMetricRecorder {
    private message;
    /**
     * Records a request cost metric measurement for the call.
     * @param name
     * @param value
     */
    recordRequestCostMetric(name: string, value: number): void;
    /**
     * Records a request cost metric measurement for the call.
     * @param name
     * @param value
     */
    recordUtilizationMetric(name: string, value: number): void;
    /**
     * Records an opaque named metric measurement for the call.
     * @param name
     * @param value
     */
    recordNamedMetric(name: string, value: number): void;
    /**
     * Records the CPU utilization metric measurement for the call.
     * @param value
     */
    recordCPUUtilizationMetric(value: number): void;
    /**
     * Records the memory utilization metric measurement for the call.
     * @param value
     */
    recordMemoryUtilizationMetric(value: number): void;
    /**
     * Records the memory utilization metric measurement for the call.
     * @param value
     */
    recordApplicationUtilizationMetric(value: number): void;
    /**
     * Records the queries per second measurement.
     * @param value
     */
    recordQpsMetric(value: number): void;
    /**
     * Records the errors per second measurement.
     * @param value
     */
    recordEpsMetric(value: number): void;
    serialize(): Buffer;
}
export declare class ServerMetricRecorder {
    private message;
    private serviceImplementation;
    putUtilizationMetric(name: string, value: number): void;
    setAllUtilizationMetrics(metrics: {
        [name: string]: number;
    }): void;
    deleteUtilizationMetric(name: string): void;
    setCpuUtilizationMetric(value: number): void;
    deleteCpuUtilizationMetric(): void;
    setApplicationUtilizationMetric(value: number): void;
    deleteApplicationUtilizationMetric(): void;
    setQpsMetric(value: number): void;
    deleteQpsMetric(): void;
    setEpsMetric(value: number): void;
    deleteEpsMetric(): void;
    addToServer(server: Server): void;
}
export declare function createOrcaClient(channel: Channel): OpenRcaServiceClient;
export type MetricsListener = (loadReport: OrcaLoadReport__Output) => void;
export declare const GRPC_METRICS_HEADER = "endpoint-load-metrics-bin";
/**
 * Create an onCallEnded callback for use in a picker.
 * @param listener The listener to handle metrics, whenever they are provided.
 * @param previousOnCallEnded The previous onCallEnded callback to propagate
 * to, if applicable.
 * @returns
 */
export declare function createMetricsReader(listener: MetricsListener, previousOnCallEnded: OnCallEnded | null): OnCallEnded;
export declare class OrcaOobMetricsSubchannelWrapper extends BaseSubchannelWrapper {
    constructor(child: SubchannelInterface, metricsListener: MetricsListener, intervalMs: number);
    getWrappedSubchannel(): SubchannelInterface;
}
