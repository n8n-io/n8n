import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { EmbeddingDtype } from "./embeddingdtype.js";
import { EncodingFormat } from "./encodingformat.js";
/**
 * Text to embed.
 */
export type EmbeddingRequestInputs = string | Array<string>;
export type EmbeddingRequest = {
    /**
     * ID of the model to use.
     */
    model: string;
    /**
     * Text to embed.
     */
    inputs: string | Array<string>;
    /**
     * The dimension of the output embeddings.
     */
    outputDimension?: number | null | undefined;
    outputDtype?: EmbeddingDtype | undefined;
    encodingFormat?: EncodingFormat | undefined;
};
/** @internal */
export declare const EmbeddingRequestInputs$inboundSchema: z.ZodType<EmbeddingRequestInputs, z.ZodTypeDef, unknown>;
/** @internal */
export type EmbeddingRequestInputs$Outbound = string | Array<string>;
/** @internal */
export declare const EmbeddingRequestInputs$outboundSchema: z.ZodType<EmbeddingRequestInputs$Outbound, z.ZodTypeDef, EmbeddingRequestInputs>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace EmbeddingRequestInputs$ {
    /** @deprecated use `EmbeddingRequestInputs$inboundSchema` instead. */
    const inboundSchema: z.ZodType<EmbeddingRequestInputs, z.ZodTypeDef, unknown>;
    /** @deprecated use `EmbeddingRequestInputs$outboundSchema` instead. */
    const outboundSchema: z.ZodType<EmbeddingRequestInputs$Outbound, z.ZodTypeDef, EmbeddingRequestInputs>;
    /** @deprecated use `EmbeddingRequestInputs$Outbound` instead. */
    type Outbound = EmbeddingRequestInputs$Outbound;
}
export declare function embeddingRequestInputsToJSON(embeddingRequestInputs: EmbeddingRequestInputs): string;
export declare function embeddingRequestInputsFromJSON(jsonString: string): SafeParseResult<EmbeddingRequestInputs, SDKValidationError>;
/** @internal */
export declare const EmbeddingRequest$inboundSchema: z.ZodType<EmbeddingRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type EmbeddingRequest$Outbound = {
    model: string;
    input: string | Array<string>;
    output_dimension?: number | null | undefined;
    output_dtype?: string | undefined;
    encoding_format?: string | undefined;
};
/** @internal */
export declare const EmbeddingRequest$outboundSchema: z.ZodType<EmbeddingRequest$Outbound, z.ZodTypeDef, EmbeddingRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace EmbeddingRequest$ {
    /** @deprecated use `EmbeddingRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<EmbeddingRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `EmbeddingRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<EmbeddingRequest$Outbound, z.ZodTypeDef, EmbeddingRequest>;
    /** @deprecated use `EmbeddingRequest$Outbound` instead. */
    type Outbound = EmbeddingRequest$Outbound;
}
export declare function embeddingRequestToJSON(embeddingRequest: EmbeddingRequest): string;
export declare function embeddingRequestFromJSON(jsonString: string): SafeParseResult<EmbeddingRequest, SDKValidationError>;
//# sourceMappingURL=embeddingrequest.d.ts.map