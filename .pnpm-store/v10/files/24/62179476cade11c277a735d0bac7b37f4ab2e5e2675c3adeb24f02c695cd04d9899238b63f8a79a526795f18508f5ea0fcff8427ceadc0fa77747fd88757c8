import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type UsageInfo = {
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
    totalTokens?: number | undefined;
    promptAudioSeconds?: number | null | undefined;
    additionalProperties?: {
        [k: string]: any;
    };
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
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace UsageInfo$ {
    /** @deprecated use `UsageInfo$inboundSchema` instead. */
    const inboundSchema: z.ZodType<UsageInfo, z.ZodTypeDef, unknown>;
    /** @deprecated use `UsageInfo$outboundSchema` instead. */
    const outboundSchema: z.ZodType<UsageInfo$Outbound, z.ZodTypeDef, UsageInfo>;
    /** @deprecated use `UsageInfo$Outbound` instead. */
    type Outbound = UsageInfo$Outbound;
}
export declare function usageInfoToJSON(usageInfo: UsageInfo): string;
export declare function usageInfoFromJSON(jsonString: string): SafeParseResult<UsageInfo, SDKValidationError>;
//# sourceMappingURL=usageinfo.d.ts.map