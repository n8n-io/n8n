import { RelativeMiddlewareOptions, SerializeMiddleware } from "@smithy/types";
import { PreviouslyResolved } from "./configuration";
/**
 * @internal
 */
export interface FlexibleChecksumsInputMiddlewareConfig {
    /**
     * Defines a top-level operation input member used to opt-in to best-effort validation
     * of a checksum returned in the HTTP response of the operation.
     */
    requestValidationModeMember?: string;
}
/**
 * @internal
 */
export declare const flexibleChecksumsInputMiddlewareOptions: RelativeMiddlewareOptions;
/**
 * @internal
 *
 * The input counterpart to the flexibleChecksumsMiddleware.
 */
export declare const flexibleChecksumsInputMiddleware: (config: PreviouslyResolved, middlewareConfig: FlexibleChecksumsInputMiddlewareConfig) => SerializeMiddleware<any, any>;
