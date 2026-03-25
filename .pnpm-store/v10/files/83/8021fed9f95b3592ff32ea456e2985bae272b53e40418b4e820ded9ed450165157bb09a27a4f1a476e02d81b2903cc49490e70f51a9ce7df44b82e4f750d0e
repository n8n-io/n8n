import { Context, TextMapGetter, TextMapPropagator, TextMapSetter } from '@opentelemetry/api';
import { B3PropagatorConfig } from './types';
/**
 * Propagator that extracts B3 context in both single and multi-header variants,
 * with configurable injection format defaulting to B3 single-header. Due to
 * the asymmetry in injection and extraction formats this is not suitable to
 * be implemented as a composite propagator.
 * Based on: https://github.com/openzipkin/b3-propagation
 */
export declare class B3Propagator implements TextMapPropagator {
    private readonly _b3MultiPropagator;
    private readonly _b3SinglePropagator;
    private readonly _inject;
    readonly _fields: string[];
    constructor(config?: B3PropagatorConfig);
    inject(context: Context, carrier: unknown, setter: TextMapSetter): void;
    extract(context: Context, carrier: unknown, getter: TextMapGetter): Context;
    fields(): string[];
}
//# sourceMappingURL=B3Propagator.d.ts.map