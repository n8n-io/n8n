import { BaseChatModel, BaseChatModelCallOptions, BaseChatModelParams } from "@langchain/core/language_models/chat_models";
import { BaseMessage } from "@langchain/core/messages";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { Runnable } from "@langchain/core/runnables";
import { InteropZodType } from "@langchain/core/utils/types";
import { BaseLanguageModelInput, StructuredOutputMethodOptions } from "@langchain/core/language_models/base";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/chat_models/perplexity.d.ts

/**
 * Type representing the role of a message in the Perplexity chat model.
 */
type PerplexityRole = "system" | "user" | "assistant";
interface WebSearchOptions {
  /**
   * Determines how much search context is retrieved for the model.
   * Options are: low (minimizes context for cost savings but less comprehensive answers), medium (balanced approach suitable for most queries), and high (maximizes context for comprehensive answers but at higher cost).
   */
  search_context_size?: "low" | "medium" | "high";
  /**
   * To refine search results based on geography, you can specify an approximate user location.
   */
  user_location?: {
    /**
     * The latitude of the user's location.
     */
    latitude: number;
    /**
     * The longitude of the user's location.
     */
    longitude: number;
    /**
     * The two letter ISO country code of the user's location.
     */
    country: string;
  };
}
/**
 * Interface defining the parameters for the Perplexity chat model.
 */
interface PerplexityChatInput extends BaseChatModelParams {
  /** Model name to use */
  model: string;
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** Temperature parameter between 0 and 2 */
  temperature?: number;
  /** Top P parameter between 0 and 1 */
  topP?: number;
  /** Search domain filter - limit the citations used by the online model to URLs from the specified domains. */
  searchDomainFilter?: unknown[];
  /** Whether to return images */
  returnImages?: boolean;
  /** Determines whether or not a request to an online model should return related questions. */
  returnRelatedQuestions?: boolean;
  /** Returns search results within the specified time interval - does not apply to images. Values include month, week, day, hour. */
  searchRecencyFilter?: string;
  /** Top K parameter between 1 and 2048 */
  topK?: number;
  /** Presence penalty between -2 and 2 */
  presencePenalty?: number;
  /** Frequency penalty greater than 0 */
  frequencyPenalty?: number;
  /** API key for Perplexity.  Defaults to the value of
   * PERPLEXITY_API_KEY environment variable.
   */
  apiKey?: string;
  /** Whether to stream the results or not */
  streaming?: boolean;
  /** Timeout for requests to Perplexity */
  timeout?: number;
  /** Controls the search mode used for the request. When set to 'academic', results will prioritize scholarly sources. */
  searchMode?: "academic" | "web";
  /** Controls how much computational effort the AI dedicates to each query for deep research models. Only applicable for sonar-deep-research. */
  reasoningEffort?: "low" | "medium" | "high";
  /** Filters search results to only include content published after this date. */
  searchAfterDateFilter?: string;
  /** Filters search results to only include content published before this date. */
  searchBeforeDateFilter?: string;
  /** Filters search results to only include content last updated after this date. */
  lastUpdatedAfterFilter?: string;
  /** Filters search results to only include content last updated before this date. */
  lastUpdatedBeforeFilter?: string;
  /** When set to true, disables web search completely and the model will only use its training data to respond. This is useful when you want deterministic responses without external information. */
  disableSearch?: boolean;
  /** Enables a classifier that decides if web search is needed based on your query. */
  enableSearchClassifier?: boolean;
  /**
   * Configuration for using web search in model responses.
   */
  webSearchOptions?: WebSearchOptions;
}
interface PerplexityChatCallOptions extends BaseChatModelCallOptions {
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      description: string;
      schema: Record<string, unknown>;
    };
  };
}
/**
 * Wrapper around Perplexity large language models that use the Chat endpoint.
 */
declare class ChatPerplexity extends BaseChatModel<PerplexityChatCallOptions> implements PerplexityChatInput {
  static lc_name(): string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  timeout?: number;
  streaming?: boolean;
  topP?: number;
  searchDomainFilter?: any[];
  returnImages?: boolean;
  returnRelatedQuestions?: boolean;
  searchRecencyFilter?: string;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  searchMode?: "academic" | "web";
  reasoningEffort?: "low" | "medium" | "high";
  searchAfterDateFilter?: string;
  searchBeforeDateFilter?: string;
  lastUpdatedAfterFilter?: string;
  lastUpdatedBeforeFilter?: string;
  disableSearch?: boolean;
  enableSearchClassifier?: boolean;
  webSearchOptions?: WebSearchOptions;
  private client;
  constructor(fields: PerplexityChatInput);
  _llmType(): string;
  /**
   * Get the parameters used to invoke the model
   */
  invocationParams(options?: this["ParsedCallOptions"]): {
    model: string;
    temperature: number | undefined;
    max_tokens: number | undefined;
    stream: boolean | undefined;
    top_p: number | undefined;
    return_images: boolean | undefined;
    return_related_questions: boolean | undefined;
    top_k: number | undefined;
    presence_penalty: number | undefined;
    frequency_penalty: number | undefined;
    response_format: {
      type: "json_schema";
      json_schema: {
        name: string;
        description: string;
        schema: Record<string, unknown>;
      };
    } | undefined;
    search_domain_filter: any[] | undefined;
    search_recency_filter: string | undefined;
    search_mode: "academic" | "web" | undefined;
    reasoning_effort: "high" | "low" | "medium" | undefined;
    search_after_date_filter: string | undefined;
    search_before_date_filter: string | undefined;
    last_updated_after_filter: string | undefined;
    last_updated_before_filter: string | undefined;
    disable_search: boolean | undefined;
    enable_search_classifier: boolean | undefined;
    web_search_options: Record<string, unknown>;
  };
  /**
   * Convert a message to a format that the model expects
   */
  private messageToPerplexityRole;
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
}
//#endregion
export { ChatPerplexity, PerplexityChatCallOptions, PerplexityChatInput, PerplexityRole, WebSearchOptions };
//# sourceMappingURL=perplexity.d.ts.map