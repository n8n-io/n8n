import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ModerationLlmv1Config, ModerationLlmv1Config$Outbound } from "./moderationllmv1config.js";
export type GuardrailConfig = {
    /**
     * If true, return HTTP 403 and block request in the event of a server-side error
     */
    blockOnError?: boolean | undefined;
    moderationLlmV1: ModerationLlmv1Config | null;
};
/** @internal */
export declare const GuardrailConfig$inboundSchema: z.ZodType<GuardrailConfig, z.ZodTypeDef, unknown>;
/** @internal */
export type GuardrailConfig$Outbound = {
    block_on_error: boolean;
    moderation_llm_v1: ModerationLlmv1Config$Outbound | null;
};
/** @internal */
export declare const GuardrailConfig$outboundSchema: z.ZodType<GuardrailConfig$Outbound, z.ZodTypeDef, GuardrailConfig>;
export declare function guardrailConfigToJSON(guardrailConfig: GuardrailConfig): string;
export declare function guardrailConfigFromJSON(jsonString: string): SafeParseResult<GuardrailConfig, SDKValidationError>;
//# sourceMappingURL=guardrailconfig.d.ts.map