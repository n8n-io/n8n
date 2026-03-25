import type { ClientOptions as AnthropicClientOptions } from "@anthropic-ai/sdk";
import type { ClientOptions as OpenAIClientOptions } from "openai";
import { z } from "zod";
export declare const AvailableModelSchema: z.ZodEnum<["gpt-4o", "gpt-4o-mini", "gpt-4o-2024-08-06", "gpt-4.5-preview", "claude-3-5-sonnet-latest", "claude-3-5-sonnet-20241022", "claude-3-5-sonnet-20240620", "claude-3-7-sonnet-latest", "claude-3-7-sonnet-20250219", "o1-mini", "o1-preview", "o3-mini", "cerebras-llama-3.3-70b", "cerebras-llama-3.1-8b", "groq-llama-3.3-70b-versatile", "groq-llama-3.3-70b-specdec"]>;
export type AvailableModel = z.infer<typeof AvailableModelSchema>;
export type ModelProvider = "openai" | "anthropic" | "cerebras" | "groq";
export type ClientOptions = OpenAIClientOptions | AnthropicClientOptions;
export interface AnthropicJsonSchemaObject {
    definitions?: {
        MySchema?: {
            properties?: Record<string, unknown>;
            required?: string[];
        };
    };
    properties?: Record<string, unknown>;
    required?: string[];
}
