import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { EmbeddingResponseData, EmbeddingResponseData$Outbound } from "./embeddingresponsedata.js";
import { UsageInfo, UsageInfo$Outbound } from "./usageinfo.js";
export type EmbeddingResponse = {
    id: string;
    object: string;
    model: string;
    usage: UsageInfo;
    data: Array<EmbeddingResponseData>;
};
/** @internal */
export declare const EmbeddingResponse$inboundSchema: z.ZodType<EmbeddingResponse, z.ZodTypeDef, unknown>;
/** @internal */
export type EmbeddingResponse$Outbound = {
    id: string;
    object: string;
    model: string;
    usage: UsageInfo$Outbound;
    data: Array<EmbeddingResponseData$Outbound>;
};
/** @internal */
export declare const EmbeddingResponse$outboundSchema: z.ZodType<EmbeddingResponse$Outbound, z.ZodTypeDef, EmbeddingResponse>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace EmbeddingResponse$ {
    /** @deprecated use `EmbeddingResponse$inboundSchema` instead. */
    const inboundSchema: z.ZodType<EmbeddingResponse, z.ZodTypeDef, unknown>;
    /** @deprecated use `EmbeddingResponse$outboundSchema` instead. */
    const outboundSchema: z.ZodType<EmbeddingResponse$Outbound, z.ZodTypeDef, EmbeddingResponse>;
    /** @deprecated use `EmbeddingResponse$Outbound` instead. */
    type Outbound = EmbeddingResponse$Outbound;
}
export declare function embeddingResponseToJSON(embeddingResponse: EmbeddingResponse): string;
export declare function embeddingResponseFromJSON(jsonString: string): SafeParseResult<EmbeddingResponse, SDKValidationError>;
//# sourceMappingURL=embeddingresponse.d.ts.map