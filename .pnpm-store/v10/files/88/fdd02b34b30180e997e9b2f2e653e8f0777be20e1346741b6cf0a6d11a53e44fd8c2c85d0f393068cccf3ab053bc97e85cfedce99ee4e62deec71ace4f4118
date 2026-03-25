import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ChatCompletionChoice, ChatCompletionChoice$Outbound } from "./chatcompletionchoice.js";
import { UsageInfo, UsageInfo$Outbound } from "./usageinfo.js";
export type FIMCompletionResponse = {
    id: string;
    object: string;
    model: string;
    usage: UsageInfo;
    created: number;
    choices: Array<ChatCompletionChoice>;
};
/** @internal */
export declare const FIMCompletionResponse$inboundSchema: z.ZodType<FIMCompletionResponse, z.ZodTypeDef, unknown>;
/** @internal */
export type FIMCompletionResponse$Outbound = {
    id: string;
    object: string;
    model: string;
    usage: UsageInfo$Outbound;
    created: number;
    choices: Array<ChatCompletionChoice$Outbound>;
};
/** @internal */
export declare const FIMCompletionResponse$outboundSchema: z.ZodType<FIMCompletionResponse$Outbound, z.ZodTypeDef, FIMCompletionResponse>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FIMCompletionResponse$ {
    /** @deprecated use `FIMCompletionResponse$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FIMCompletionResponse, z.ZodTypeDef, unknown>;
    /** @deprecated use `FIMCompletionResponse$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FIMCompletionResponse$Outbound, z.ZodTypeDef, FIMCompletionResponse>;
    /** @deprecated use `FIMCompletionResponse$Outbound` instead. */
    type Outbound = FIMCompletionResponse$Outbound;
}
export declare function fimCompletionResponseToJSON(fimCompletionResponse: FIMCompletionResponse): string;
export declare function fimCompletionResponseFromJSON(jsonString: string): SafeParseResult<FIMCompletionResponse, SDKValidationError>;
//# sourceMappingURL=fimcompletionresponse.d.ts.map