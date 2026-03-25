import { MediaManager } from "./experimental/utils/media_core.cjs";
import { JsonStream } from "./utils/stream.cjs";
import { AnthropicAPIConfig, AnthropicCacheControl, AnthropicContent, AnthropicContentRedactedThinking, AnthropicContentText, AnthropicContentThinking, AnthropicContentToolUse, AnthropicMessage, AnthropicMessageContent, AnthropicMessageContentDocument, AnthropicMessageContentImage, AnthropicMessageContentRedactedThinking, AnthropicMessageContentText, AnthropicMessageContentThinking, AnthropicMessageContentToolResult, AnthropicMessageContentToolResultContent, AnthropicMessageContentToolUse, AnthropicMessageContentToolUseInput, AnthropicMetadata, AnthropicRequest, AnthropicRequestSettings, AnthropicResponseData, AnthropicResponseMessage, AnthropicStreamBaseDelta, AnthropicStreamBaseEvent, AnthropicStreamContentBlockDeltaEvent, AnthropicStreamContentBlockStartEvent, AnthropicStreamContentBlockStopEvent, AnthropicStreamDelta, AnthropicStreamDeltaType, AnthropicStreamErrorEvent, AnthropicStreamEventType, AnthropicStreamInputJsonDelta, AnthropicStreamMessageDeltaEvent, AnthropicStreamMessageStartEvent, AnthropicStreamMessageStopEvent, AnthropicStreamPingEvent, AnthropicStreamTextDelta, AnthropicThinking, AnthropicThinkingDisabled, AnthropicThinkingEnabled, AnthropicTool, AnthropicToolChoice, AnthropicToolChoiceAny, AnthropicToolChoiceAuto, AnthropicToolChoiceTool, AnthropicToolInputSchema, AnthropicUsage } from "./types-anthropic.cjs";
import { AsyncCallerCallOptions } from "@langchain/core/utils/async_caller";
import { BaseLLMParams } from "@langchain/core/language_models/llms";
import { BaseChatModelCallOptions, BindToolsInput } from "@langchain/core/language_models/chat_models";
import { BaseMessage, BaseMessageChunk, MessageContent } from "@langchain/core/messages";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/types.d.ts
/**
 * Parameters needed to setup the client connection.
 * AuthOptions are something like GoogleAuthOptions (from google-auth-library)
 * or WebGoogleAuthOptions.
 */
interface GoogleClientParams<AuthOptions> {
  authOptions?: AuthOptions;
  /** Some APIs allow an API key instead */
  apiKey?: string;
}
/**
 * What platform is this running on?
 * gai - Google AI Studio / MakerSuite / Generative AI platform
 * gcp - Google Cloud Platform
 */
