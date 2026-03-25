import { AgentAction, AgentFinish } from "../agents.cjs";
import { SerializedFields } from "../load/map_keys.cjs";
import { Serializable, Serialized, SerializedNotImplemented } from "../load/serializable.cjs";
import { BaseMessage } from "../messages/base.cjs";
import { MessageStructure, MessageToolSet, MessageType } from "../messages/message.cjs";
import { ChatGenerationChunk, GenerationChunk, LLMResult } from "../outputs.cjs";
import { ChainValues } from "../utils/types/index.cjs";
import { DocumentInterface } from "../documents/document.cjs";

//#region src/callbacks/base.d.ts
type Error = any;
/**
 * Interface for the input parameters of the BaseCallbackHandler class. It
 * allows to specify which types of events should be ignored by the
 * callback handler.
 */
interface BaseCallbackHandlerInput {
  ignoreLLM?: boolean;
  ignoreChain?: boolean;
  ignoreAgent?: boolean;
  ignoreRetriever?: boolean;
  ignoreCustomEvent?: boolean;
  _awaitHandler?: boolean;
  raiseError?: boolean;
}
/**
 * Interface for the indices of a new token produced by an LLM or Chat
 * Model in streaming mode.
 */
interface NewTokenIndices {
  prompt: number;
  completion: number;
}
type HandleLLMNewTokenCallbackFields = {
  chunk?: GenerationChunk | ChatGenerationChunk;
};
/**
 * Abstract class that provides a set of optional methods that can be
 * overridden in derived classes to handle various events during the
 * execution of a LangChain application.
 */
declare abstract class BaseCallbackHandlerMethodsClass {
  /**
   * Called at the start of an LLM or Chat Model run, with the prompt(s)
   * and the run ID.
   */
  handleLLMStart?(llm: Serialized, prompts: string[], runId: string, parentRunId?: string, extraParams?: Record<string, unknown>, tags?: string[], metadata?: Record<string, unknown>, runName?: string): Promise<any> | any;
  /**
   * Called when an LLM/ChatModel in `streaming` mode produces a new token
   */
  handleLLMNewToken?(token: string,
  /**
   * idx.prompt is the index of the prompt that produced the token
   *   (if there are multiple prompts)
   * idx.completion is the index of the completion that produced the token
   *   (if multiple completions per prompt are requested)
   */

  idx: NewTokenIndices, runId: string, parentRunId?: string, tags?: string[], fields?: HandleLLMNewTokenCallbackFields): Promise<any> | any;
  /**
   * Called if an LLM/ChatModel run encounters an error
   */
  handleLLMError?(err: Error, runId: string, parentRunId?: string, tags?: string[], extraParams?: Record<string, unknown>): Promise<any> | any;
  /**
   * Called at the end of an LLM/ChatModel run, with the output and the run ID.
   */
  handleLLMEnd?(output: LLMResult, runId: string, parentRunId?: string, tags?: string[], extraParams?: Record<string, unknown>): Promise<any> | any;
  /**
   * Called at the start of a Chat Model run, with the prompt(s)
   * and the run ID.
   */
  handleChatModelStart?(llm: Serialized, messages: BaseMessage[][], runId: string, parentRunId?: string, extraParams?: Record<string, unknown>, tags?: string[], metadata?: Record<string, unknown>, runName?: string): Promise<any> | any;
  /**
   * Called at the start of a Chain run, with the chain name and inputs
   * and the run ID.
   */
  handleChainStart?(chain: Serialized, inputs: ChainValues, runId: string, runType?: string, tags?: string[], metadata?: Record<string, unknown>, runName?: string, parentRunId?: string, extra?: Record<string, unknown>): Promise<any> | any;
  /**
   * Called if a Chain run encounters an error
   */
  handleChainError?(err: Error, runId: string, parentRunId?: string, tags?: string[], kwargs?: {
    inputs?: Record<string, unknown>;
  }): Promise<any> | any;
  /**
   * Called at the end of a Chain run, with the outputs and the run ID.
   */
  handleChainEnd?(outputs: ChainValues, runId: string, parentRunId?: string, tags?: string[], kwargs?: {
    inputs?: Record<string, unknown>;
  }): Promise<any> | any;
  /**
   * Called at the start of a Tool run, with the tool name and input
   * and the run ID.
   */
  handleToolStart?(tool: Serialized, input: string, runId: string, parentRunId?: string, tags?: string[], metadata?: Record<string, unknown>, runName?: string, toolCallId?: string): Promise<any> | any;
  /**
   * Called if a Tool run encounters an error
   */
  handleToolError?(err: Error, runId: string, parentRunId?: string, tags?: string[]): Promise<any> | any;
  /**
   * Called at the end of a Tool run, with the tool output and the run ID.
   */
  handleToolEnd?(output: any, runId: string, parentRunId?: string, tags?: string[]): Promise<any> | any;
  /**
   * Called when a streaming tool yields a partial value. Tools that are async generators
   * invoke this once per yielded value.
   */
  handleToolEvent?(chunk: unknown, runId: string, parentRunId?: string, tags?: string[]): Promise<any> | any;
  handleText?(text: string, runId: string, parentRunId?: string, tags?: string[]): Promise<void> | void;
  /**
   * Called when an agent is about to execute an action,
   * with the action and the run ID.
   */
  handleAgentAction?(action: AgentAction, runId: string, parentRunId?: string, tags?: string[]): Promise<void> | void;
  /**
   * Called when an agent finishes execution, before it exits.
   * with the final output and the run ID.
   */
  handleAgentEnd?(action: AgentFinish, runId: string, parentRunId?: string, tags?: string[]): Promise<void> | void;
  handleRetrieverStart?(retriever: Serialized, query: string, runId: string, parentRunId?: string, tags?: string[], metadata?: Record<string, unknown>, name?: string): Promise<any> | any;
  handleRetrieverEnd?(documents: DocumentInterface[], runId: string, parentRunId?: string, tags?: string[]): Promise<any> | any;
  handleRetrieverError?(err: Error, runId: string, parentRunId?: string, tags?: string[]): Promise<any> | any;
  handleCustomEvent?(eventName: string, data: any, runId: string, tags?: string[], metadata?: Record<string, any>): Promise<any> | any;
}
/**
 * Base interface for callbacks. All methods are optional. If a method is not
 * implemented, it will be ignored. If a method is implemented, it will be
 * called at the appropriate time. All methods are called with the run ID of
 * the LLM/ChatModel/Chain that is running, which is generated by the
 * CallbackManager.
 *
 * @interface
 */
