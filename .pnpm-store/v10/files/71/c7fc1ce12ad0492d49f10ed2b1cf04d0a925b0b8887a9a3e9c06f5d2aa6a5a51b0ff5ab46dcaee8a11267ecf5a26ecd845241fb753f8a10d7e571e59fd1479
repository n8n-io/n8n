import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
/**
 * Stop generation if this token is detected. Or if one of these tokens is detected when providing an array
 */
export type FIMCompletionStreamRequestStop = string | Array<string>;
export type FIMCompletionStreamRequest = {
    /**
     * ID of the model to use. Only compatible for now with:
     *
     * @remarks
     *   - `codestral-2405`
     *   - `codestral-latest`
     */
    model: string;
    /**
     * What sampling temperature to use, we recommend between 0.0 and 0.7. Higher values like 0.7 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. We generally recommend altering this or `top_p` but not both. The default value varies depending on the model you are targeting. Call the `/models` endpoint to retrieve the appropriate value.
     */
    temperature?: number | null | undefined;
    /**
     * Nucleus sampling, where the model considers the results of the tokens with `top_p` probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered. We generally recommend altering this or `temperature` but not both.
     */
    topP?: number | undefined;
    /**
     * The maximum number of tokens to generate in the completion. The token count of your prompt plus `max_tokens` cannot exceed the model's context length.
     */
    maxTokens?: number | null | undefined;
    stream?: boolean | undefined;
    /**
     * Stop generation if this token is detected. Or if one of these tokens is detected when providing an array
     */
    stop?: string | Array<string> | undefined;
    /**
     * The seed to use for random sampling. If set, different calls will generate deterministic results.
     */
    randomSeed?: number | null | undefined;
    /**
     * The text/code to complete.
     */
    prompt: string;
    /**
     * Optional text/code that adds more context for the model. When given a `prompt` and a `suffix` the model will fill what is between them. When `suffix` is not provided, the model will simply execute completion starting with `prompt`.
     */
    suffix?: string | null | undefined;
    /**
     * The minimum number of tokens to generate in the completion.
     */
    minTokens?: number | null | undefined;
};
/** @internal */
export declare const FIMCompletionStreamRequestStop$inboundSchema: z.ZodType<FIMCompletionStreamRequestStop, z.ZodTypeDef, unknown>;
/** @internal */
export type FIMCompletionStreamRequestStop$Outbound = string | Array<string>;
/** @internal */
export declare const FIMCompletionStreamRequestStop$outboundSchema: z.ZodType<FIMCompletionStreamRequestStop$Outbound, z.ZodTypeDef, FIMCompletionStreamRequestStop>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FIMCompletionStreamRequestStop$ {
    /** @deprecated use `FIMCompletionStreamRequestStop$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FIMCompletionStreamRequestStop, z.ZodTypeDef, unknown>;
    /** @deprecated use `FIMCompletionStreamRequestStop$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FIMCompletionStreamRequestStop$Outbound, z.ZodTypeDef, FIMCompletionStreamRequestStop>;
    /** @deprecated use `FIMCompletionStreamRequestStop$Outbound` instead. */
    type Outbound = FIMCompletionStreamRequestStop$Outbound;
}
export declare function fimCompletionStreamRequestStopToJSON(fimCompletionStreamRequestStop: FIMCompletionStreamRequestStop): string;
export declare function fimCompletionStreamRequestStopFromJSON(jsonString: string): SafeParseResult<FIMCompletionStreamRequestStop, SDKValidationError>;
/** @internal */
export declare const FIMCompletionStreamRequest$inboundSchema: z.ZodType<FIMCompletionStreamRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type FIMCompletionStreamRequest$Outbound = {
    model: string;
    temperature?: number | null | undefined;
    top_p: number;
    max_tokens?: number | null | undefined;
    stream: boolean;
    stop?: string | Array<string> | undefined;
    random_seed?: number | null | undefined;
    prompt: string;
    suffix?: string | null | undefined;
    min_tokens?: number | null | undefined;
};
/** @internal */
export declare const FIMCompletionStreamRequest$outboundSchema: z.ZodType<FIMCompletionStreamRequest$Outbound, z.ZodTypeDef, FIMCompletionStreamRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FIMCompletionStreamRequest$ {
    /** @deprecated use `FIMCompletionStreamRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FIMCompletionStreamRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `FIMCompletionStreamRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FIMCompletionStreamRequest$Outbound, z.ZodTypeDef, FIMCompletionStreamRequest>;
    /** @deprecated use `FIMCompletionStreamRequest$Outbound` instead. */
    type Outbound = FIMCompletionStreamRequest$Outbound;
}
export declare function fimCompletionStreamRequestToJSON(fimCompletionStreamRequest: FIMCompletionStreamRequest): string;
export declare function fimCompletionStreamRequestFromJSON(jsonString: string): SafeParseResult<FIMCompletionStreamRequest, SDKValidationError>;
//# sourceMappingURL=fimcompletionstreamrequest.d.ts.map