type GooglePlatformType = "gai" | "gcp";
interface GoogleConnectionParams<AuthOptions> extends GoogleClientParams<AuthOptions> {
  /** Hostname for the API call (if this is running on GCP) */
  endpoint?: string;
  /** Region where the LLM is stored (if this is running on GCP) */
  location?: string;
  /** The version of the API functions. Part of the path. */
  apiVersion?: string;
  /**
   * What platform to run the service on.
   * If not specified, the class should determine this from other
   * means. Either way, the platform actually used will be in
   * the "platform" getter.
   */
  platformType?: GooglePlatformType;
  /**
   * For compatibility with Google's libraries, should this use Vertex?
   * The "platformType" parmeter takes precedence.
   */
  vertexai?: boolean;
}
declare const GoogleAISafetyCategory: {
  readonly Harassment: "HARM_CATEGORY_HARASSMENT";
  readonly HARASSMENT: "HARM_CATEGORY_HARASSMENT";
  readonly HARM_CATEGORY_HARASSMENT: "HARM_CATEGORY_HARASSMENT";
  readonly HateSpeech: "HARM_CATEGORY_HATE_SPEECH";
  readonly HATE_SPEECH: "HARM_CATEGORY_HATE_SPEECH";
  readonly HARM_CATEGORY_HATE_SPEECH: "HARM_CATEGORY_HATE_SPEECH";
  readonly SexuallyExplicit: "HARM_CATEGORY_SEXUALLY_EXPLICIT";
  readonly SEXUALLY_EXPLICIT: "HARM_CATEGORY_SEXUALLY_EXPLICIT";
  readonly HARM_CATEGORY_SEXUALLY_EXPLICIT: "HARM_CATEGORY_SEXUALLY_EXPLICIT";
  readonly Dangerous: "HARM_CATEGORY_DANGEROUS";
  readonly DANGEROUS: "HARM_CATEGORY_DANGEROUS";
  readonly HARM_CATEGORY_DANGEROUS: "HARM_CATEGORY_DANGEROUS";
  readonly CivicIntegrity: "HARM_CATEGORY_CIVIC_INTEGRITY";
  readonly CIVIC_INTEGRITY: "HARM_CATEGORY_CIVIC_INTEGRITY";
  readonly HARM_CATEGORY_CIVIC_INTEGRITY: "HARM_CATEGORY_CIVIC_INTEGRITY";
};
type GoogleAISafetyCategory = (typeof GoogleAISafetyCategory)[keyof typeof GoogleAISafetyCategory];
declare const GoogleAISafetyThreshold: {
  readonly None: "BLOCK_NONE";
  readonly NONE: "BLOCK_NONE";
  readonly BLOCK_NONE: "BLOCK_NONE";
  readonly Few: "BLOCK_ONLY_HIGH";
  readonly FEW: "BLOCK_ONLY_HIGH";
  readonly BLOCK_ONLY_HIGH: "BLOCK_ONLY_HIGH";
  readonly Some: "BLOCK_MEDIUM_AND_ABOVE";
  readonly SOME: "BLOCK_MEDIUM_AND_ABOVE";
  readonly BLOCK_MEDIUM_AND_ABOVE: "BLOCK_MEDIUM_AND_ABOVE";
  readonly Most: "BLOCK_LOW_AND_ABOVE";
  readonly MOST: "BLOCK_LOW_AND_ABOVE";
  readonly BLOCK_LOW_AND_ABOVE: "BLOCK_LOW_AND_ABOVE";
  readonly Off: "OFF";
  readonly OFF: "OFF";
  readonly BLOCK_OFF: "OFF";
};
type GoogleAISafetyThreshold = (typeof GoogleAISafetyThreshold)[keyof typeof GoogleAISafetyThreshold];
declare const GoogleAISafetyMethod: {
  readonly Severity: "SEVERITY";
  readonly Probability: "PROBABILITY";
};
type GoogleAISafetyMethod = (typeof GoogleAISafetyMethod)[keyof typeof GoogleAISafetyMethod];
interface GoogleAISafetySetting {
  category: GoogleAISafetyCategory | string;
  threshold: GoogleAISafetyThreshold | string;
  method?: GoogleAISafetyMethod | string;
}
type GoogleAIResponseMimeType = "text/plain" | "application/json";
type GoogleAIModelModality = "TEXT" | "IMAGE" | "AUDIO" | string;
type GoogleThinkingLevel = "THINKING_LEVEL_UNSPECIFIED" | "LOW" | "MEDIUM" | "HIGH";
interface GoogleThinkingConfig {
  thinkingBudget?: number;
  includeThoughts?: boolean;
  thinkingLevel?: GoogleThinkingLevel;
}
type GooglePrebuiltVoiceName = string;
interface GooglePrebuiltVoiceConfig {
  voiceName: GooglePrebuiltVoiceName;
}
interface GoogleVoiceConfig {
  prebuiltVoiceConfig: GooglePrebuiltVoiceConfig;
}
interface GoogleSpeakerVoiceConfig {
  speaker: string;
  voiceConfig: GoogleVoiceConfig;
}
interface GoogleMultiSpeakerVoiceConfig {
  speakerVoiceConfigs: GoogleSpeakerVoiceConfig[];
}
interface GoogleSpeechConfigSingle {
  voiceConfig: GoogleVoiceConfig;
  languageCode?: string;
}
interface GoogleSpeechConfigMulti {
  multiSpeakerVoiceConfig: GoogleMultiSpeakerVoiceConfig;
  languageCode?: string;
}
type GoogleSpeechConfig = GoogleSpeechConfigSingle | GoogleSpeechConfigMulti;
/**
 * A simplified version of the GoogleSpeakerVoiceConfig
 */
interface GoogleSpeechSpeakerName {
  speaker: string;
  name: GooglePrebuiltVoiceName;
}
type GoogleSpeechVoice = GooglePrebuiltVoiceName | GoogleSpeechSpeakerName | GoogleSpeechSpeakerName[];
interface GoogleSpeechVoiceLanguage {
  voice: GoogleSpeechVoice;
  languageCode: string;
}
interface GoogleSpeechVoicesLanguage {
  voices: GoogleSpeechVoice;
  languageCode: string;
}
/**
 * A simplified way to represent the voice (or voices) and language code.
 * "voice" and "voices" are semantically the same, we're not enforcing
 * that one is an array and one isn't.
 */
