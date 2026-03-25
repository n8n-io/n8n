import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type EmbeddingResponseData = {
    object?: string | undefined;
    embedding?: Array<number> | undefined;
    index?: number | undefined;
};
/** @internal */
export declare const EmbeddingResponseData$inboundSchema: z.ZodType<EmbeddingResponseData, z.ZodTypeDef, unknown>;
/** @internal */
export type EmbeddingResponseData$Outbound = {
    object?: string | undefined;
    embedding?: Array<number> | undefined;
    index?: number | undefined;
};
/** @internal */
export declare const EmbeddingResponseData$outboundSchema: z.ZodType<EmbeddingResponseData$Outbound, z.ZodTypeDef, EmbeddingResponseData>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace EmbeddingResponseData$ {
    /** @deprecated use `EmbeddingResponseData$inboundSchema` instead. */
    const inboundSchema: z.ZodType<EmbeddingResponseData, z.ZodTypeDef, unknown>;
    /** @deprecated use `EmbeddingResponseData$outboundSchema` instead. */
    const outboundSchema: z.ZodType<EmbeddingResponseData$Outbound, z.ZodTypeDef, EmbeddingResponseData>;
    /** @deprecated use `EmbeddingResponseData$Outbound` instead. */
    type Outbound = EmbeddingResponseData$Outbound;
}
export declare function embeddingResponseDataToJSON(embeddingResponseData: EmbeddingResponseData): string;
export declare function embeddingResponseDataFromJSON(jsonString: string): SafeParseResult<EmbeddingResponseData, SDKValidationError>;
//# sourceMappingURL=embeddingresponsedata.d.ts.map