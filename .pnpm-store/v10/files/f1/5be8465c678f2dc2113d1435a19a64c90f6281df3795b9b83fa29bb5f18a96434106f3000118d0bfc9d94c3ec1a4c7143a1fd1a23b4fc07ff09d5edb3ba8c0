import { DeserializeMiddleware, RelativeMiddlewareOptions } from "@smithy/types";
import { PreviouslyResolved } from "./configuration";
/**
 * @internal
 */
export interface FlexibleChecksumsResponseMiddlewareConfig {
    /**
     * Defines a top-level operation input member used to opt-in to best-effort validation
     * of a checksum returned in the HTTP response of the operation.
     */
    requestValidationModeMember?: string;
    /**
     * Defines the checksum algorithms clients SHOULD look for when validating checksums
     * returned in the HTTP response.
     */
    responseAlgorithms?: string[];
}
/**
 * @internal
 */
export declare const flexibleChecksumsResponseMiddlewareOptions: RelativeMiddlewareOptions;
/**
 * @internal
 *
 * The validation counterpart to the flexibleChecksumsMiddleware.
 */
export declare const flexibleChecksumsResponseMiddleware: (config: PreviouslyResolved, middlewareConfig: FlexibleChecksumsResponseMiddlewareConfig) => DeserializeMiddleware<any, any>;