type GoogleSpeechSimplifiedLanguage = GoogleSpeechVoiceLanguage | GoogleSpeechVoicesLanguage;
/**
 * A simplified way to represent the voices.
 * It can either be the voice (or voices), or the voice or voices with language configuration
 */
type GoogleSpeechConfigSimplified = GoogleSpeechVoice | GoogleSpeechSimplifiedLanguage;
interface GoogleModelParams {
  /** Model to use */
  model?: string;
  /**
   * Model to use
   * Alias for `model`
   */
  modelName?: string;
}
interface GoogleAIModelParams extends GoogleModelParams {
  /** Sampling temperature to use */
  temperature?: number;
  /**
   * Maximum number of tokens to generate in the completion.
   * This may include reasoning tokens (for backwards compatibility).
   */
  maxOutputTokens?: number;
  /**
   * The maximum number of the output tokens that will be used
   * for the "thinking" or "reasoning" stages.
   */
  maxReasoningTokens?: number;
  /**
   * An alias for "maxReasoningTokens"
   */
  thinkingBudget?: number;
  /**
   * An OpenAI compatible parameter that will map to "maxReasoningTokens"
   */
  reasoningEffort?: "low" | "medium" | "high";
  /**
   * Optional. The level of thoughts tokens that the model should generate.
   * Can be specified directly or via reasoningLevel for OpenAI compatibility.
   */
  thinkingLevel?: GoogleThinkingLevel;
  /**
   * An OpenAI compatible parameter that will map to "thinkingLevel"
   */
  reasoningLevel?: "low" | "medium" | "high";
  /**
   * Top-p changes how the model selects tokens for output.
   *
   * Tokens are selected from most probable to least until the sum
   * of their probabilities equals the top-p value.
   *
   * For example, if tokens A, B, and C have a probability of
   * .3, .2, and .1 and the top-p value is .5, then the model will
   * select either A or B as the next token (using temperature).
   */
  topP?: number;
  /**
   * Top-k changes how the model selects tokens for output.
   *
   * A top-k of 1 means the selected token is the most probable among
   * all tokens in the model’s vocabulary (also called greedy decoding),
   * while a top-k of 3 means that the next token is selected from
   * among the 3 most probable tokens (using temperature).
   */
  topK?: number;
  /**
   * Seed used in decoding. If not set, the request uses a randomly generated seed.
   */
  seed?: number;
  /**
   * Presence penalty applied to the next token's logprobs
   * if the token has already been seen in the response.
   * This penalty is binary on/off and not dependant on the
   * number of times the token is used (after the first).
   * Use frequencyPenalty for a penalty that increases with each use.
   * A positive penalty will discourage the use of tokens that have
   * already been used in the response, increasing the vocabulary.
   * A negative penalty will encourage the use of tokens that have
   * already been used in the response, decreasing the vocabulary.
   */
  presencePenalty?: number;
  /**
   * Frequency penalty applied to the next token's logprobs,
   * multiplied by the number of times each token has been seen
   * in the respponse so far.
   * A positive penalty will discourage the use of tokens that
   * have already been used, proportional to the number of times
   * the token has been used:
   * The more a token is used, the more dificult it is for the model
   * to use that token again increasing the vocabulary of responses.
   * Caution: A _negative_ penalty will encourage the model to reuse
   * tokens proportional to the number of times the token has been used.
   * Small negative values will reduce the vocabulary of a response.
   * Larger negative values will cause the model to start repeating
   * a common token until it hits the maxOutputTokens limit.
   */
  frequencyPenalty?: number;
  stopSequences?: string[];
  safetySettings?: GoogleAISafetySetting[];
  convertSystemMessageToHumanContent?: boolean;
  /**
   * Available for `gemini-1.5-pro`.
   * The output format of the generated candidate text.
   * Supported MIME types:
   *  - `text/plain`: Text output.
   *  - `application/json`: JSON response in the candidates.
   *
   * @default "text/plain"
   */
  responseMimeType?: GoogleAIResponseMimeType;
  /**
   * The schema that the model's output should conform to.
   * When this is set, the model will output JSON that conforms to the schema.
   */
  responseSchema?: GeminiJsonSchema;
  /**
   * Whether or not to stream.
   * @default false
   */
  streaming?: boolean;
  /**
   * Whether to return log probabilities of the output tokens or not.
   * If true, returns the log probabilities of each output token
   * returned in the content of message.
   */
  logprobs?: boolean;
  /**
   * An integer between 0 and 5 specifying the number of
   * most likely tokens to return at each token position,
   * each with an associated log probability.
   * logprobs must be set to true if this parameter is used.
   */
  topLogprobs?: number;
  /**
   * The modalities of the response.
   */
  responseModalities?: GoogleAIModelModality[];
  /**
   * Custom metadata labels to associate with the request.
   * Only supported on Vertex AI (Google Cloud Platform).
   * Labels are key-value pairs where both keys and values must be strings.
   *
   * Example:
   * ```typescript
   * {
   *   labels: {
   *     "team": "research",
   *     "component": "frontend",
   *     "environment": "production"
   *   }
   * }
   * ```
   */
  labels?: Record<string, string>;
  /**
   * Speech generation configuration.
   * You can use either Google's definition of the speech configuration,
   * or a simplified version we've defined (which can be as simple
   * as the name of a pre-defined voice).
   */
  speechConfig?: GoogleSpeechConfig | GoogleSpeechConfigSimplified;
}
type GoogleAIToolType = BindToolsInput | GeminiTool;
/**
 * The params which can be passed to the API at request time.
 */
