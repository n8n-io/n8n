import type { RunTreeConfig } from "../index.js";
type GoogleGenAIType = {
    models: {
        generateContent: (...args: any[]) => any;
        generateContentStream: (...args: any[]) => any;
    };
};
type PatchedGeminiClient<T extends GoogleGenAIType> = T & {
    models: T["models"] & {
        generateContent: T["models"]["generateContent"];
        generateContentStream: T["models"]["generateContentStream"];
    };
};
/**
 * Wraps a Google Gemini client to enable automatic LangSmith tracing.
 *
 * **⚠️ BETA: This feature is in beta and may change in future releases.**
 *
 * Supports tracing for:
 * - Text generation (streaming and non-streaming)
 * - Multimodal inputs (text + images)
 * - Image generation output (gemini-2.5-flash-image)
 * - Function calling
 * - Usage metadata extraction
 *
 * @param gemini - A Google GenAI client instance
 * @param options - LangSmith tracing configuration options
 * @returns A wrapped client with automatic tracing enabled
 *
 * @example
 * ```ts
 * import { GoogleGenAI } from "@google/genai";
 * import { wrapGemini } from "langsmith/wrappers/gemini";
 *
 * const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
 * const wrapped = wrapGemini(client, { tracingEnabled: true });
 *
 * // Use the wrapped client exactly like the original
 * const response = await wrapped.models.generateContent({
 *   model: "gemini-2.0-flash-exp",
 *   contents: "Hello!",
 * });
 * ```
 */
export declare function wrapGemini<T extends GoogleGenAIType>(gemini: T, options?: Partial<RunTreeConfig>): PatchedGeminiClient<T>;
export default wrapGemini;
