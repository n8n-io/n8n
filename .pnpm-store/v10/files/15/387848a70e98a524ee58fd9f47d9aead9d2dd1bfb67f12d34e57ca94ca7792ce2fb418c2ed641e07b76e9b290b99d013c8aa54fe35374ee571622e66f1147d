import { Pluggable } from "@smithy/types";
import { PreviouslyResolved } from "./configuration";
import { FlexibleChecksumsInputMiddlewareConfig } from "./flexibleChecksumsInputMiddleware";
import { FlexibleChecksumsRequestMiddlewareConfig } from "./flexibleChecksumsMiddleware";
import { FlexibleChecksumsResponseMiddlewareConfig } from "./flexibleChecksumsResponseMiddleware";
/**
 * @internal
 */
export interface FlexibleChecksumsMiddlewareConfig extends FlexibleChecksumsRequestMiddlewareConfig, FlexibleChecksumsInputMiddlewareConfig, FlexibleChecksumsResponseMiddlewareConfig {
}
/**
 * @internal
 */
export declare const getFlexibleChecksumsPlugin: (config: PreviouslyResolved, middlewareConfig: FlexibleChecksumsMiddlewareConfig) => Pluggable<any, any>;