interface GoogleAIModelRequestParams extends GoogleAIModelParams {
  tools?: GoogleAIToolType[];
  /**
   * Force the model to use tools in a specific way.
   *
   * | Mode     |	Description                                                                                                                                             |
   * |----------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
   * | "auto"	  | The default model behavior. The model decides whether to predict a function call or a natural language response.                                        |
   * | "any"	  | The model must predict only function calls. To limit the model to a subset of functions, define the allowed function names in `allowed_function_names`. |
   * | "none"	  | The model must not predict function calls. This behavior is equivalent to a model request without any associated function declarations.                 |
   * | string   | The string value must be one of the function names. This will force the model to predict the specified function call.                                   |
   *
   * The tool configuration's "any" mode ("forced function calling") is supported for Gemini 1.5 Pro models only.
   */
  tool_choice?: string | "auto" | "any" | "none" | Record<string, any>;
  /**
   * Allowed functions to call when the mode is "any".
   * If empty, any one of the provided functions are called.
   */
  allowed_function_names?: string[];
  /**
   * Used to specify a previously created context cache to use with generation.
   * For Vertex, this should be of the form:
   * "projects/PROJECT_NUMBER/locations/LOCATION/cachedContents/CACHE_ID",
   *
   * See these guides for more information on how to use context caching:
   * https://cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-create
   * https://cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-use
   */
  cachedContent?: string;
  /**
   * The schema that the model's output should conform to.
   * When this is set, the model will output JSON that conforms to the schema.
   */
  responseSchema?: GeminiJsonSchema;
}
interface GoogleAIBaseLLMInput<AuthOptions> extends BaseLLMParams, GoogleConnectionParams<AuthOptions>, GoogleAIModelParams, GoogleAISafetyParams, GoogleAIAPIParams {}
interface GoogleAIBaseLanguageModelCallOptions extends BaseChatModelCallOptions, GoogleAIModelRequestParams, GoogleAISafetyParams {
  /**
   * Whether or not to include usage data, like token counts
   * in the streamed response chunks.
   * @default true
   */
  streamUsage?: boolean;
}
/**
 * Input to LLM class.
 */
