import { MeterProvider as IMeterProvider, Meter as IMeter, MeterOptions } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { IMetricReader } from './export/MetricReader';
import { ForceFlushOptions, ShutdownOptions } from './types';
import { ViewOptions } from './view/View';
/**
 * MeterProviderOptions provides an interface for configuring a MeterProvider.
 */
export interface MeterProviderOptions {
    /** Resource associated with metric telemetry  */
    resource?: Resource;
    views?: ViewOptions[];
    readers?: IMetricReader[];
}
/**
 * This class implements the {@link MeterProvider} interface.
 */
export declare class MeterProvider implements IMeterProvider {
    private _sharedState;
    private _shutdown;
    constructor(options?: MeterProviderOptions);
    /**
     * Get a meter with the configuration of the MeterProvider.
     */
    getMeter(name: string, version?: string, options?: MeterOptions): IMeter;
    /**
     * Shut down the MeterProvider and all registered
     * MetricReaders.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    shutdown(options?: ShutdownOptions): Promise<void>;
    /**
     * Notifies all registered MetricReaders to flush any buffered data.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    forceFlush(options?: ForceFlushOptions): Promise<void>;
}
//# sourceMappingURL=MeterProvider.d.ts.map