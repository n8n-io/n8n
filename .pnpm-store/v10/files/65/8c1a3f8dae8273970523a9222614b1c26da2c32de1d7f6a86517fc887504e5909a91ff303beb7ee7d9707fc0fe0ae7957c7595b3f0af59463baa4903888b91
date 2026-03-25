import { Span } from '@opentelemetry/api';
import { InstrumentationConfig } from '@opentelemetry/instrumentation';
import { ExpressLayerType } from './enums/ExpressLayerType';
export type LayerPathSegment = string | RegExp | number;
export type IgnoreMatcher = string | RegExp | ((name: string) => boolean);
export type ExpressRequestInfo<T = any> = {
    /** An express request object */
    request: T;
    route: string;
    layerType: ExpressLayerType;
};
export type SpanNameHook = (info: ExpressRequestInfo, 
/**
 * If no decision is taken based on RequestInfo, the default name
 * supplied by the instrumentation can be used instead.
 */
defaultName: string) => string;
/**
 * Function that can be used to add custom attributes to the current span or the root span on
 * a Express request
 * @param span - The Express middleware layer span.
 * @param info - An instance of ExpressRequestInfo that contains info about the request such as the route, and the layer type.
 */
export interface ExpressRequestCustomAttributeFunction {
    (span: Span, info: ExpressRequestInfo): void;
}
/**
 * Options available for the Express Instrumentation (see [documentation](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-express#express-instrumentation-options))
 */
export interface ExpressInstrumentationConfig extends InstrumentationConfig {
    /** Ignore specific based on their name */
    ignoreLayers?: IgnoreMatcher[];
    /** Ignore specific layers based on their type */
    ignoreLayersType?: ExpressLayerType[];
    spanNameHook?: SpanNameHook;
    /** Function for adding custom attributes on Express request */
    requestHook?: ExpressRequestCustomAttributeFunction;
}
//# sourceMappingURL=types.d.ts.map