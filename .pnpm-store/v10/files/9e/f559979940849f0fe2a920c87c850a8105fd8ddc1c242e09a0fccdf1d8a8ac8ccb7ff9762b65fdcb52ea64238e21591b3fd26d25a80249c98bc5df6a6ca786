import * as z from "zod/v3";
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
export type JobsApiRoutesFineTuningUpdateFineTunedModelRequest$Outbound = {
    model_id: string;
    UpdateFTModelIn: components.UpdateFTModelIn$Outbound;
};
/** @internal */
export declare const JobsApiRoutesFineTuningUpdateFineTunedModelRequest$outboundSchema: z.ZodType<JobsApiRoutesFineTuningUpdateFineTunedModelRequest$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningUpdateFineTunedModelRequest>;
export declare function jobsApiRoutesFineTuningUpdateFineTunedModelRequestToJSON(jobsApiRoutesFineTuningUpdateFineTunedModelRequest: JobsApiRoutesFineTuningUpdateFineTunedModelRequest): string;
/** @internal */
export declare const JobsApiRoutesFineTuningUpdateFineTunedModelResponse$inboundSchema: z.ZodType<JobsApiRoutesFineTuningUpdateFineTunedModelResponse, z.ZodTypeDef, unknown>;
export declare function jobsApiRoutesFineTuningUpdateFineTunedModelResponseFromJSON(jsonString: string): SafeParseResult<JobsApiRoutesFineTuningUpdateFineTunedModelResponse, SDKValidationError>;
//# sourceMappingURL=jobsapiroutesfinetuningupdatefinetunedmodel.d.ts.map