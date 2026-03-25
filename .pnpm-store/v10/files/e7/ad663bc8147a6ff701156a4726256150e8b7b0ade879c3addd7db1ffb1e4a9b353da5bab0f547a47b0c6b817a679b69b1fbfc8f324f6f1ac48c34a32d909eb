import { AgentMiddleware } from "./types.js";
import * as _langchain_core_messages0 from "@langchain/core/messages";
import { BaseMessage } from "@langchain/core/messages";
import * as _langchain_core_tools0 from "@langchain/core/tools";
import { InferInteropZodInput } from "@langchain/core/utils/types";
import { z } from "zod/v3";
import * as _langchain_core_language_models_base0 from "@langchain/core/language_models/base";
import { BaseLanguageModel } from "@langchain/core/language_models/base";

//#region src/agents/middleware/summarization.d.ts
type TokenCounter = (messages: BaseMessage[]) => number | Promise<number>;
declare const contextSizeSchema: z.ZodEffects<z.ZodObject<{
  /**
   * Fraction of the model's context size to use as the trigger
   */
  fraction: z.ZodOptional<z.ZodNumber>;
  /**
   * Number of tokens to use as the trigger
   */
  tokens: z.ZodOptional<z.ZodNumber>;
  /**
   * Number of messages to use as the trigger
   */
  messages: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
  fraction?: number | undefined;
  tokens?: number | undefined;
  messages?: number | undefined;
}, {
  fraction?: number | undefined;
  tokens?: number | undefined;
  messages?: number | undefined;
}>, {
  fraction?: number | undefined;
  tokens?: number | undefined;
  messages?: number | undefined;
}, {
  fraction?: number | undefined;
  tokens?: number | undefined;
  messages?: number | undefined;
}>;
type ContextSize = z.infer<typeof contextSizeSchema>;
declare const keepSchema: z.ZodEffects<z.ZodObject<{
  /**
   * Fraction of the model's context size to keep
   */
  fraction: z.ZodOptional<z.ZodNumber>;
  /**
   * Number of tokens to keep
   */
  tokens: z.ZodOptional<z.ZodNumber>;
  messages: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
  fraction?: number | undefined;
  tokens?: number | undefined;
  messages?: number | undefined;
}, {
  fraction?: number | undefined;
  tokens?: number | undefined;
  messages?: number | undefined;
}>, {
  fraction?: number | undefined;
  tokens?: number | undefined;
  messages?: number | undefined;
}, {
  fraction?: number | undefined;
  tokens?: number | undefined;
  messages?: number | undefined;
}>;
type KeepSize = z.infer<typeof keepSchema>;
declare const contextSchema: z.ZodObject<{
  /**
   * Model to use for summarization
   */
  model: z.ZodType<string | BaseLanguageModel<any, _langchain_core_language_models_base0.BaseLanguageModelCallOptions>, z.ZodTypeDef, string | BaseLanguageModel<any, _langchain_core_language_models_base0.BaseLanguageModelCallOptions>>;
  /**
   * Trigger conditions for summarization.
   * Can be a single condition object (all properties must be met) or an array of conditions (any condition must be met).
   *
   * @example
   * ```ts
   * // Single condition: trigger if tokens >= 5000 AND messages >= 3
   * trigger: { tokens: 5000, messages: 3 }
   *
   * // Multiple conditions: trigger if (tokens >= 5000 AND messages >= 3) OR (tokens >= 3000 AND messages >= 6)
   * trigger: [
   *   { tokens: 5000, messages: 3 },
   *   { tokens: 3000, messages: 6 }
   * ]
   * ```
   */
  trigger: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodObject<{
    /**
     * Fraction of the model's context size to use as the trigger
     */
    fraction: z.ZodOptional<z.ZodNumber>;
    /**
     * Number of tokens to use as the trigger
     */
    tokens: z.ZodOptional<z.ZodNumber>;
    /**
     * Number of messages to use as the trigger
     */
    messages: z.ZodOptional<z.ZodNumber>;
  }, "strip", z.ZodTypeAny, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }>, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }>, z.ZodArray<z.ZodEffects<z.ZodObject<{
    /**
     * Fraction of the model's context size to use as the trigger
     */
    fraction: z.ZodOptional<z.ZodNumber>;
    /**
     * Number of tokens to use as the trigger
     */
    tokens: z.ZodOptional<z.ZodNumber>;
    /**
     * Number of messages to use as the trigger
     */
    messages: z.ZodOptional<z.ZodNumber>;
  }, "strip", z.ZodTypeAny, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }>, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }>, "many">]>>;
  /**
   * Keep conditions for summarization
   */
  keep: z.ZodOptional<z.ZodEffects<z.ZodObject<{
    /**
     * Fraction of the model's context size to keep
     */
    fraction: z.ZodOptional<z.ZodNumber>;
    /**
     * Number of tokens to keep
     */
    tokens: z.ZodOptional<z.ZodNumber>;
    messages: z.ZodOptional<z.ZodNumber>;
  }, "strip", z.ZodTypeAny, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }>, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }>>;
  /**
   * Token counter function to use for summarization
   */
  tokenCounter: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodArray<z.ZodType<BaseMessage<_langchain_core_messages0.MessageStructure<_langchain_core_messages0.MessageToolSet>, _langchain_core_messages0.MessageType>, z.ZodTypeDef, BaseMessage<_langchain_core_messages0.MessageStructure<_langchain_core_messages0.MessageToolSet>, _langchain_core_messages0.MessageType>>, "many">], z.ZodUnknown>, z.ZodUnion<[z.ZodNumber, z.ZodPromise<z.ZodNumber>]>>>;
  /**
   * Summary prompt to use for summarization
   * @default {@link DEFAULT_SUMMARY_PROMPT}
   */
  summaryPrompt: z.ZodDefault<z.ZodString>;
  /**
   * Number of tokens to trim to before summarizing
   */
  trimTokensToSummarize: z.ZodOptional<z.ZodNumber>;
  /**
   * Prefix to add to the summary
   */
  summaryPrefix: z.ZodOptional<z.ZodString>;
  /**
   * @deprecated Use `trigger: { tokens: value }` instead.
   */
  maxTokensBeforeSummary: z.ZodOptional<z.ZodNumber>;
  /**
   * @deprecated Use `keep: { messages: value }` instead.
   */
  messagesToKeep: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
  model: string | BaseLanguageModel<any, _langchain_core_language_models_base0.BaseLanguageModelCallOptions>;
  trigger?: {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }[] | {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  } | undefined;
  keep?: {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  } | undefined;
  tokenCounter?: ((args_0: BaseMessage<_langchain_core_messages0.MessageStructure<_langchain_core_messages0.MessageToolSet>, _langchain_core_messages0.MessageType>[], ...args: unknown[]) => number | Promise<number>) | undefined;
  summaryPrompt: string;
  trimTokensToSummarize?: number | undefined;
  summaryPrefix?: string | undefined;
  maxTokensBeforeSummary?: number | undefined;
  messagesToKeep?: number | undefined;
}, {
  model: string | BaseLanguageModel<any, _langchain_core_language_models_base0.BaseLanguageModelCallOptions>;
  trigger?: {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }[] | {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  } | undefined;
  keep?: {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  } | undefined;
  tokenCounter?: ((args_0: BaseMessage<_langchain_core_messages0.MessageStructure<_langchain_core_messages0.MessageToolSet>, _langchain_core_messages0.MessageType>[], ...args: unknown[]) => number | Promise<number>) | undefined;
  summaryPrompt?: string | undefined;
  trimTokensToSummarize?: number | undefined;
  summaryPrefix?: string | undefined;
  maxTokensBeforeSummary?: number | undefined;
  messagesToKeep?: number | undefined;
}>;
type SummarizationMiddlewareConfig = InferInteropZodInput<typeof contextSchema>;
/**
 * Summarization middleware that automatically summarizes conversation history when token limits are approached.
 *
 * This middleware monitors message token counts and automatically summarizes older
 * messages when a threshold is reached, preserving recent messages and maintaining
 * context continuity by ensuring AI/Tool message pairs remain together.
 *
 * @param options Configuration options for the summarization middleware
 * @returns A middleware instance
 *
 * @example
 * ```ts
 * import { summarizationMiddleware } from "langchain";
 * import { createAgent } from "langchain";
 *
 * // Single condition: trigger if tokens >= 4000 AND messages >= 10
 * const agent1 = createAgent({
 *   llm: model,
 *   tools: [getWeather],
 *   middleware: [
 *     summarizationMiddleware({
 *       model: new ChatOpenAI({ model: "gpt-4o" }),
 *       trigger: { tokens: 4000, messages: 10 },
 *       keep: { messages: 20 },
 *     })
 *   ],
 * });
 *
 * // Multiple conditions: trigger if (tokens >= 5000 AND messages >= 3) OR (tokens >= 3000 AND messages >= 6)
 * const agent2 = createAgent({
 *   llm: model,
 *   tools: [getWeather],
 *   middleware: [
 *     summarizationMiddleware({
 *       model: new ChatOpenAI({ model: "gpt-4o" }),
 *       trigger: [
 *         { tokens: 5000, messages: 3 },
 *         { tokens: 3000, messages: 6 },
 *       ],
 *       keep: { messages: 20 },
 *     })
 *   ],
 * });
 *
 * ```
 */
