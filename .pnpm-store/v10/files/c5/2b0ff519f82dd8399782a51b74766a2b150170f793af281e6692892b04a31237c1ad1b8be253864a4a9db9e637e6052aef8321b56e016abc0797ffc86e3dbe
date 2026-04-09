import { MetricOptions, ValueType } from '@opentelemetry/api';
import { View } from './view/View';
/**
 * Supported types of metric instruments.
 */
export declare enum InstrumentType {
    COUNTER = "COUNTER",
    GAUGE = "GAUGE",
    HISTOGRAM = "HISTOGRAM",
    UP_DOWN_COUNTER = "UP_DOWN_COUNTER",
    OBSERVABLE_COUNTER = "OBSERVABLE_COUNTER",
    OBSERVABLE_GAUGE = "OBSERVABLE_GAUGE",
    OBSERVABLE_UP_DOWN_COUNTER = "OBSERVABLE_UP_DOWN_COUNTER"
}
/**
 * An internal interface describing the instrument.
 *
 * This is intentionally distinguished from the public MetricDescriptor (a.k.a. InstrumentDescriptor)
 * which may not contains internal fields like metric advice.
 */
export interface InstrumentDescriptor {
    readonly name: string;
    readonly description: string;
    readonly unit: string;
    readonly type: InstrumentType;
    readonly valueType: ValueType;
    /**
     * @experimental
     *
     * This is intentionally not using the API's type as it's only available from @opentelemetry/api 1.7.0 and up.
     * In SDK 2.0 we'll be able to bump the minimum API version and remove this workaround.
     */
    readonly advice: {
        /**
         * Hint the explicit bucket boundaries for SDK if the metric has been
         * aggregated with a HistogramAggregator.
         */
        explicitBucketBoundaries?: number[];
    };
}
export declare function createInstrumentDescriptor(name: string, type: InstrumentType, options?: MetricOptions): InstrumentDescriptor;
export declare function createInstrumentDescriptorWithView(view: View, instrument: InstrumentDescriptor): InstrumentDescriptor;
export declare function isDescriptorCompatibleWith(descriptor: InstrumentDescriptor, otherDescriptor: InstrumentDescriptor): boolean;
export declare function isValidName(name: string): boolean;
//# sourceMappingURL=InstrumentDescriptor.d.ts.map