import { HandlerExecutionContext, SmithyFeatures } from "@smithy/types";
/**
 * @internal
 * Indicates to the request context that a given feature is active.
 *
 * @param context - handler execution context.
 * @param feature - readable name of feature.
 * @param value - encoding value of feature. This is required because the
 * specification asks the library not to include a runtime lookup of all
 * the feature identifiers.
 */
export declare function setFeature<F extends keyof SmithyFeatures>(context: HandlerExecutionContext, feature: F, value: SmithyFeatures[F]): void;
