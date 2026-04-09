import { GatewayModelId } from '@ai-sdk/gateway';
import {
  LanguageModelV2,
  LanguageModelV3,
  SharedV3Warning,
  LanguageModelV3Source,
} from '@ai-sdk/provider';

declare global {
  /**
   * Global interface that can be augmented by third-party packages to register custom model IDs.
   *
   * You can register model IDs in two ways:
   *
   * 1. Register based on Model IDs from a provider package:
   * @example
   * ```typescript
   * import { openai } from '@ai-sdk/openai';
   * type OpenAIResponsesModelId = Parameters<typeof openai>[0];
   *
   * declare global {
   *   interface RegisteredProviderModels {
   *     openai: OpenAIResponsesModelId;
   *   }
   * }
   * ```
   *
   * 2. Register individual model IDs directly as keys:
   * @example
   * ```typescript
   * declare global {
   *   interface RegisteredProviderModels {
   *     'my-provider:my-model': any;
   *     'my-provider:another-model': any;
   *   }
   * }
   * ```
   */
  interface RegisteredProviderModels {}
}

/**
 * Global provider model ID type that defaults to GatewayModelId but can be augmented
 * by third-party packages via declaration merging.
 */
export type GlobalProviderModelId = [keyof RegisteredProviderModels] extends [
  never,
]
  ? GatewayModelId
  :
      | keyof RegisteredProviderModels
      | RegisteredProviderModels[keyof RegisteredProviderModels];

/**
 * Language model that is used by the AI SDK.
 */
export type LanguageModel =
  | GlobalProviderModelId
  | LanguageModelV3
  | LanguageModelV2;

/**
 * Reason why a language model finished generating a response.
 *
 * Can be one of the following:
 * - `stop`: model generated stop sequence
 * - `length`: model generated maximum number of tokens
 * - `content-filter`: content filter violation stopped the model
 * - `tool-calls`: model triggered tool calls
 * - `error`: model stopped because of an error
 * - `other`: model stopped for other reasons
 */
export type FinishReason =
  | 'stop'
  | 'length'
  | 'content-filter'
  | 'tool-calls'
  | 'error'
  | 'other';

/**
 * Warning from the model provider for this call. The call will proceed, but e.g.
 * some settings might not be supported, which can lead to suboptimal results.
 */
export type CallWarning = SharedV3Warning;

/**
 * A source that has been used as input to generate the response.
 */
export type Source = LanguageModelV3Source;

/**
 * Tool choice for the generation. It supports the following settings:
 *
 * - `auto` (default): the model can choose whether and which tools to call.
 * - `required`: the model must call a tool. It can choose which tool to call.
 * - `none`: the model must not call tools
 * - `{ type: 'tool', toolName: string (typed) }`: the model must call the specified tool
 */
export type ToolChoice<TOOLS extends Record<string, unknown>> =
  | 'auto'
  | 'none'
  | 'required'
  | { type: 'tool'; toolName: Extract<keyof TOOLS, string> };
