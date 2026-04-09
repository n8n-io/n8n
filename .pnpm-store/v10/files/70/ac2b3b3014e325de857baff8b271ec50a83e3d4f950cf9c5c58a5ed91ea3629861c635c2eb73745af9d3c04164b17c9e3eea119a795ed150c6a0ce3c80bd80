import * as z from "zod/v3";
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
export type JobsApiRoutesFineTuningGetFineTuningJobRequest$Outbound = {
    job_id: string;
};
/** @internal */
export declare const JobsApiRoutesFineTuningGetFineTuningJobRequest$outboundSchema: z.ZodType<JobsApiRoutesFineTuningGetFineTuningJobRequest$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningGetFineTuningJobRequest>;
export declare function jobsApiRoutesFineTuningGetFineTuningJobRequestToJSON(jobsApiRoutesFineTuningGetFineTuningJobRequest: JobsApiRoutesFineTuningGetFineTuningJobRequest): string;
/** @internal */
export declare const JobsApiRoutesFineTuningGetFineTuningJobResponse$inboundSchema: z.ZodType<JobsApiRoutesFineTuningGetFineTuningJobResponse, z.ZodTypeDef, unknown>;
export declare function jobsApiRoutesFineTuningGetFineTuningJobResponseFromJSON(jsonString: string): SafeParseResult<JobsApiRoutesFineTuningGetFineTuningJobResponse, SDKValidationError>;
//# sourceMappingURL=jobsapiroutesfinetuninggetfinetuningjob.d.ts.map