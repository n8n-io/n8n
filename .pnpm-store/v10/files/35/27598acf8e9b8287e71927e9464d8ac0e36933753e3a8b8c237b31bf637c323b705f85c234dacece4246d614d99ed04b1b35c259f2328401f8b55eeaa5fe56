import type { LanguageModelV2Usage, LanguageModelV3Usage } from "@ai-sdk/provider";
import { KVMap } from "../schemas.js";
export declare function extractOutputTokenDetails(usage?: Partial<LanguageModelV2Usage> | Partial<LanguageModelV3Usage>, providerMetadata?: Record<string, unknown>): Record<string, number>;
export declare function extractInputTokenDetails(usage?: Partial<LanguageModelV2Usage> | Partial<LanguageModelV3Usage>, providerMetadata?: Record<string, unknown>): Record<string, number>;
export declare function extractUsageMetadata(span?: {
    status?: {
        code: number;
    };
    attributes?: Record<string, unknown>;
}): KVMap;
