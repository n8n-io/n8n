import { OpenAI, OpenAICallOptions, OpenAIClient, OpenAICoreRequestOptions, OpenAIInput } from "@langchain/openai";
import { BaseLLMParams } from "@langchain/core/language_models/llms";
import * as _langchain_core_load_serializable2 from "@langchain/core/load/serializable";

//#region src/llms/fireworks.d.ts
type FireworksUnsupportedArgs = "frequencyPenalty" | "presencePenalty" | "bestOf" | "logitBias";
type FireworksUnsupportedCallOptions = "functions" | "function_call" | "tools";
type FireworksCallOptions = Partial<Omit<OpenAICallOptions, FireworksUnsupportedCallOptions>>;
/**
 * Wrapper around Fireworks API for large language models
 *
 * Fireworks API is compatible to the OpenAI API with some limitations described in
 * https://readme.fireworks.ai/docs/openai-compatibility.
 *
 * To use, you should have the `openai` package installed and
 * the `FIREWORKS_API_KEY` environment variable set.
 */
declare class Fireworks extends OpenAI<FireworksCallOptions> {
  static lc_name(): string;
  _llmType(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  lc_serializable: boolean;
  fireworksApiKey?: string;
  constructor(fields?: Partial<Omit<OpenAIInput, "openAIApiKey" | FireworksUnsupportedArgs>> & BaseLLMParams & {
    fireworksApiKey?: string;
  });
  toJSON(): _langchain_core_load_serializable2.Serialized;
  completionWithRetry(request: OpenAIClient.CompletionCreateParamsStreaming, options?: OpenAICoreRequestOptions): Promise<AsyncIterable<OpenAIClient.Completion>>;
  completionWithRetry(request: OpenAIClient.CompletionCreateParamsNonStreaming, options?: OpenAICoreRequestOptions): Promise<OpenAIClient.Completions.Completion>;
}
//#endregion
export { Fireworks, FireworksCallOptions };
//# sourceMappingURL=fireworks.d.ts.map