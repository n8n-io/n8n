import { Context, MetricAttributes } from '@opentelemetry/api';
export declare type CommonReaderOptions = {
    timeoutMillis?: number;
};
export declare type CollectionOptions = CommonReaderOptions;
export declare type ShutdownOptions = CommonReaderOptions;
export declare type ForceFlushOptions = CommonReaderOptions;
/**
 * This is intentionally not using the API's type as it's only available from @opentelemetry/api 1.9.0 and up.
 * In SDK 2.0 we'll be able to bump the minimum API version and remove this workaround.
 */
export interface Gauge<AttributesTypes extends MetricAttributes = MetricAttributes> {
    /**
     * Records a measurement. Value of the measurement must not be negative.
     */
    record(value: number, attributes?: AttributesTypes, context?: Context): void;
}
//# sourceMappingURL=types.d.ts.map