type CallbackHandlerMethods = BaseCallbackHandlerMethodsClass;
/**
 * Interface for handlers that can indicate a preference for streaming responses.
 * When implemented, this allows the handler to signal whether it prefers to receive
 * streaming responses from language models rather than complete responses.
 */
interface CallbackHandlerPrefersStreaming {
  readonly lc_prefer_streaming: boolean;
}
declare function callbackHandlerPrefersStreaming(x: BaseCallbackHandler): unknown;
/**
 * Abstract base class for creating callback handlers in the LangChain
 * framework. It provides a set of optional methods that can be overridden
 * in derived classes to handle various events during the execution of a
 * LangChain application.
 */
declare abstract class BaseCallbackHandler extends BaseCallbackHandlerMethodsClass implements BaseCallbackHandlerInput, Serializable {
  lc_serializable: boolean;
  get lc_namespace(): ["langchain_core", "callbacks", string];
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get lc_attributes(): {
    [key: string]: string;
  } | undefined;
  get lc_aliases(): {
    [key: string]: string;
  } | undefined;
  get lc_serializable_keys(): string[] | undefined;
  /**
   * The name of the serializable. Override to provide an alias or
   * to preserve the serialized module name in minified environments.
   *
   * Implemented as a static method to support loading logic.
   */
  static lc_name(): string;
  /**
   * The final serialized identifier for the module.
   */
  get lc_id(): string[];
  lc_kwargs: SerializedFields;
  abstract name: string;
  ignoreLLM: boolean;
  ignoreChain: boolean;
  ignoreAgent: boolean;
  ignoreRetriever: boolean;
  ignoreCustomEvent: boolean;
  raiseError: boolean;
  awaitHandlers: boolean;
  constructor(input?: BaseCallbackHandlerInput);
  copy(): BaseCallbackHandler;
  toJSON(): Serialized;
  toJSONNotImplemented(): SerializedNotImplemented;
  static fromMethods(methods: CallbackHandlerMethods): {
    name: string;
    /**
     * Called at the start of an LLM or Chat Model run, with the prompt(s)
     * and the run ID.
     */
    handleLLMStart?(llm: Serialized, prompts: string[], runId: string, parentRunId?: string | undefined, extraParams?: Record<string, unknown> | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, runName?: string | undefined): any;
    /**
     * Called when an LLM/ChatModel in `streaming` mode produces a new token
     */
    handleLLMNewToken?(token: string, idx: NewTokenIndices, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, fields?: HandleLLMNewTokenCallbackFields | undefined): any;
    /**
     * Called if an LLM/ChatModel run encounters an error
     */
    handleLLMError?(err: any, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, extraParams?: Record<string, unknown> | undefined): any;
    /**
     * Called at the end of an LLM/ChatModel run, with the output and the run ID.
     */
    handleLLMEnd?(output: LLMResult, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, extraParams?: Record<string, unknown> | undefined): any;
    /**
     * Called at the start of a Chat Model run, with the prompt(s)
     * and the run ID.
     */
    handleChatModelStart?(llm: Serialized, messages: BaseMessage<MessageStructure<MessageToolSet>, MessageType>[][], runId: string, parentRunId?: string | undefined, extraParams?: Record<string, unknown> | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, runName?: string | undefined): any;
    /**
     * Called at the start of a Chain run, with the chain name and inputs
     * and the run ID.
     */
    handleChainStart?(chain: Serialized, inputs: ChainValues, runId: string, runType?: string | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, runName?: string | undefined, parentRunId?: string | undefined, extra?: Record<string, unknown> | undefined): any;
    /**
     * Called if a Chain run encounters an error
     */
    handleChainError?(err: any, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, kwargs?: {
      inputs?: Record<string, unknown> | undefined;
    } | undefined): any;
    /**
     * Called at the end of a Chain run, with the outputs and the run ID.
     */
    handleChainEnd?(outputs: ChainValues, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, kwargs?: {
      inputs?: Record<string, unknown> | undefined;
    } | undefined): any;
    /**
     * Called at the start of a Tool run, with the tool name and input
     * and the run ID.
     */
    handleToolStart?(tool: Serialized, input: string, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, runName?: string | undefined, toolCallId?: string | undefined): any;
    /**
     * Called if a Tool run encounters an error
     */
    handleToolError?(err: any, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): any;
    /**
     * Called at the end of a Tool run, with the tool output and the run ID.
     */
    handleToolEnd?(output: any, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): any;
    /**
     * Called when a streaming tool yields a partial value. Tools that are async generators
     * invoke this once per yielded value.
     */
    handleToolEvent?(chunk: unknown, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): any;
    handleText?(text: string, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): void | Promise<void>;
    /**
     * Called when an agent is about to execute an action,
     * with the action and the run ID.
     */
    handleAgentAction?(action: AgentAction, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): void | Promise<void>;
    /**
     * Called when an agent finishes execution, before it exits.
     * with the final output and the run ID.
     */
    handleAgentEnd?(action: AgentFinish, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): void | Promise<void>;
    handleRetrieverStart?(retriever: Serialized, query: string, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, name?: string | undefined): any;
    handleRetrieverEnd?(documents: DocumentInterface<Record<string, any>>[], runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): any;
    handleRetrieverError?(err: any, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): any;
    handleCustomEvent?(eventName: string, data: any, runId: string, tags?: string[] | undefined, metadata?: Record<string, any> | undefined): any;
    lc_serializable: boolean;
    get lc_namespace(): ["langchain_core", "callbacks", string];
    get lc_secrets(): {
      [key: string]: string;
    } | undefined;
    get lc_attributes(): {
      [key: string]: string;
    } | undefined;
    get lc_aliases(): {
      [key: string]: string;
    } | undefined;
    get lc_serializable_keys(): string[] | undefined;
    /**
     * The final serialized identifier for the module.
     */
    get lc_id(): string[];
    lc_kwargs: SerializedFields;
    ignoreLLM: boolean;
    ignoreChain: boolean;
    ignoreAgent: boolean;
    ignoreRetriever: boolean;
    ignoreCustomEvent: boolean;
    raiseError: boolean;
    awaitHandlers: boolean;
    copy(): BaseCallbackHandler;
    toJSON(): Serialized;
    toJSONNotImplemented(): SerializedNotImplemented;
  };
}
declare const isBaseCallbackHandler: (x: unknown) => boolean;
//#endregion
export { BaseCallbackHandler, BaseCallbackHandlerInput, CallbackHandlerMethods, CallbackHandlerPrefersStreaming, HandleLLMNewTokenCallbackFields, NewTokenIndices, callbackHandlerPrefersStreaming, isBaseCallbackHandler };
//# sourceMappingURL=base.d.cts.map