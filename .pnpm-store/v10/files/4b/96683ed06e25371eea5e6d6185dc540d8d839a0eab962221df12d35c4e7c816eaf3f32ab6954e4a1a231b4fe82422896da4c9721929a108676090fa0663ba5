import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { BatchJobOut } from "./batchjobout.js";
export type BatchJobsOut = {
    data?: Array<BatchJobOut> | undefined;
    object?: "list" | undefined;
    total: number;
};
/** @internal */
export declare const BatchJobsOut$inboundSchema: z.ZodType<BatchJobsOut, z.ZodTypeDef, unknown>;
export declare function batchJobsOutFromJSON(jsonString: string): SafeParseResult<BatchJobsOut, SDKValidationError>;
//# sourceMappingURL=batchjobsout.d.ts.map