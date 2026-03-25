import type { LanguageModelV2Middleware, SharedV2ProviderMetadata, LanguageModelV2FinishReason } from "@ai-sdk/provider";
import type { RunTreeConfig } from "../../run_trees.js";
export type AggregatedDoStreamOutput = {
    content: string;
    role: "assistant";
    tool_calls: {
        id: string;
        type: "function";
        function: {
            name: string;
            arguments: string;
        };
    }[];
    providerMetadata?: SharedV2ProviderMetadata;
    finishReason?: LanguageModelV2FinishReason;
};
/**
 * AI SDK middleware that wraps an AI SDK 6 or 5 model and adds LangSmith tracing.
 */
export declare function LangSmithMiddleware(config?: {
    name: string;
    modelId?: string;
    lsConfig?: Partial<Omit<RunTreeConfig, "inputs" | "outputs" | "run_type">> & {
        processInputs?: (inputs: Record<string, unknown>) => Record<string, unknown>;
        processOutputs?: (outputs: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>;
        traceRawHttp?: boolean;
    };
}): LanguageModelV2Middleware;
