import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type One = (components.ClassifierJobOut & {
    jobType: "classifier";
}) | (components.CompletionJobOut & {
    jobType: "completion";
});
/**
 * OK
 */
export type JobsApiRoutesFineTuningCreateFineTuningJobResponse = components.LegacyJobMetadataOut | (components.ClassifierJobOut & {
    jobType: "classifier";
}) | (components.CompletionJobOut & {
    jobType: "completion";
});
/** @internal */
export declare const One$inboundSchema: z.ZodType<One, z.ZodTypeDef, unknown>;
/** @internal */
export type One$Outbound = (components.ClassifierJobOut$Outbound & {
    job_type: "classifier";
}) | (components.CompletionJobOut$Outbound & {
    job_type: "completion";
});
/** @internal */
export declare const One$outboundSchema: z.ZodType<One$Outbound, z.ZodTypeDef, One>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace One$ {
    /** @deprecated use `One$inboundSchema` instead. */
    const inboundSchema: z.ZodType<One, z.ZodTypeDef, unknown>;
    /** @deprecated use `One$outboundSchema` instead. */
    const outboundSchema: z.ZodType<One$Outbound, z.ZodTypeDef, One>;
    /** @deprecated use `One$Outbound` instead. */
    type Outbound = One$Outbound;
}
export declare function oneToJSON(one: One): string;
export declare function oneFromJSON(jsonString: string): SafeParseResult<One, SDKValidationError>;
/** @internal */
export declare const JobsApiRoutesFineTuningCreateFineTuningJobResponse$inboundSchema: z.ZodType<JobsApiRoutesFineTuningCreateFineTuningJobResponse, z.ZodTypeDef, unknown>;
/** @internal */
export type JobsApiRoutesFineTuningCreateFineTuningJobResponse$Outbound = components.LegacyJobMetadataOut$Outbound | (components.ClassifierJobOut$Outbound & {
    job_type: "classifier";
}) | (components.CompletionJobOut$Outbound & {
    job_type: "completion";
});
/** @internal */
export declare const JobsApiRoutesFineTuningCreateFineTuningJobResponse$outboundSchema: z.ZodType<JobsApiRoutesFineTuningCreateFineTuningJobResponse$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningCreateFineTuningJobResponse>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace JobsApiRoutesFineTuningCreateFineTuningJobResponse$ {
    /** @deprecated use `JobsApiRoutesFineTuningCreateFineTuningJobResponse$inboundSchema` instead. */
    const inboundSchema: z.ZodType<JobsApiRoutesFineTuningCreateFineTuningJobResponse, z.ZodTypeDef, unknown>;
    /** @deprecated use `JobsApiRoutesFineTuningCreateFineTuningJobResponse$outboundSchema` instead. */
    const outboundSchema: z.ZodType<JobsApiRoutesFineTuningCreateFineTuningJobResponse$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningCreateFineTuningJobResponse>;
    /** @deprecated use `JobsApiRoutesFineTuningCreateFineTuningJobResponse$Outbound` instead. */
    type Outbound = JobsApiRoutesFineTuningCreateFineTuningJobResponse$Outbound;
}
export declare function jobsApiRoutesFineTuningCreateFineTuningJobResponseToJSON(jobsApiRoutesFineTuningCreateFineTuningJobResponse: JobsApiRoutesFineTuningCreateFineTuningJobResponse): string;
export declare function jobsApiRoutesFineTuningCreateFineTuningJobResponseFromJSON(jsonString: string): SafeParseResult<JobsApiRoutesFineTuningCreateFineTuningJobResponse, SDKValidationError>;
//# sourceMappingURL=jobsapiroutesfinetuningcreatefinetuningjob.d.ts.map