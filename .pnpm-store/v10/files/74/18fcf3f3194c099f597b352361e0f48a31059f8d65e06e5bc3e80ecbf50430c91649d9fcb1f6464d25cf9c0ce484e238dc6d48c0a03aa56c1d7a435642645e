import { Context, MetricAttributes } from '@opentelemetry/api';
/**
 * The {@link AttributesProcessor} is responsible for customizing which
 * attribute(s) are to be reported as metrics dimension(s) and adding
 * additional dimension(s) from the {@link Context}.
 */
export declare abstract class AttributesProcessor {
    /**
     * Process the metric instrument attributes.
     *
     * @param incoming The metric instrument attributes.
     * @param context The active context when the instrument is synchronous.
     * `undefined` otherwise.
     */
    abstract process(incoming: MetricAttributes, context?: Context): MetricAttributes;
    static Noop(): NoopAttributesProcessor;
}
export declare class NoopAttributesProcessor extends AttributesProcessor {
    process(incoming: MetricAttributes, _context?: Context): import("@opentelemetry/api").Attributes;
}
/**
 * {@link AttributesProcessor} that filters by allowed attribute names and drops any names that are not in the
 * allow list.
 */
export declare class FilteringAttributesProcessor extends AttributesProcessor {
    private _allowedAttributeNames;
    constructor(_allowedAttributeNames: string[]);
    process(incoming: MetricAttributes, _context: Context): MetricAttributes;
}
//# sourceMappingURL=AttributesProcessor.d.ts.map