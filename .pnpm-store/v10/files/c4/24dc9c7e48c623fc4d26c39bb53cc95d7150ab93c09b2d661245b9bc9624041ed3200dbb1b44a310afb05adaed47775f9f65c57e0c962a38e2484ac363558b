import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type JobsApiRoutesFineTuningGetFineTuningJobRequest = {
    /**
     * The ID of the job to analyse.
     */
    jobId: string;
};
/**
 * OK
 */
export type JobsApiRoutesFineTuningGetFineTuningJobResponse = (components.ClassifierDetailedJobOut & {
    jobType: "classifier";
}) | (components.CompletionDetailedJobOut & {
    jobType: "completion";
});
/** @internal */
export declare const JobsApiRoutesFineTuningGetFineTuningJobRequest$inboundSchema: z.ZodType<JobsApiRoutesFineTuningGetFineTuningJobRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type JobsApiRoutesFineTuningGetFineTuningJobRequest$Outbound = {
    job_id: string;
};
/** @internal */
export declare const JobsApiRoutesFineTuningGetFineTuningJobRequest$outboundSchema: z.ZodType<JobsApiRoutesFineTuningGetFineTuningJobRequest$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningGetFineTuningJobRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace JobsApiRoutesFineTuningGetFineTuningJobRequest$ {
    /** @deprecated use `JobsApiRoutesFineTuningGetFineTuningJobRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<JobsApiRoutesFineTuningGetFineTuningJobRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `JobsApiRoutesFineTuningGetFineTuningJobRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<JobsApiRoutesFineTuningGetFineTuningJobRequest$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningGetFineTuningJobRequest>;
    /** @deprecated use `JobsApiRoutesFineTuningGetFineTuningJobRequest$Outbound` instead. */
    type Outbound = JobsApiRoutesFineTuningGetFineTuningJobRequest$Outbound;
}
export declare function jobsApiRoutesFineTuningGetFineTuningJobRequestToJSON(jobsApiRoutesFineTuningGetFineTuningJobRequest: JobsApiRoutesFineTuningGetFineTuningJobRequest): string;
export declare function jobsApiRoutesFineTuningGetFineTuningJobRequestFromJSON(jsonString: string): SafeParseResult<JobsApiRoutesFineTuningGetFineTuningJobRequest, SDKValidationError>;
/** @internal */
export declare const JobsApiRoutesFineTuningGetFineTuningJobResponse$inboundSchema: z.ZodType<JobsApiRoutesFineTuningGetFineTuningJobResponse, z.ZodTypeDef, unknown>;
/** @internal */
export type JobsApiRoutesFineTuningGetFineTuningJobResponse$Outbound = (components.ClassifierDetailedJobOut$Outbound & {
    job_type: "classifier";
}) | (components.CompletionDetailedJobOut$Outbound & {
    job_type: "completion";
});
/** @internal */
export declare const JobsApiRoutesFineTuningGetFineTuningJobResponse$outboundSchema: z.ZodType<JobsApiRoutesFineTuningGetFineTuningJobResponse$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningGetFineTuningJobResponse>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace JobsApiRoutesFineTuningGetFineTuningJobResponse$ {
    /** @deprecated use `JobsApiRoutesFineTuningGetFineTuningJobResponse$inboundSchema` instead. */
    const inboundSchema: z.ZodType<JobsApiRoutesFineTuningGetFineTuningJobResponse, z.ZodTypeDef, unknown>;
    /** @deprecated use `JobsApiRoutesFineTuningGetFineTuningJobResponse$outboundSchema` instead. */
    const outboundSchema: z.ZodType<JobsApiRoutesFineTuningGetFineTuningJobResponse$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningGetFineTuningJobResponse>;
    /** @deprecated use `JobsApiRoutesFineTuningGetFineTuningJobResponse$Outbound` instead. */
    type Outbound = JobsApiRoutesFineTuningGetFineTuningJobResponse$Outbound;
}
export declare function jobsApiRoutesFineTuningGetFineTuningJobResponseToJSON(jobsApiRoutesFineTuningGetFineTuningJobResponse: JobsApiRoutesFineTuningGetFineTuningJobResponse): string;
export declare function jobsApiRoutesFineTuningGetFineTuningJobResponseFromJSON(jsonString: string): SafeParseResult<JobsApiRoutesFineTuningGetFineTuningJobResponse, SDKValidationError>;
//# sourceMappingURL=jobsapiroutesfinetuninggetfinetuningjob.d.ts.map