interface GoogleBaseLLMInput<AuthOptions> extends GoogleAIBaseLLMInput<AuthOptions> {}
interface GoogleResponse {
  data: any;
}
interface GoogleRawResponse extends GoogleResponse {
  data: Blob;
}
interface GeminiPartBase {
  thought?: boolean;
  thoughtSignature?: string;
}
interface GeminiVideoMetadata {
  fps?: number;
  startOffset?: string;
  endOffset?: string;
}
interface GeminiPartBaseFile extends GeminiPartBase {
  videoMetadata?: GeminiVideoMetadata;
}
interface GeminiPartText extends GeminiPartBase {
  text: string;
}
interface GeminiPartInlineData extends GeminiPartBaseFile {
  inlineData: {
    mimeType: string;
    data: string;
  };
}
interface GeminiPartFileData extends GeminiPartBaseFile {
  fileData: {
    mimeType: string;
    fileUri: string;
  };
}
interface GeminiPartFunctionCall extends GeminiPartBase {
  functionCall: {
    name: string;
    args?: object;
  };
}
interface GeminiPartFunctionResponse extends GeminiPartBase {
  functionResponse: {
    name: string;
    response: object;
  };
}
type GeminiPart = GeminiPartText | GeminiPartInlineData | GeminiPartFileData | GeminiPartFunctionCall | GeminiPartFunctionResponse;
interface GeminiSafetySetting {
  category: string;
  threshold: string;
}
type GeminiSafetyRating = {
  category: string;
  probability: string;
} & Record<string, unknown>;
interface GeminiCitationMetadata {
  citations: GeminiCitation[];
}
interface GeminiCitation {
  startIndex: number;
  endIndex: number;
  uri: string;
  title: string;
  license: string;
  publicationDate: GoogleTypeDate;
}
interface GoogleTypeDate {
  year: number;
  month: number;
  day: number;
}
interface GeminiGroundingMetadata {
  webSearchQueries?: string[];
  searchEntryPoint?: GeminiSearchEntryPoint;
  groundingChunks: GeminiGroundingChunk[];
  groundingSupports?: GeminiGroundingSupport[];
  retrievalMetadata?: GeminiRetrievalMetadata;
}
interface GeminiSearchEntryPoint {
  renderedContent?: string;
  sdkBlob?: string;
}
interface GeminiGroundingChunk {
  web: GeminiGroundingChunkWeb;
  retrievedContext: GeminiGroundingChunkRetrievedContext;
}
interface GeminiGroundingChunkWeb {
  uri: string;
  title: string;
}
interface GeminiGroundingChunkRetrievedContext {
  uri: string;
  title: string;
  text: string;
}
interface GeminiGroundingSupport {
  segment: GeminiSegment;
  groundingChunkIndices: number[];
  confidenceScores: number[];
}
interface GeminiSegment {
  partIndex: number;
  startIndex: number;
  endIndex: number;
  text: string;
}
interface GeminiRetrievalMetadata {
  googleSearchDynamicRetrievalScore: number;
}
type GeminiUrlRetrievalStatus = "URL_RETRIEVAL_STATUS_SUCCESS" | "URL_RETRIEVAL_STATUS_ERROR";
interface GeminiUrlRetrievalContext {
  retrievedUrl: string;
  urlRetrievalStatus: GeminiUrlRetrievalStatus;
}
interface GeminiUrlRetrievalMetadata {
  urlRetrievalContexts: GeminiUrlRetrievalContext[];
}
type GeminiUrlMetadata = GeminiUrlRetrievalContext;
interface GeminiUrlContextMetadata {
  urlMetadata: GeminiUrlMetadata[];
}
interface GeminiLogprobsResult {
  topCandidates: GeminiLogprobsTopCandidate[];
  chosenCandidates: GeminiLogprobsResultCandidate[];
}
interface GeminiLogprobsTopCandidate {
  candidates: GeminiLogprobsResultCandidate[];
}
interface GeminiLogprobsResultCandidate {
  token: string;
  tokenId: number;
  logProbability: number;
}
type GeminiRole = "system" | "user" | "model" | "function";
interface GeminiContent {
  parts: GeminiPart[];
  role: GeminiRole;
}
interface GeminiTool {
  functionDeclarations?: GeminiFunctionDeclaration[];
  googleSearchRetrieval?: GoogleSearchRetrieval;
  googleSearch?: GoogleSearch;
  urlContext?: UrlContext;
  retrieval?: VertexAIRetrieval;
}
type GoogleSearchToolSetting = boolean | "googleSearchRetrieval" | "googleSearch" | string;
declare const GeminiSearchToolAttributes: string[];
declare const GeminiToolAttributes: string[];
interface GoogleSearchRetrieval {
  dynamicRetrievalConfig?: {
    mode?: string;
    dynamicThreshold?: number;
  };
}
interface GoogleSearch {}
interface UrlContext {}
interface VertexAIRetrieval {
  vertexAiSearch: {
    datastore: string;
  };
  disableAttribution?: boolean;
}
interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters?: GeminiFunctionSchema;
}
interface GeminiFunctionSchema {
  type: GeminiFunctionSchemaType;
  format?: string;
  description?: string;
  nullable?: boolean;
  enum?: string[];
  properties?: Record<string, GeminiFunctionSchema>;
  required?: string[];
  items?: GeminiFunctionSchema;
}
type GeminiFunctionSchemaType = "string" | "number" | "integer" | "boolean" | "array" | "object";
interface GeminiGenerationConfig {
  stopSequences?: string[];
  candidateCount?: number;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  seed?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  responseMimeType?: GoogleAIResponseMimeType;
  responseLogprobs?: boolean;
  logprobs?: number;
  responseModalities?: GoogleAIModelModality[];
  thinkingConfig?: GoogleThinkingConfig;
  speechConfig?: GoogleSpeechConfig;
  responseSchema?: GeminiJsonSchema;
}
interface GeminiRequest {
  contents?: GeminiContent[];
  systemInstruction?: GeminiContent;
  tools?: GeminiTool[];
  toolConfig?: {
    functionCallingConfig: {
      mode: "auto" | "any" | "none";
      allowedFunctionNames?: string[];
    };
  };
  safetySettings?: GeminiSafetySetting[];
  generationConfig?: GeminiGenerationConfig;
  cachedContent?: string;
  /**
   * Custom metadata labels to associate with the API call.
   */
  labels?: Record<string, string>;
}
interface GeminiResponseCandidate {
  content: {
    parts: GeminiPart[];
    role: string;
  };
  finishReason: string;
  index: number;
  tokenCount?: number;
  safetyRatings: GeminiSafetyRating[];
  citationMetadata?: GeminiCitationMetadata;
  groundingMetadata?: GeminiGroundingMetadata;
  urlRetrievalMetadata?: GeminiUrlRetrievalMetadata;
  urlContextMetadata?: GeminiUrlContextMetadata;
  avgLogprobs?: number;
  logprobsResult: GeminiLogprobsResult;
  finishMessage?: string;
}
interface GeminiResponsePromptFeedback {
  blockReason?: string;
  safetyRatings: GeminiSafetyRating[];
}
type ModalityEnum = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | string;
interface ModalityTokenCount {
  modality: ModalityEnum;
  tokenCount: number;
}
interface GenerateContentResponseUsageMetadata {
  promptTokenCount: number;
  toolUsePromptTokenCount: number;
  cachedContentTokenCount: number;
  thoughtsTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  promptTokensDetails: ModalityTokenCount[];
  toolUsePromptTokensDetails: ModalityTokenCount[];
  cacheTokensDetails: ModalityTokenCount[];
  candidatesTokensDetails: ModalityTokenCount[];
  [key: string]: unknown;
}
interface GenerateContentResponseData {
  candidates: GeminiResponseCandidate[];
  promptFeedback: GeminiResponsePromptFeedback;
  usageMetadata: GenerateContentResponseUsageMetadata;
}
type GoogleLLMModelFamily = null | "palm" | "gemini" | "gemma";
type VertexModelFamily = GoogleLLMModelFamily | "claude";
type GoogleLLMResponseData = JsonStream | GenerateContentResponseData | GenerateContentResponseData[];
interface GoogleLLMResponse extends GoogleResponse {
  data: GoogleLLMResponseData | AnthropicResponseData;
}
interface GoogleAISafetyHandler {
  /**
   * A function that will take a response and return the, possibly modified,
   * response or throw an exception if there are safety issues.
   *
   * @throws GoogleAISafetyError
   */
  handle(response: GoogleLLMResponse): GoogleLLMResponse;
}
interface GoogleAISafetyParams {
  safetyHandler?: GoogleAISafetyHandler;
}
type GeminiJsonSchema = Record<string, unknown> & {
  properties?: Record<string, GeminiJsonSchema>;
  type: GeminiFunctionSchemaType;
  nullable?: boolean;
};
interface GeminiJsonSchemaDirty extends GeminiJsonSchema {
  items?: GeminiJsonSchemaDirty;
  properties?: Record<string, GeminiJsonSchemaDirty>;
  additionalProperties?: boolean;
}
type GoogleAIAPI = {
  messageContentToParts?: (content: MessageContent) => Promise<GeminiPart[]>;
  baseMessageToContent?: (message: BaseMessage, prevMessage: BaseMessage | undefined, useSystemInstruction: boolean) => Promise<GeminiContent[]>;
  responseToString: (response: GoogleLLMResponse) => string;
  responseToChatGeneration: (response: GoogleLLMResponse) => ChatGenerationChunk | null;
  chunkToString: (chunk: BaseMessageChunk) => string;
  responseToBaseMessage: (response: GoogleLLMResponse) => BaseMessage;
  responseToChatResult: (response: GoogleLLMResponse) => ChatResult;
  formatData: (input: unknown, parameters: GoogleAIModelRequestParams) => Promise<unknown>;
};
interface GeminiAPIConfig {
  safetyHandler?: GoogleAISafetyHandler;
  mediaManager?: MediaManager;
  useSystemInstruction?: boolean;
  /**
   * How to handle the Google Search tool, since the name (and format)
   * of the tool changes between Gemini 1.5 and Gemini 2.0.
   * true - Change based on the model version. (Default)
   * false - Do not change the tool name provided
   * string value - Use this as the attribute name for the search
   *   tool, adapting any tool attributes if possible.
   * When the model is created, a "true" or default setting
   * will be changed to a string based on the model.
   */
  googleSearchToolAdjustment?: GoogleSearchToolSetting;
}
type GoogleAIAPIConfig = GeminiAPIConfig | AnthropicAPIConfig;
interface GoogleAIAPIParams {
  apiName?: string;
  apiConfig?: GoogleAIAPIConfig;
}
/**
 * Defines the parameters required to initialize a
 * GoogleEmbeddings instance. It extends EmbeddingsParams and
 * GoogleConnectionParams.
 */
