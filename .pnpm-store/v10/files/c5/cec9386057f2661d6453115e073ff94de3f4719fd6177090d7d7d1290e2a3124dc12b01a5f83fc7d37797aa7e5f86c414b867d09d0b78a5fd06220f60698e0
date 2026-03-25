import { BaseFunctionCallOptions } from "@langchain/core/language_models/base";
import { StructuredToolInterface } from "@langchain/core/tools";
import { BaseChatModel, BaseChatModelParams } from "@langchain/core/language_models/chat_models";
import { ChatResult } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { BaseMessage } from "@langchain/core/messages";
import { OpenAIClient } from "@langchain/openai";

//#region src/chat_models/minimax.d.ts

/**
 * Type representing the sender_type of a message in the Minimax chat model.
 */
type MinimaxMessageRole = "BOT" | "USER" | "FUNCTION";
/**
 * Interface representing a message in the Minimax chat model.
 */
interface MinimaxChatCompletionRequestMessage {
  sender_type: MinimaxMessageRole;
  sender_name?: string;
  text: string;
}
/**
 * Interface representing a request for a chat completion.
 */
interface MinimaxChatCompletionRequest {
  model: string;
  messages: MinimaxChatCompletionRequestMessage[];
  stream?: boolean;
  prompt?: string;
  temperature?: number;
  top_p?: number;
  tokens_to_generate?: number;
  skip_info_mask?: boolean;
  mask_sensitive_info?: boolean;
  beam_width?: number;
  use_standard_sse?: boolean;
  role_meta?: RoleMeta;
  bot_setting?: BotSetting[];
  reply_constraints?: ReplyConstraints;
  sample_messages?: MinimaxChatCompletionRequestMessage[];
  /**
   * A list of functions the model may generate JSON inputs for.
   * @type {Array<OpenAIClient.Chat.ChatCompletionCreateParams.Function[]>}
   */
  functions?: OpenAIClient.Chat.ChatCompletionCreateParams.Function[];
  plugins?: string[];
}
interface RoleMeta {
  role_meta: string;
  bot_name: string;
}
interface RawGlyph {
  type: "raw";
  raw_glyph: string;
}
interface JsonGlyph {
  type: "json_value";
  json_properties: any;
}
type ReplyConstraintsGlyph = RawGlyph | JsonGlyph;
interface ReplyConstraints {
  sender_type: string;
  sender_name: string;
  glyph?: ReplyConstraintsGlyph;
}
interface BotSetting {
  content: string;
  bot_name: string;
}
declare interface ConfigurationParameters {
  basePath?: string;
  headers?: Record<string, string>;
}
/**
 * Interface defining the input to the ChatMinimax class.
 */
