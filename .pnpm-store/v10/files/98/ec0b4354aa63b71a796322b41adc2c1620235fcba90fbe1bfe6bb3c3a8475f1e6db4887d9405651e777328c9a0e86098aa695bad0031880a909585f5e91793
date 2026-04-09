import * as z from "zod/v3";
import * as components from "../components/index.js";
import { MistralError } from "./mistralerror.js";
export type ObservabilityErrorData = {
    detail: components.ObservabilityErrorDetail;
};
export declare class ObservabilityError extends MistralError {
    detail: components.ObservabilityErrorDetail;
    /** The original data that was passed to this error instance. */
    data$: ObservabilityErrorData;
    constructor(err: ObservabilityErrorData, httpMeta: {
        response: Response;
        request: Request;
        body: string;
    });
}
/** @internal */
export declare const ObservabilityError$inboundSchema: z.ZodType<ObservabilityError, z.ZodTypeDef, unknown>;
//# sourceMappingURL=observabilityerror.d.ts.map