interface BaseGoogleEmbeddingsParams<AuthOptions> extends EmbeddingsParams, GoogleConnectionParams<AuthOptions> {
  model: string;
  /**
   * Used to specify output embedding size.
   * If set, output embeddings will be truncated to the size specified.
   */
  dimensions?: number;
  /**
   * An alias for "dimensions"
   */
  outputDimensionality?: number;
}
/**
 * Defines additional options specific to the
 * GoogleEmbeddingsInstance. It extends AsyncCallerCallOptions.
 */
interface BaseGoogleEmbeddingsOptions extends AsyncCallerCallOptions {}
type GoogleEmbeddingsTaskType = "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT" | "SEMANTIC_SIMILARITY" | "CLASSIFICATION" | "CLUSTERING" | "QUESTION_ANSWERING" | "FACT_VERIFICATION" | "CODE_RETRIEVAL_QUERY" | string;
/**
 * Represents an instance for generating embeddings using the Google
 * Vertex AI API. It contains the content to be embedded.
 */
interface VertexEmbeddingsInstance {
  content: string;
  taskType?: GoogleEmbeddingsTaskType;
  title?: string;
}
interface VertexEmbeddingsParameters extends GoogleModelParams {
  autoTruncate?: boolean;
  outputDimensionality?: number;
}
interface VertexEmbeddingsRequest {
  instances: VertexEmbeddingsInstance[];
  parameters?: VertexEmbeddingsParameters;
}
interface AIStudioEmbeddingsRequest {
  content: {
    parts: GeminiPartText[];
  };
  model?: string;
  taskType?: GoogleEmbeddingsTaskType;
  title?: string;
  outputDimensionality?: number;
}
type GoogleEmbeddingsRequest = VertexEmbeddingsRequest | AIStudioEmbeddingsRequest;
interface VertexEmbeddingsResponsePrediction {
  embeddings: {
    statistics: {
      token_count: number;
      truncated: boolean;
    };
    values: number[];
  };
}
/**
 * Defines the structure of the embeddings results returned by the Google
 * Vertex AI API. It extends GoogleBasePrediction and contains the
 * embeddings and their statistics.
 */
