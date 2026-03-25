import * as z from "zod";
import * as components from "../components/index.js";
import { MistralError } from "./mistralerror.js";
export type HTTPValidationErrorData = {
    detail?: Array<components.ValidationError> | undefined;
};
export declare class HTTPValidationError extends MistralError {
    detail?: Array<components.ValidationError> | undefined;
    /** The original data that was passed to this error instance. */
    data$: HTTPValidationErrorData;
    constructor(err: HTTPValidationErrorData, httpMeta: {
        response: Response;
        request: Request;
        body: string;
    });
}
/** @internal */
export declare const HTTPValidationError$inboundSchema: z.ZodType<HTTPValidationError, z.ZodTypeDef, unknown>;
/** @internal */
export type HTTPValidationError$Outbound = {
    detail?: Array<components.ValidationError$Outbound> | undefined;
};
/** @internal */
export declare const HTTPValidationError$outboundSchema: z.ZodType<HTTPValidationError$Outbound, z.ZodTypeDef, HTTPValidationError>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace HTTPValidationError$ {
    /** @deprecated use `HTTPValidationError$inboundSchema` instead. */
    const inboundSchema: z.ZodType<HTTPValidationError, z.ZodTypeDef, unknown>;
    /** @deprecated use `HTTPValidationError$outboundSchema` instead. */
    const outboundSchema: z.ZodType<HTTPValidationError$Outbound, z.ZodTypeDef, HTTPValidationError>;
    /** @deprecated use `HTTPValidationError$Outbound` instead. */
    type Outbound = HTTPValidationError$Outbound;
}
//# sourceMappingURL=httpvalidationerror.d.ts.map