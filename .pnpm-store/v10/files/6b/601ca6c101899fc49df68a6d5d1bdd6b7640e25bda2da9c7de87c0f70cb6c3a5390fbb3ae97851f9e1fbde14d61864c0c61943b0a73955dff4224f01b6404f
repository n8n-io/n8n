import { ClientOptions, OpenAI as OpenAI$1 } from "openai";
import { TiktokenModel } from "js-tiktoken/lite";
import { BaseLanguageModelCallOptions } from "@langchain/core/language_models/base";
import { ResponseFormatJSONObject, ResponseFormatJSONSchema, ResponseFormatText, ResponseFormatTextGrammar, ResponseFormatTextPython } from "openai/resources/shared";
import { InteropZodObject } from "@langchain/core/utils/types";

//#region src/types.d.ts

/**
 * @see https://platform.openai.com/docs/models
 */
type OpenAIChatModelId = OpenAI$1.ChatModel | (string & NonNullable<unknown>);
type OpenAIVerbosityParam = "low" | "medium" | "high" | null;
type OpenAIApiKey = ClientOptions["apiKey"];
declare interface OpenAIBaseInput {
  /** Sampling temperature to use */
  temperature: number;
  /**
   * Maximum number of tokens to generate in the completion. -1 returns as many
   * tokens as possible given the prompt and the model's maximum context size.
   */
  maxTokens?: number;
  /**
   * Maximum number of tokens to generate in the completion. -1 returns as many
   * tokens as possible given the prompt and the model's maximum context size.
   * Alias for `maxTokens` for reasoning models.
   */
  maxCompletionTokens?: number;
  /** Total probability mass of tokens to consider at each step */
  topP: number;
  /** Penalizes repeated tokens according to frequency */
  frequencyPenalty: number;
  /** Penalizes repeated tokens */
  presencePenalty: number;
  /** Number of completions to generate for each prompt */
  n: number;
  /** Dictionary used to adjust the probability of specific tokens being generated */
  logitBias?: Record<string, number>;
  /** Unique string identifier representing your end-user, which can help OpenAI to monitor and detect abuse. */
  user?: string;
  /** Whether to stream the results or not. Enabling disables tokenUsage reporting */
  streaming: boolean;
  /**
   * Whether or not to include token usage data in streamed chunks.
   * @default true
   */
  streamUsage?: boolean;
  /**
   * Model name to use
   * Alias for `model`
   * @deprecated Use "model" instead.
   */
  modelName: string;
  /** Model name to use */
  model: OpenAIChatModelId;
  /** Holds any additional parameters that are valid to pass to {@link
   * https://platform.openai.com/docs/api-reference/completions/create |
   * `openai.createCompletion`} that are not explicitly specified on this class.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelKwargs?: Record<string, any>;
  /**
   * List of stop words to use when generating
   * Alias for `stopSequences`
   */
  stop?: string[];
  /** List of stop words to use when generating */
  stopSequences?: string[];
  /**
   * Timeout to use when making requests to OpenAI.
   */
  timeout?: number;
  /**
   * API key to use when making requests to OpenAI. Defaults to the value of
   * `OPENAI_API_KEY` environment variable.
   * Alias for `apiKey`
   */
  openAIApiKey?: OpenAIApiKey;
  /**
   * API key to use when making requests to OpenAI. Defaults to the value of
   * `OPENAI_API_KEY` environment variable.
   */
  apiKey?: OpenAIApiKey;
  /**
   * The verbosity of the model's response.
   */
  verbosity?: OpenAIVerbosityParam;
}
type OpenAICoreRequestOptions = OpenAI$1.RequestOptions;
interface OpenAICallOptions extends BaseLanguageModelCallOptions {
  /**
   * Additional options to pass to the underlying axios request.
   */
  options?: OpenAICoreRequestOptions;
}
/**
 * Input to OpenAI class.
 */