interface VertexEmbeddingsResponse extends GoogleResponse {
  data: {
    predictions: VertexEmbeddingsResponsePrediction[];
  };
}
interface AIStudioEmbeddingsResponse extends GoogleResponse {
  data: {
    embedding: {
      values: number[];
    };
  };
}
type GoogleEmbeddingsResponse = VertexEmbeddingsResponse | AIStudioEmbeddingsResponse;
//#endregion
export { AIStudioEmbeddingsRequest, AIStudioEmbeddingsResponse, AnthropicAPIConfig, AnthropicCacheControl, AnthropicContent, AnthropicContentRedactedThinking, AnthropicContentText, AnthropicContentThinking, AnthropicContentToolUse, AnthropicMessage, AnthropicMessageContent, AnthropicMessageContentDocument, AnthropicMessageContentImage, AnthropicMessageContentRedactedThinking, AnthropicMessageContentText, AnthropicMessageContentThinking, AnthropicMessageContentToolResult, AnthropicMessageContentToolResultContent, AnthropicMessageContentToolUse, AnthropicMessageContentToolUseInput, AnthropicMetadata, AnthropicRequest, AnthropicRequestSettings, AnthropicResponseData, AnthropicResponseMessage, AnthropicStreamBaseDelta, AnthropicStreamBaseEvent, AnthropicStreamContentBlockDeltaEvent, AnthropicStreamContentBlockStartEvent, AnthropicStreamContentBlockStopEvent, AnthropicStreamDelta, AnthropicStreamDeltaType, AnthropicStreamErrorEvent, AnthropicStreamEventType, AnthropicStreamInputJsonDelta, AnthropicStreamMessageDeltaEvent, AnthropicStreamMessageStartEvent, AnthropicStreamMessageStopEvent, AnthropicStreamPingEvent, AnthropicStreamTextDelta, AnthropicThinking, AnthropicThinkingDisabled, AnthropicThinkingEnabled, AnthropicTool, AnthropicToolChoice, AnthropicToolChoiceAny, AnthropicToolChoiceAuto, AnthropicToolChoiceTool, AnthropicToolInputSchema, AnthropicUsage, BaseGoogleEmbeddingsOptions, BaseGoogleEmbeddingsParams, GeminiAPIConfig, GeminiCitation, GeminiCitationMetadata, GeminiContent, GeminiFunctionDeclaration, GeminiFunctionSchema, GeminiFunctionSchemaType, GeminiGenerationConfig, GeminiGroundingChunk, GeminiGroundingChunkRetrievedContext, GeminiGroundingChunkWeb, GeminiGroundingMetadata, GeminiGroundingSupport, GeminiJsonSchema, GeminiJsonSchemaDirty, GeminiLogprobsResult, GeminiLogprobsResultCandidate, GeminiLogprobsTopCandidate, GeminiPart, GeminiPartBase, GeminiPartBaseFile, GeminiPartFileData, GeminiPartFunctionCall, GeminiPartFunctionResponse, GeminiPartInlineData, GeminiPartText, GeminiRequest, GeminiResponseCandidate, GeminiRetrievalMetadata, GeminiRole, GeminiSafetyRating, GeminiSafetySetting, GeminiSearchEntryPoint, GeminiSearchToolAttributes, GeminiSegment, GeminiTool, GeminiToolAttributes, GeminiUrlContextMetadata, GeminiUrlMetadata, GeminiUrlRetrievalContext, GeminiUrlRetrievalMetadata, GeminiUrlRetrievalStatus, GeminiVideoMetadata, GenerateContentResponseData, GenerateContentResponseUsageMetadata, GoogleAIAPI, GoogleAIAPIConfig, GoogleAIAPIParams, GoogleAIBaseLLMInput, GoogleAIBaseLanguageModelCallOptions, GoogleAIModelModality, GoogleAIModelParams, GoogleAIModelRequestParams, GoogleAIResponseMimeType, GoogleAISafetyCategory, GoogleAISafetyHandler, GoogleAISafetyMethod, GoogleAISafetyParams, GoogleAISafetySetting, GoogleAISafetyThreshold, GoogleAIToolType, GoogleBaseLLMInput, GoogleClientParams, GoogleConnectionParams, GoogleEmbeddingsRequest, GoogleEmbeddingsResponse, GoogleEmbeddingsTaskType, GoogleLLMModelFamily, GoogleLLMResponse, GoogleLLMResponseData, GoogleModelParams, GoogleMultiSpeakerVoiceConfig, GooglePlatformType, GooglePrebuiltVoiceConfig, GooglePrebuiltVoiceName, GoogleRawResponse, GoogleResponse, GoogleSearch, GoogleSearchRetrieval, GoogleSearchToolSetting, GoogleSpeakerVoiceConfig, GoogleSpeechConfig, GoogleSpeechConfigMulti, GoogleSpeechConfigSimplified, GoogleSpeechConfigSingle, GoogleSpeechSimplifiedLanguage, GoogleSpeechSpeakerName, GoogleSpeechVoice, GoogleSpeechVoiceLanguage, GoogleSpeechVoicesLanguage, GoogleThinkingConfig, GoogleThinkingLevel, GoogleTypeDate, GoogleVoiceConfig, ModalityEnum, ModalityTokenCount, UrlContext, VertexAIRetrieval, VertexEmbeddingsInstance, VertexEmbeddingsParameters, VertexEmbeddingsRequest, VertexEmbeddingsResponse, VertexEmbeddingsResponsePrediction, VertexModelFamily };
//# sourceMappingURL=types.d.cts.map