declare function summarizationMiddleware(options: SummarizationMiddlewareConfig): AgentMiddleware<undefined, z.ZodObject<{
  trigger: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodObject<{
    /**
     * Fraction of the model's context size to use as the trigger
     */
    fraction: z.ZodOptional<z.ZodNumber>;
    /**
     * Number of tokens to use as the trigger
     */
    tokens: z.ZodOptional<z.ZodNumber>;
    /**
     * Number of messages to use as the trigger
     */
    messages: z.ZodOptional<z.ZodNumber>;
  }, "strip", z.ZodTypeAny, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }>, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }>, z.ZodArray<z.ZodEffects<z.ZodObject<{
    /**
     * Fraction of the model's context size to use as the trigger
     */
    fraction: z.ZodOptional<z.ZodNumber>;
    /**
     * Number of tokens to use as the trigger
     */
    tokens: z.ZodOptional<z.ZodNumber>;
    /**
     * Number of messages to use as the trigger
     */
    messages: z.ZodOptional<z.ZodNumber>;
  }, "strip", z.ZodTypeAny, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }>, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }>, "many">]>>;
  keep: z.ZodOptional<z.ZodEffects<z.ZodObject<{
    /**
     * Fraction of the model's context size to keep
     */
    fraction: z.ZodOptional<z.ZodNumber>;
    /**
     * Number of tokens to keep
     */
    tokens: z.ZodOptional<z.ZodNumber>;
    messages: z.ZodOptional<z.ZodNumber>;
  }, "strip", z.ZodTypeAny, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }>, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }, {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }>>;
  tokenCounter: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodArray<z.ZodType<BaseMessage<_langchain_core_messages0.MessageStructure<_langchain_core_messages0.MessageToolSet>, _langchain_core_messages0.MessageType>, z.ZodTypeDef, BaseMessage<_langchain_core_messages0.MessageStructure<_langchain_core_messages0.MessageToolSet>, _langchain_core_messages0.MessageType>>, "many">], z.ZodUnknown>, z.ZodUnion<[z.ZodNumber, z.ZodPromise<z.ZodNumber>]>>>;
  summaryPrompt: z.ZodDefault<z.ZodString>;
  trimTokensToSummarize: z.ZodOptional<z.ZodNumber>;
  summaryPrefix: z.ZodOptional<z.ZodString>;
  maxTokensBeforeSummary: z.ZodOptional<z.ZodNumber>;
  messagesToKeep: z.ZodOptional<z.ZodNumber>;
} & {
  model: z.ZodOptional<z.ZodType<BaseLanguageModel<any, _langchain_core_language_models_base0.BaseLanguageModelCallOptions>, z.ZodTypeDef, BaseLanguageModel<any, _langchain_core_language_models_base0.BaseLanguageModelCallOptions>>>;
}, "strip", z.ZodTypeAny, {
  trigger?: {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }[] | {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  } | undefined;
  keep?: {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  } | undefined;
  tokenCounter?: ((args_0: BaseMessage<_langchain_core_messages0.MessageStructure<_langchain_core_messages0.MessageToolSet>, _langchain_core_messages0.MessageType>[], ...args: unknown[]) => number | Promise<number>) | undefined;
  summaryPrompt: string;
  trimTokensToSummarize?: number | undefined;
  summaryPrefix?: string | undefined;
  maxTokensBeforeSummary?: number | undefined;
  messagesToKeep?: number | undefined;
  model?: BaseLanguageModel<any, _langchain_core_language_models_base0.BaseLanguageModelCallOptions> | undefined;
}, {
  trigger?: {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }[] | {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  } | undefined;
  keep?: {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  } | undefined;
  tokenCounter?: ((args_0: BaseMessage<_langchain_core_messages0.MessageStructure<_langchain_core_messages0.MessageToolSet>, _langchain_core_messages0.MessageType>[], ...args: unknown[]) => number | Promise<number>) | undefined;
  summaryPrompt?: string | undefined;
  trimTokensToSummarize?: number | undefined;
  summaryPrefix?: string | undefined;
  maxTokensBeforeSummary?: number | undefined;
  messagesToKeep?: number | undefined;
  model?: BaseLanguageModel<any, _langchain_core_language_models_base0.BaseLanguageModelCallOptions> | undefined;
}>, {
  trigger?: {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  }[] | {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  } | undefined;
  keep?: {
    fraction?: number | undefined;
    tokens?: number | undefined;
    messages?: number | undefined;
  } | undefined;
  tokenCounter?: ((args_0: BaseMessage<_langchain_core_messages0.MessageStructure<_langchain_core_messages0.MessageToolSet>, _langchain_core_messages0.MessageType>[], ...args: unknown[]) => number | Promise<number>) | undefined;
  summaryPrompt: string;
  trimTokensToSummarize?: number | undefined;
  summaryPrefix?: string | undefined;
  maxTokensBeforeSummary?: number | undefined;
  messagesToKeep?: number | undefined;
  model?: BaseLanguageModel<any, _langchain_core_language_models_base0.BaseLanguageModelCallOptions> | undefined;
}, readonly (_langchain_core_tools0.ServerTool | _langchain_core_tools0.ClientTool)[]>;
//#endregion
export { ContextSize, KeepSize, SummarizationMiddlewareConfig, TokenCounter, summarizationMiddleware };
//# sourceMappingURL=summarization.d.ts.map