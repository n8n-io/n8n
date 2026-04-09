import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type UsageInfo = {
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
    totalTokens?: number | undefined;
    promptAudioSeconds?: number | null | undefined;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const UsageInfo$inboundSchema: z.ZodType<UsageInfo, z.ZodTypeDef, unknown>;
/** @internal */
export type UsageInfo$Outbound = {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_audio_seconds?: number | null | undefined;
    [additionalProperties: string]: unknown;
};
/** @internal */
export declare const UsageInfo$outboundSchema: z.ZodType<UsageInfo$Outbound, z.ZodTypeDef, UsageInfo>;
export declare function usageInfoToJSON(usageInfo: UsageInfo): string;
export declare function usageInfoFromJSON(jsonString: string): SafeParseResult<UsageInfo, SDKValidationError>;
//# sourceMappingURL=usageinfo.d.ts.map