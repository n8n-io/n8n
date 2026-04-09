import * as z from "zod/v3";
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
//# sourceMappingURL=httpvalidationerror.d.ts.map