declare interface OpenAIInput extends OpenAIBaseInput {
  /** Generates `bestOf` completions server side and returns the "best" */
  bestOf?: number;
  /** Batch size to use when passing multiple documents to generate */
  batchSize: number;
}
interface OpenAIChatInput extends OpenAIBaseInput {
  /**
   * Whether to return log probabilities of the output tokens or not.
   * If true, returns the log probabilities of each output token returned in the content of message.
   */
  logprobs?: boolean;
  /**
   * An integer between 0 and 5 specifying the number of most likely tokens to return at each token position,
   * each with an associated log probability. logprobs must be set to true if this parameter is used.
   */
  topLogprobs?: number;
  /** ChatGPT messages to pass as a prefix to the prompt */
  prefixMessages?: OpenAI$1.Chat.ChatCompletionMessageParam[];
  /**
   * Whether to include the raw OpenAI response in the output message's "additional_kwargs" field.
   * Currently in experimental beta.
   */
  __includeRawResponse?: boolean;
  /**
   * Whether the model supports the `strict` argument when passing in tools.
   * If `undefined` the `strict` argument will not be passed to OpenAI.
   */
  supportsStrictToolCalling?: boolean;
  /**
   * Output types that you would like the model to generate for this request. Most
   * models are capable of generating text, which is the default:
   *
   * `["text"]`
   *
   * The `gpt-4o-audio-preview` model can also be used to
   * [generate audio](https://platform.openai.com/docs/guides/audio). To request that
   * this model generate both text and audio responses, you can use:
   *
   * `["text", "audio"]`
   */
  modalities?: Array<OpenAI$1.Chat.ChatCompletionModality>;
  /**
   * Parameters for audio output. Required when audio output is requested with
   * `modalities: ["audio"]`.
   * [Learn more](https://platform.openai.com/docs/guides/audio).
   */
  audio?: OpenAI$1.Chat.ChatCompletionAudioParam;
  /**
   * Options for reasoning models.
   *
   * Note that some options, like reasoning summaries, are only available when using the responses
   * API. This option is ignored when not using a reasoning model.
   */
  reasoning?: OpenAI$1.Reasoning;
  /**
   * Should be set to `true` in tenancies with Zero Data Retention
   * @see https://platform.openai.com/docs/guides/your-data
   *
   * @default false
   */
  zdrEnabled?: boolean;
  /**
   * Service tier to use for this request. Can be "auto", "default", or "flex" or "priority".
   * Specifies the service tier for prioritization and latency optimization.
   */
  service_tier?: OpenAI$1.Responses.ResponseCreateParams["service_tier"];
  /**
   * Used by OpenAI to cache responses for similar requests to optimize your cache
   * hit rates. Replaces the `user` field.
   * [Learn more](https://platform.openai.com/docs/guides/prompt-caching).
   */
  promptCacheKey?: string;
}
interface AzureOpenAIInput {
  /**
   * API version to use when making requests to Azure OpenAI.
   */
  azureOpenAIApiVersion?: string;
  /**
   * API key to use when making requests to Azure OpenAI.
   */
  azureOpenAIApiKey?: string;
  /**
   * Azure OpenAI API instance name to use when making requests to Azure OpenAI.
   * this is the name of the instance you created in the Azure portal.
   * e.g. "my-openai-instance"
   * this will be used in the endpoint URL: https://my-openai-instance.openai.azure.com/openai/deployments/{DeploymentName}/
   */
  azureOpenAIApiInstanceName?: string;
  /**
   * Azure OpenAI API deployment name to use for completions when making requests to Azure OpenAI.
   * This is the name of the deployment you created in the Azure portal.
   * e.g. "my-openai-deployment"
   * this will be used in the endpoint URL: https://{InstanceName}.openai.azure.com/openai/deployments/my-openai-deployment/
   */
  azureOpenAIApiDeploymentName?: string;
  /**
   * Azure OpenAI API deployment name to use for embedding when making requests to Azure OpenAI.
   * This is the name of the deployment you created in the Azure portal.
   * This will fallback to azureOpenAIApiDeploymentName if not provided.
   * e.g. "my-openai-deployment"
   * this will be used in the endpoint URL: https://{InstanceName}.openai.azure.com/openai/deployments/my-openai-deployment/
   */
  azureOpenAIApiEmbeddingsDeploymentName?: string;
  /**
   * Azure OpenAI API deployment name to use for completions when making requests to Azure OpenAI.
   * Completions are only available for gpt-3.5-turbo and text-davinci-003 deployments.
   * This is the name of the deployment you created in the Azure portal.
   * This will fallback to azureOpenAIApiDeploymentName if not provided.
   * e.g. "my-openai-deployment"
   * this will be used in the endpoint URL: https://{InstanceName}.openai.azure.com/openai/deployments/my-openai-deployment/
   */
  azureOpenAIApiCompletionsDeploymentName?: string;
  /**
   * Custom base url for Azure OpenAI API. This is useful in case you have a deployment in another region.
   * e.g. setting this value to "https://westeurope.api.cognitive.microsoft.com/openai/deployments"
   * will be result in the endpoint URL: https://westeurope.api.cognitive.microsoft.com/openai/deployments/{DeploymentName}/
   */
  azureOpenAIBasePath?: string;
  /**
   * Custom endpoint for Azure OpenAI API. This is useful in case you have a deployment in another region.
   * e.g. setting this value to "https://westeurope.api.cognitive.microsoft.com/"
   * will be result in the endpoint URL: https://westeurope.api.cognitive.microsoft.com/openai/deployments/{DeploymentName}/
   */
  azureOpenAIEndpoint?: string;
  /**
   * A function that returns an access token for Microsoft Entra (formerly known as Azure Active Directory),
   * which will be invoked on every request.
   */
  azureADTokenProvider?: () => Promise<string>;
}
interface AzureOpenAIChatInput extends OpenAIChatInput, AzureOpenAIInput {
  openAIApiVersion?: string;
  openAIBasePath?: string;
  deploymentName?: string;
}
type ChatOpenAIResponseFormatJSONSchema = Omit<ResponseFormatJSONSchema, "json_schema"> & {
  json_schema: Omit<ResponseFormatJSONSchema["json_schema"], "schema"> & {
    /**
     * The schema for the response format, described as a JSON Schema object
     * or a Zod object.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: Record<string, any> | InteropZodObject;
  };
};
/**
 * The summary of a model's reasoning step.
 */
type ChatOpenAIReasoningSummary = Omit<OpenAI$1.Responses.ResponseReasoningItem, "summary"> & {
  /**
   * The summary of the reasoning step. The index field will be populated if the response was
   * streamed. This allows LangChain to recompose the reasoning summary output correctly when the
   * AIMessage is used as an input for future generation requests.
   */
  summary: Array<OpenAI$1.Responses.ResponseReasoningItem.Summary & {
    index?: number;
  }>;
};
type ChatOpenAIResponseFormat = ResponseFormatText | ResponseFormatJSONObject | ResponseFormatTextGrammar | ResponseFormatTextPython | ChatOpenAIResponseFormatJSONSchema;
type ResponseFormatConfiguration = ResponseFormatText | ResponseFormatJSONObject | ResponseFormatJSONSchema;
//#endregion
export { AzureOpenAIChatInput, AzureOpenAIInput, ChatOpenAIReasoningSummary, ChatOpenAIResponseFormat, OpenAIApiKey, OpenAIBaseInput, OpenAICallOptions, OpenAIChatInput, OpenAIChatModelId, OpenAICoreRequestOptions, OpenAIInput, OpenAIVerbosityParam, ResponseFormatConfiguration, type TiktokenModel };
//# sourceMappingURL=types.d.cts.map