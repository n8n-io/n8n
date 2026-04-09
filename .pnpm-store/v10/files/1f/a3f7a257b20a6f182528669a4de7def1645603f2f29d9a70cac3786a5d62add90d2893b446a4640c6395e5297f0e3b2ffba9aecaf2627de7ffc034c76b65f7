import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type RetrieveModelV1ModelsModelIdGetRequest = {
    /**
     * The ID of the model to retrieve.
     */
    modelId: string;
};
/**
 * Successful Response
 */
export type RetrieveModelV1ModelsModelIdGetResponseRetrieveModelV1ModelsModelIdGet = (components.BaseModelCard & {
    type: "base";
}) | (components.FTModelCard & {
    type: "fine-tuned";
});
/** @internal */
export type RetrieveModelV1ModelsModelIdGetRequest$Outbound = {
    model_id: string;
};
/** @internal */
export declare const RetrieveModelV1ModelsModelIdGetRequest$outboundSchema: z.ZodType<RetrieveModelV1ModelsModelIdGetRequest$Outbound, z.ZodTypeDef, RetrieveModelV1ModelsModelIdGetRequest>;
export declare function retrieveModelV1ModelsModelIdGetRequestToJSON(retrieveModelV1ModelsModelIdGetRequest: RetrieveModelV1ModelsModelIdGetRequest): string;
/** @internal */
export declare const RetrieveModelV1ModelsModelIdGetResponseRetrieveModelV1ModelsModelIdGet$inboundSchema: z.ZodType<RetrieveModelV1ModelsModelIdGetResponseRetrieveModelV1ModelsModelIdGet, z.ZodTypeDef, unknown>;
export declare function retrieveModelV1ModelsModelIdGetResponseRetrieveModelV1ModelsModelIdGetFromJSON(jsonString: string): SafeParseResult<RetrieveModelV1ModelsModelIdGetResponseRetrieveModelV1ModelsModelIdGet, SDKValidationError>;
//# sourceMappingURL=retrievemodelv1modelsmodelidget.d.ts.map