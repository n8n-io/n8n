import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ClassifierJobOut } from "./classifierjobout.js";
import { CompletionJobOut } from "./completionjobout.js";
export type JobsOutData = (ClassifierJobOut & {
    jobType: "classifier";
}) | (CompletionJobOut & {
    jobType: "completion";
});
export type JobsOut = {
    data?: Array<(ClassifierJobOut & {
        jobType: "classifier";
    }) | (CompletionJobOut & {
        jobType: "completion";
    })> | undefined;
    object?: "list" | undefined;
    total: number;
};
/** @internal */
export declare const JobsOutData$inboundSchema: z.ZodType<JobsOutData, z.ZodTypeDef, unknown>;
export declare function jobsOutDataFromJSON(jsonString: string): SafeParseResult<JobsOutData, SDKValidationError>;
/** @internal */
export declare const JobsOut$inboundSchema: z.ZodType<JobsOut, z.ZodTypeDef, unknown>;
export declare function jobsOutFromJSON(jsonString: string): SafeParseResult<JobsOut, SDKValidationError>;
//# sourceMappingURL=jobsout.d.ts.map