import * as z from "zod/v3";
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
export declare function oneFromJSON(jsonString: string): SafeParseResult<One, SDKValidationError>;
/** @internal */
export declare const JobsApiRoutesFineTuningCreateFineTuningJobResponse$inboundSchema: z.ZodType<JobsApiRoutesFineTuningCreateFineTuningJobResponse, z.ZodTypeDef, unknown>;
export declare function jobsApiRoutesFineTuningCreateFineTuningJobResponseFromJSON(jsonString: string): SafeParseResult<JobsApiRoutesFineTuningCreateFineTuningJobResponse, SDKValidationError>;
//# sourceMappingURL=jobsapiroutesfinetuningcreatefinetuningjob.d.ts.map