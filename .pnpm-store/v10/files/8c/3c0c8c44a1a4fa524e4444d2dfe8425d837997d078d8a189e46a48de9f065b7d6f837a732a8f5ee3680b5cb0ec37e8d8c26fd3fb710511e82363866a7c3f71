import { Context, Attributes } from '@opentelemetry/api';
/**
 * The {@link AttributesProcessor} is responsible for customizing which
 * attribute(s) are to be reported as metrics dimension(s) and adding
 * additional dimension(s) from the {@link Context}.
 */
export interface IAttributesProcessor {
    /**
     * Process the metric instrument attributes.
     *
     * @param incoming The metric instrument attributes.
     * @param context The active context when the instrument is synchronous.
     * `undefined` otherwise.
     */
    process: (incoming: Attributes, context?: Context) => Attributes;
}
/**
 * @internal
 *
 * Create an {@link IAttributesProcessor} that acts as a simple pass-through for attributes.
 */
export declare function createNoopAttributesProcessor(): IAttributesProcessor;
/**
 * @internal
 *
 * Create an {@link IAttributesProcessor} that applies all processors from the provided list in order.
 *
 * @param processors Processors to apply in order.
 */
export declare function createMultiAttributesProcessor(processors: IAttributesProcessor[]): IAttributesProcessor;
/**
 * Create an {@link IAttributesProcessor} that filters by allowed attribute names and drops any names that are not in the
 * allow list.
 */
export declare function createAllowListAttributesProcessor(attributeAllowList: string[]): IAttributesProcessor;
/**
 * Create an {@link IAttributesProcessor} that drops attributes based on the names provided in the deny list
 */
export declare function createDenyListAttributesProcessor(attributeDenyList: string[]): IAttributesProcessor;
//# sourceMappingURL=AttributesProcessor.d.ts.map