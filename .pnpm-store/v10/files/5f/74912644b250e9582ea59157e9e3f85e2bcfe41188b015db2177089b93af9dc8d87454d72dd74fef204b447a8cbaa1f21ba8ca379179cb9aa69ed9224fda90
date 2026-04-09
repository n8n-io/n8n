import * as z from "zod/v3";
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
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    /**
     * Text to embed.
     */
    inputs: string | Array<string>;
    /**
     * The dimension of the output embeddings when feature available. If not provided, a default output dimension will be used.
     */
    outputDimension?: number | null | undefined;
    outputDtype?: EmbeddingDtype | undefined;
    encodingFormat?: EncodingFormat | undefined;
};
/** @internal */
export type EmbeddingRequestInputs$Outbound = string | Array<string>;
/** @internal */
export declare const EmbeddingRequestInputs$outboundSchema: z.ZodType<EmbeddingRequestInputs$Outbound, z.ZodTypeDef, EmbeddingRequestInputs>;
export declare function embeddingRequestInputsToJSON(embeddingRequestInputs: EmbeddingRequestInputs): string;
/** @internal */
export type EmbeddingRequest$Outbound = {
    model: string;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    input: string | Array<string>;
    output_dimension?: number | null | undefined;
    output_dtype?: string | undefined;
    encoding_format?: string | undefined;
};
/** @internal */
export declare const EmbeddingRequest$outboundSchema: z.ZodType<EmbeddingRequest$Outbound, z.ZodTypeDef, EmbeddingRequest>;
export declare function embeddingRequestToJSON(embeddingRequest: EmbeddingRequest): string;
//# sourceMappingURL=embeddingrequest.d.ts.map