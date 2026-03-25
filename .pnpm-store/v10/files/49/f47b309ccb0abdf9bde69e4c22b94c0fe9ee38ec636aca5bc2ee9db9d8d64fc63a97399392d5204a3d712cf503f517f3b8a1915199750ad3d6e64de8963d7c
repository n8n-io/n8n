import { BuildHandlerOptions, BuildMiddleware } from "@smithy/types";
import { PreviouslyResolved } from "./configuration";
/**
 * @internal
 */
export interface FlexibleChecksumsRequestMiddlewareConfig {
    /**
     * Indicates an operation requires a checksum in its HTTP request.
     */
    requestChecksumRequired: boolean;
    /**
     * Member that is used to configure request checksum behavior.
     */
    requestAlgorithmMember?: {
        /**
         * Defines a top-level operation input member that is used to configure request checksum behavior.
         */
        name: string;
        /**
         * The {@link httpHeader} value, if present.
         * {@link https://smithy.io/2.0/spec/http-bindings.html#httpheader-trait httpHeader}
         */
        httpHeader?: string;
    };
}
/**
 * @internal
 */
export declare const flexibleChecksumsMiddlewareOptions: BuildHandlerOptions;
/**
 * @internal
 */
export declare const flexibleChecksumsMiddleware: (config: PreviouslyResolved, middlewareConfig: FlexibleChecksumsRequestMiddlewareConfig) => BuildMiddleware<any, any>;
