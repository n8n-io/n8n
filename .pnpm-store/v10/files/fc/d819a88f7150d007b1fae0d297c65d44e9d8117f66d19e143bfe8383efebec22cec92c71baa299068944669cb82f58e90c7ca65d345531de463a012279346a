import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CompletionArgsStop, CompletionArgsStop$Outbound } from "./completionargsstop.js";
import { Prediction, Prediction$Outbound } from "./prediction.js";
import { ResponseFormat, ResponseFormat$Outbound } from "./responseformat.js";
import { ToolChoiceEnum } from "./toolchoiceenum.js";
/**
 * White-listed arguments from the completion API
 */
export type CompletionArgs = {
    stop?: CompletionArgsStop | null | undefined;
    presencePenalty?: number | null | undefined;
    frequencyPenalty?: number | null | undefined;
    temperature?: number | null | undefined;
    topP?: number | null | undefined;
    maxTokens?: number | null | undefined;
    randomSeed?: number | null | undefined;
    prediction?: Prediction | null | undefined;
    responseFormat?: ResponseFormat | null | undefined;
    toolChoice?: ToolChoiceEnum | undefined;
};
/** @internal */
export declare const CompletionArgs$inboundSchema: z.ZodType<CompletionArgs, z.ZodTypeDef, unknown>;
/** @internal */
export type CompletionArgs$Outbound = {
    stop?: CompletionArgsStop$Outbound | null | undefined;
    presence_penalty?: number | null | undefined;
    frequency_penalty?: number | null | undefined;
    temperature?: number | null | undefined;
    top_p?: number | null | undefined;
    max_tokens?: number | null | undefined;
    random_seed?: number | null | undefined;
    prediction?: Prediction$Outbound | null | undefined;
    response_format?: ResponseFormat$Outbound | null | undefined;
    tool_choice?: string | undefined;
};
/** @internal */
export declare const CompletionArgs$outboundSchema: z.ZodType<CompletionArgs$Outbound, z.ZodTypeDef, CompletionArgs>;
export declare function completionArgsToJSON(completionArgs: CompletionArgs): string;
export declare function completionArgsFromJSON(jsonString: string): SafeParseResult<CompletionArgs, SDKValidationError>;
//# sourceMappingURL=completionargs.d.ts.map