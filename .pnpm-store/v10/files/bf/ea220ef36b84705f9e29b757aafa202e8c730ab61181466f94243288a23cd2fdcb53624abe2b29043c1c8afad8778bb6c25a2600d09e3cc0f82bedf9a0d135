import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type JobsApiRoutesFineTuningCancelFineTuningJobRequest = {
    /**
     * The ID of the job to cancel.
     */
    jobId: string;
};
/**
 * OK
 */
export type JobsApiRoutesFineTuningCancelFineTuningJobResponse = (components.ClassifierDetailedJobOut & {
    jobType: "classifier";
}) | (components.CompletionDetailedJobOut & {
    jobType: "completion";
});
/** @internal */
export type JobsApiRoutesFineTuningCancelFineTuningJobRequest$Outbound = {
    job_id: string;
};
/** @internal */
export declare const JobsApiRoutesFineTuningCancelFineTuningJobRequest$outboundSchema: z.ZodType<JobsApiRoutesFineTuningCancelFineTuningJobRequest$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningCancelFineTuningJobRequest>;
export declare function jobsApiRoutesFineTuningCancelFineTuningJobRequestToJSON(jobsApiRoutesFineTuningCancelFineTuningJobRequest: JobsApiRoutesFineTuningCancelFineTuningJobRequest): string;
/** @internal */
export declare const JobsApiRoutesFineTuningCancelFineTuningJobResponse$inboundSchema: z.ZodType<JobsApiRoutesFineTuningCancelFineTuningJobResponse, z.ZodTypeDef, unknown>;
export declare function jobsApiRoutesFineTuningCancelFineTuningJobResponseFromJSON(jsonString: string): SafeParseResult<JobsApiRoutesFineTuningCancelFineTuningJobResponse, SDKValidationError>;
//# sourceMappingURL=jobsapiroutesfinetuningcancelfinetuningjob.d.ts.map