declare interface MinimaxChatInputBase {
  /**
   * Model name to use
   * Alias for `model`
   * @default "abab5.5-chat"
   */
  modelName: string;
  /**
   * Model name to use
   * @default "abab5.5-chat"
   */
  model: string;
  /** Whether to stream the results or not. Defaults to false. */
  streaming?: boolean;
  prefixMessages?: MinimaxChatCompletionRequestMessage[];
  /**
   * API key to use when making requests. Defaults to the value of
   * `MINIMAX_GROUP_ID` environment variable.
   */
  minimaxGroupId?: string;
  /**
   * Secret key to use when making requests. Defaults to the value of
   * `MINIMAX_API_KEY` environment variable.
   * Alias for `apiKey`
   */
  minimaxApiKey?: string;
  /**
   * Secret key to use when making requests. Defaults to the value of
   * `MINIMAX_API_KEY` environment variable.
   */
  apiKey?: string;
  /** Amount of randomness injected into the response. Ranges
   * from 0 to 1 (0 is not included). Use temp closer to 0 for analytical /
   * multiple choice, and temp closer to 1 for creative
   * and generative tasks. Defaults to 0.95.
   */
  temperature?: number;
  /**
   *  The smaller the sampling method, the more determinate the result;
   *  the larger the number, the more random the result.
   */
  topP?: number;
  /**
   * Enable Chatcompletion pro
   */
  proVersion?: boolean;
  /**
   *  Pay attention to the maximum number of tokens generated,
   *  this parameter does not affect the generation effect of the model itself,
   *  but only realizes the function by truncating the tokens exceeding the limit.
   *  It is necessary to ensure that the number of tokens of the input context plus this value is less than 6144 or 16384,
   *  otherwise the request will fail.
   */
  tokensToGenerate?: number;
}
declare interface MinimaxChatInputNormal {
  /**
   *  Dialogue setting, characters, or functionality setting.
   */
  prompt?: string;
  /**
   *  Sensitize text information in the output that may involve privacy issues,
   *  currently including but not limited to emails, domain names,
   *  links, ID numbers, home addresses, etc. Default false, ie. enable sensitization.
   */
  skipInfoMask?: boolean;
  /**
   *  Whether to use the standard SSE format, when set to true,
   *  the streaming results will be separated by two line breaks.
   *  This parameter only takes effect when stream is set to true.
   */
  useStandardSse?: boolean;
  /**
   *  If it is true, this indicates that the current request is set to continuation mode,
   *  and the response is a continuation of the last sentence in the incoming messages;
   *  at this time, the last sender is not limited to USER, it can also be BOT.
   *  Assuming the last sentence of incoming messages is {"sender_type": " U S E R", "text": "天生我材"},
   *  the completion of the reply may be "It must be useful."
   */
  continueLastMessage?: boolean;
  /**
   *  How many results to generate; the default is 1 and the maximum is not more than 4.
   *  Because beamWidth generates multiple results, it will consume more tokens.
   */
  beamWidth?: number;
  /**
   * Dialogue Metadata
   */
  roleMeta?: RoleMeta;
}
declare interface MinimaxChatInputPro extends MinimaxChatInputBase {
  /**
   *  For the text information in the output that may involve privacy issues,
   *  code masking is currently included but not limited to emails, domains, links, ID numbers, home addresses, etc.,
   *  with the default being true, that is, code masking is enabled.
   */
  maskSensitiveInfo?: boolean;
  /**
   *  Default bot name
   */
  defaultBotName?: string;
  /**
   *  Default user name
   */
  defaultUserName?: string;
  /**
   *  Setting for each robot, only available for pro version.
   */
  botSetting?: BotSetting[];
  replyConstraints?: ReplyConstraints;
}
type MinimaxChatInput = MinimaxChatInputNormal & MinimaxChatInputPro;
interface ChatMinimaxCallOptions extends BaseFunctionCallOptions {
  tools?: StructuredToolInterface[];
  defaultUserName?: string;
  defaultBotName?: string;
  plugins?: string[];
  botSetting?: BotSetting[];
  replyConstraints?: ReplyConstraints;
  sampleMessages?: BaseMessage[];
}
/**
 * Wrapper around Minimax large language models that use the Chat endpoint.
 *
 * To use you should have the `MINIMAX_GROUP_ID` and `MINIMAX_API_KEY`
 * environment variable set.
 * @example
 * ```typescript
 * // Define a chat prompt with a system message setting the context for translation
 * const chatPrompt = ChatPromptTemplate.fromMessages([
 *   SystemMessagePromptTemplate.fromTemplate(
 *     "You are a helpful assistant that translates {input_language} to {output_language}.",
 *   ),
 *   HumanMessagePromptTemplate.fromTemplate("{text}"),
 * ]);
 *
 * // Create a new LLMChain with the chat model and the defined prompt
 * const chainB = new LLMChain({
 *   prompt: chatPrompt,
 *   llm: new ChatMinimax({ temperature: 0.01 }),
 * });
 *
 * // Call the chain with the input language, output language, and the text to translate
 * const resB = await chainB.call({
 *   input_language: "English",
 *   output_language: "Chinese",
 *   text: "I love programming.",
 * });
 *
 * // Log the result
 * console.log({ resB });
 *
 * ```
 */
