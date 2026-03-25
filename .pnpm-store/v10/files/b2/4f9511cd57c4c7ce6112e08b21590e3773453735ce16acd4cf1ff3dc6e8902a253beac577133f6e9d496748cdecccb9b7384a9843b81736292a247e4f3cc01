import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ClassifierJobOut, ClassifierJobOut$Outbound } from "./classifierjobout.js";
import { CompletionJobOut, CompletionJobOut$Outbound } from "./completionjobout.js";
export type JobsOutData = (ClassifierJobOut & {
    jobType: "classifier";
}) | (CompletionJobOut & {
    jobType: "completion";
});
export declare const JobsOutObject: {
    readonly List: "list";
};
export type JobsOutObject = ClosedEnum<typeof JobsOutObject>;
export type JobsOut = {
    data?: Array<(ClassifierJobOut & {
        jobType: "classifier";
    }) | (CompletionJobOut & {
        jobType: "completion";
    })> | undefined;
    object?: JobsOutObject | undefined;
    total: number;
};
/** @internal */
export declare const JobsOutData$inboundSchema: z.ZodType<JobsOutData, z.ZodTypeDef, unknown>;
/** @internal */
export type JobsOutData$Outbound = (ClassifierJobOut$Outbound & {
    job_type: "classifier";
}) | (CompletionJobOut$Outbound & {
    job_type: "completion";
});
/** @internal */
export declare const JobsOutData$outboundSchema: z.ZodType<JobsOutData$Outbound, z.ZodTypeDef, JobsOutData>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace JobsOutData$ {
    /** @deprecated use `JobsOutData$inboundSchema` instead. */
    const inboundSchema: z.ZodType<JobsOutData, z.ZodTypeDef, unknown>;
    /** @deprecated use `JobsOutData$outboundSchema` instead. */
    const outboundSchema: z.ZodType<JobsOutData$Outbound, z.ZodTypeDef, JobsOutData>;
    /** @deprecated use `JobsOutData$Outbound` instead. */
    type Outbound = JobsOutData$Outbound;
}
export declare function jobsOutDataToJSON(jobsOutData: JobsOutData): string;
export declare function jobsOutDataFromJSON(jsonString: string): SafeParseResult<JobsOutData, SDKValidationError>;
/** @internal */
export declare const JobsOutObject$inboundSchema: z.ZodNativeEnum<typeof JobsOutObject>;
/** @internal */
export declare const JobsOutObject$outboundSchema: z.ZodNativeEnum<typeof JobsOutObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace JobsOutObject$ {
    /** @deprecated use `JobsOutObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly List: "list";
    }>;
    /** @deprecated use `JobsOutObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly List: "list";
    }>;
}
/** @internal */
export declare const JobsOut$inboundSchema: z.ZodType<JobsOut, z.ZodTypeDef, unknown>;
/** @internal */
export type JobsOut$Outbound = {
    data?: Array<(ClassifierJobOut$Outbound & {
        job_type: "classifier";
    }) | (CompletionJobOut$Outbound & {
        job_type: "completion";
    })> | undefined;
    object: string;
    total: number;
};
/** @internal */
export declare const JobsOut$outboundSchema: z.ZodType<JobsOut$Outbound, z.ZodTypeDef, JobsOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace JobsOut$ {
    /** @deprecated use `JobsOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<JobsOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `JobsOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<JobsOut$Outbound, z.ZodTypeDef, JobsOut>;
    /** @deprecated use `JobsOut$Outbound` instead. */
    type Outbound = JobsOut$Outbound;
}
export declare function jobsOutToJSON(jobsOut: JobsOut): string;
export declare function jobsOutFromJSON(jsonString: string): SafeParseResult<JobsOut, SDKValidationError>;
//# sourceMappingURL=jobsout.d.ts.map