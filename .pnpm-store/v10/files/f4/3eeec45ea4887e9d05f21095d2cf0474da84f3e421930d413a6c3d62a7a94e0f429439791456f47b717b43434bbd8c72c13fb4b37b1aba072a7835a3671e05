import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type JobsApiRoutesFineTuningStartFineTuningJobRequest = {
    jobId: string;
};
/**
 * OK
 */
export type JobsApiRoutesFineTuningStartFineTuningJobResponse = (components.ClassifierDetailedJobOut & {
    jobType: "classifier";
}) | (components.CompletionDetailedJobOut & {
    jobType: "completion";
});
/** @internal */
export type JobsApiRoutesFineTuningStartFineTuningJobRequest$Outbound = {
    job_id: string;
};
/** @internal */
export declare const JobsApiRoutesFineTuningStartFineTuningJobRequest$outboundSchema: z.ZodType<JobsApiRoutesFineTuningStartFineTuningJobRequest$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningStartFineTuningJobRequest>;
export declare function jobsApiRoutesFineTuningStartFineTuningJobRequestToJSON(jobsApiRoutesFineTuningStartFineTuningJobRequest: JobsApiRoutesFineTuningStartFineTuningJobRequest): string;
/** @internal */
export declare const JobsApiRoutesFineTuningStartFineTuningJobResponse$inboundSchema: z.ZodType<JobsApiRoutesFineTuningStartFineTuningJobResponse, z.ZodTypeDef, unknown>;
export declare function jobsApiRoutesFineTuningStartFineTuningJobResponseFromJSON(jsonString: string): SafeParseResult<JobsApiRoutesFineTuningStartFineTuningJobResponse, SDKValidationError>;
//# sourceMappingURL=jobsapiroutesfinetuningstartfinetuningjob.d.ts.map