declare class ChatMinimax extends BaseChatModel<ChatMinimaxCallOptions> implements MinimaxChatInput {
  static lc_name(): string;
  get callKeys(): (keyof ChatMinimaxCallOptions)[];
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  lc_serializable: boolean;
  minimaxGroupId?: string;
  minimaxApiKey?: string;
  apiKey?: string;
  streaming: boolean;
  prompt?: string;
  modelName: string;
  model: string;
  defaultBotName?: string;
  defaultUserName?: string;
  prefixMessages?: MinimaxChatCompletionRequestMessage[];
  apiUrl: string;
  basePath?: string;
  headers?: Record<string, string>;
  temperature?: number;
  topP?: number;
  tokensToGenerate?: number;
  skipInfoMask?: boolean;
  proVersion?: boolean;
  beamWidth?: number;
  botSetting?: BotSetting[];
  continueLastMessage?: boolean;
  maskSensitiveInfo?: boolean;
  roleMeta?: RoleMeta;
  useStandardSse?: boolean;
  replyConstraints?: ReplyConstraints;
  constructor(fields?: Partial<MinimaxChatInput> & BaseChatModelParams & {
    configuration?: ConfigurationParameters;
  });
  fallbackBotName(options?: this["ParsedCallOptions"]): string;
  defaultReplyConstraints(options?: this["ParsedCallOptions"]): ReplyConstraints;
  /**
   * Get the parameters used to invoke the model
   */
  invocationParams(options?: this["ParsedCallOptions"]): Omit<MinimaxChatCompletionRequest, "messages">;
  /**
   * Get the identifying parameters for the model
   */
  identifyingParams(): {
    model: string;
    stream?: boolean | undefined;
    prompt?: string | undefined;
    temperature?: number | undefined;
    top_p?: number | undefined;
    tokens_to_generate?: number | undefined;
    skip_info_mask?: boolean | undefined;
    mask_sensitive_info?: boolean | undefined;
    beam_width?: number | undefined;
    use_standard_sse?: boolean | undefined;
    role_meta?: RoleMeta | undefined;
    bot_setting?: BotSetting[] | undefined;
    reply_constraints?: ReplyConstraints | undefined;
    sample_messages?: MinimaxChatCompletionRequestMessage[] | undefined;
    functions?: OpenAIClient.ChatCompletionCreateParams.Function[] | undefined;
    plugins?: string[] | undefined;
  };
  /**
   * Convert a list of messages to the format expected by the model.
   * @param messages
   * @param options
   */
  messageToMinimaxMessage(messages?: BaseMessage[], options?: this["ParsedCallOptions"]): MinimaxChatCompletionRequestMessage[] | undefined;
  /** @ignore */
  _generate(messages: BaseMessage[], options?: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  /** @ignore */
  completionWithRetry(request: MinimaxChatCompletionRequest, stream: boolean, signal?: AbortSignal, onmessage?: (event: MessageEvent) => void): Promise<ChatCompletionResponse>;
  _llmType(): string;
  /** @ignore */
  _combineLLMOutput(): never[];
  private botSettingFallback;
}
/** ---Response Model---* */
/**
 * Interface representing a message responsed in the Minimax chat model.
 */
interface ChatCompletionResponseMessage {
  sender_type: MinimaxMessageRole;
  sender_name?: string;
  text: string;
  function_call?: ChatCompletionResponseMessageFunctionCall;
}
/**
 * Interface representing the usage of tokens in a chat completion.
 */
interface TokenUsage {
  total_tokens?: number;
}
interface BaseResp {
  status_code?: number;
  status_msg?: string;
}
/**
 * The name and arguments of a function that should be called, as generated by the model.
 * @export
 * @interface ChatCompletionResponseMessageFunctionCall
 */
interface ChatCompletionResponseMessageFunctionCall {
  /**
   * The name of the function to call.
   * @type {string}
   * @memberof ChatCompletionResponseMessageFunctionCall
   */
  name?: string;
  /**
   * The arguments to call the function with, as generated by the model in JSON format. Note that the model does not always generate valid JSON, and may hallucinate parameters not defined by your function schema. Validate the arguments in your code before calling your function.
   * @type {string}
   * @memberof ChatCompletionResponseMessageFunctionCall
   */
  arguments?: string;
}
/**
 *
 * @export
 * @interface ChatCompletionResponseChoices
 */
interface ChatCompletionResponseChoicesPro {
  /**
   *
   * @type {string}
   * @memberof ChatCompletionResponseChoices
   */
  messages?: ChatCompletionResponseMessage[];
  /**
   *
   * @type {string}
   * @memberof ChatCompletionResponseChoices
   */
  finish_reason?: string;
}
interface ChatCompletionResponseChoices {
  delta?: string;
  text?: string;
  index?: number;
  finish_reason?: string;
}
/**
 * Interface representing a response from a chat completion.
 */
interface ChatCompletionResponse {
  model: string;
  created: number;
  reply: string;
  input_sensitive?: boolean;
  input_sensitive_type?: number;
  output_sensitive?: boolean;
  output_sensitive_type?: number;
  usage?: TokenUsage;
  base_resp?: BaseResp;
  choices: Array<ChatCompletionResponseChoicesPro & ChatCompletionResponseChoices>;
}
//#endregion
export { ChatCompletionResponseChoicesPro, ChatCompletionResponseMessageFunctionCall, ChatMinimax, ChatMinimaxCallOptions, ConfigurationParameters, MinimaxMessageRole };
//# sourceMappingURL=minimax.d.cts.map