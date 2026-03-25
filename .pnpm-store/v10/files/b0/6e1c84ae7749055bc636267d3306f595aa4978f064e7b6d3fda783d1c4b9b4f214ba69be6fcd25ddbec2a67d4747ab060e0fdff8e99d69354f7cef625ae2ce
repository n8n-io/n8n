import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
/**
 * Stop generation if this token is detected. Or if one of these tokens is detected when providing an array
 */
export type FIMCompletionRequestStop = string | Array<string>;
export type FIMCompletionRequest = {
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
    /**
     * Whether to stream back partial progress. If set, tokens will be sent as data-only server-side events as they become available, with the stream terminated by a data: [DONE] message. Otherwise, the server will hold the request open until the timeout or until completion, with the response containing the full result as JSON.
     */
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
export declare const FIMCompletionRequestStop$inboundSchema: z.ZodType<FIMCompletionRequestStop, z.ZodTypeDef, unknown>;
/** @internal */
export type FIMCompletionRequestStop$Outbound = string | Array<string>;
/** @internal */
export declare const FIMCompletionRequestStop$outboundSchema: z.ZodType<FIMCompletionRequestStop$Outbound, z.ZodTypeDef, FIMCompletionRequestStop>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FIMCompletionRequestStop$ {
    /** @deprecated use `FIMCompletionRequestStop$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FIMCompletionRequestStop, z.ZodTypeDef, unknown>;
    /** @deprecated use `FIMCompletionRequestStop$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FIMCompletionRequestStop$Outbound, z.ZodTypeDef, FIMCompletionRequestStop>;
    /** @deprecated use `FIMCompletionRequestStop$Outbound` instead. */
    type Outbound = FIMCompletionRequestStop$Outbound;
}
export declare function fimCompletionRequestStopToJSON(fimCompletionRequestStop: FIMCompletionRequestStop): string;
export declare function fimCompletionRequestStopFromJSON(jsonString: string): SafeParseResult<FIMCompletionRequestStop, SDKValidationError>;
/** @internal */
export declare const FIMCompletionRequest$inboundSchema: z.ZodType<FIMCompletionRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type FIMCompletionRequest$Outbound = {
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
export declare const FIMCompletionRequest$outboundSchema: z.ZodType<FIMCompletionRequest$Outbound, z.ZodTypeDef, FIMCompletionRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FIMCompletionRequest$ {
    /** @deprecated use `FIMCompletionRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FIMCompletionRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `FIMCompletionRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FIMCompletionRequest$Outbound, z.ZodTypeDef, FIMCompletionRequest>;
    /** @deprecated use `FIMCompletionRequest$Outbound` instead. */
    type Outbound = FIMCompletionRequest$Outbound;
}
export declare function fimCompletionRequestToJSON(fimCompletionRequest: FIMCompletionRequest): string;
export declare function fimCompletionRequestFromJSON(jsonString: string): SafeParseResult<FIMCompletionRequest, SDKValidationError>;
//# sourceMappingURL=fimcompletionrequest.d.ts.map