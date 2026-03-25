import { MetricAdvice, MetricOptions } from '@opentelemetry/api';
import { View } from './view/View';
import { InstrumentType, MetricDescriptor } from './export/MetricData';
/**
 * An internal interface describing the instrument.
 *
 * This is intentionally distinguished from the public MetricDescriptor (a.k.a. InstrumentDescriptor)
 * which may not contains internal fields like metric advice.
 */
export interface InstrumentDescriptor extends MetricDescriptor {
    /**
     * For internal use; exporter should avoid depending on the type of the
     * instrument as their resulting aggregator can be re-mapped with views.
     */
    readonly type: InstrumentType;
    /**
     * See {@link MetricAdvice}
     *
     * @experimental
     */
    readonly advice: MetricAdvice;
}
export declare function createInstrumentDescriptor(name: string, type: InstrumentType, options?: MetricOptions): InstrumentDescriptor;
export declare function createInstrumentDescriptorWithView(view: View, instrument: InstrumentDescriptor): InstrumentDescriptor;
export declare function isDescriptorCompatibleWith(descriptor: InstrumentDescriptor, otherDescriptor: InstrumentDescriptor): boolean;
export declare function isValidName(name: string): boolean;
//# sourceMappingURL=InstrumentDescriptor.d.ts.map