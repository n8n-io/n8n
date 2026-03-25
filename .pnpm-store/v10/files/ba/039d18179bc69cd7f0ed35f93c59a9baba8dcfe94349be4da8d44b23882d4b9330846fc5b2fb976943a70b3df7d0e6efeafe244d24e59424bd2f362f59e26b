import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type JobsApiRoutesFineTuningUpdateFineTunedModelRequest = {
    /**
     * The ID of the model to update.
     */
    modelId: string;
    updateFTModelIn: components.UpdateFTModelIn;
};
/**
 * OK
 */
export type JobsApiRoutesFineTuningUpdateFineTunedModelResponse = (components.ClassifierFTModelOut & {
    modelType: "classifier";
}) | (components.CompletionFTModelOut & {
    modelType: "completion";
});
/** @internal */
export declare const JobsApiRoutesFineTuningUpdateFineTunedModelRequest$inboundSchema: z.ZodType<JobsApiRoutesFineTuningUpdateFineTunedModelRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type JobsApiRoutesFineTuningUpdateFineTunedModelRequest$Outbound = {
    model_id: string;
    UpdateFTModelIn: components.UpdateFTModelIn$Outbound;
};
/** @internal */
export declare const JobsApiRoutesFineTuningUpdateFineTunedModelRequest$outboundSchema: z.ZodType<JobsApiRoutesFineTuningUpdateFineTunedModelRequest$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningUpdateFineTunedModelRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace JobsApiRoutesFineTuningUpdateFineTunedModelRequest$ {
    /** @deprecated use `JobsApiRoutesFineTuningUpdateFineTunedModelRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<JobsApiRoutesFineTuningUpdateFineTunedModelRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `JobsApiRoutesFineTuningUpdateFineTunedModelRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<JobsApiRoutesFineTuningUpdateFineTunedModelRequest$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningUpdateFineTunedModelRequest>;
    /** @deprecated use `JobsApiRoutesFineTuningUpdateFineTunedModelRequest$Outbound` instead. */
    type Outbound = JobsApiRoutesFineTuningUpdateFineTunedModelRequest$Outbound;
}
export declare function jobsApiRoutesFineTuningUpdateFineTunedModelRequestToJSON(jobsApiRoutesFineTuningUpdateFineTunedModelRequest: JobsApiRoutesFineTuningUpdateFineTunedModelRequest): string;
export declare function jobsApiRoutesFineTuningUpdateFineTunedModelRequestFromJSON(jsonString: string): SafeParseResult<JobsApiRoutesFineTuningUpdateFineTunedModelRequest, SDKValidationError>;
/** @internal */
export declare const JobsApiRoutesFineTuningUpdateFineTunedModelResponse$inboundSchema: z.ZodType<JobsApiRoutesFineTuningUpdateFineTunedModelResponse, z.ZodTypeDef, unknown>;
/** @internal */
export type JobsApiRoutesFineTuningUpdateFineTunedModelResponse$Outbound = (components.ClassifierFTModelOut$Outbound & {
    model_type: "classifier";
}) | (components.CompletionFTModelOut$Outbound & {
    model_type: "completion";
});
/** @internal */
export declare const JobsApiRoutesFineTuningUpdateFineTunedModelResponse$outboundSchema: z.ZodType<JobsApiRoutesFineTuningUpdateFineTunedModelResponse$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningUpdateFineTunedModelResponse>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace JobsApiRoutesFineTuningUpdateFineTunedModelResponse$ {
    /** @deprecated use `JobsApiRoutesFineTuningUpdateFineTunedModelResponse$inboundSchema` instead. */
    const inboundSchema: z.ZodType<JobsApiRoutesFineTuningUpdateFineTunedModelResponse, z.ZodTypeDef, unknown>;
    /** @deprecated use `JobsApiRoutesFineTuningUpdateFineTunedModelResponse$outboundSchema` instead. */
    const outboundSchema: z.ZodType<JobsApiRoutesFineTuningUpdateFineTunedModelResponse$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningUpdateFineTunedModelResponse>;
    /** @deprecated use `JobsApiRoutesFineTuningUpdateFineTunedModelResponse$Outbound` instead. */
    type Outbound = JobsApiRoutesFineTuningUpdateFineTunedModelResponse$Outbound;
}
export declare function jobsApiRoutesFineTuningUpdateFineTunedModelResponseToJSON(jobsApiRoutesFineTuningUpdateFineTunedModelResponse: JobsApiRoutesFineTuningUpdateFineTunedModelResponse): string;
export declare function jobsApiRoutesFineTuningUpdateFineTunedModelResponseFromJSON(jsonString: string): SafeParseResult<JobsApiRoutesFineTuningUpdateFineTunedModelResponse, SDKValidationError>;
//# sourceMappingURL=jobsapiroutesfinetuningupdatefinetunedmodel.d.ts.map