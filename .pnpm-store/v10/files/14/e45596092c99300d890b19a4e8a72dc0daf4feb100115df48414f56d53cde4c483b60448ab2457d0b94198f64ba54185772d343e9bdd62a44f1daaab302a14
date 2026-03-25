import { AgentAction, AgentFinish } from "../agents.cjs";
import { Serialized } from "../load/serializable.cjs";
import { BaseMessage } from "../messages/base.cjs";
import { LLMResult } from "../outputs.cjs";
import { ChainValues } from "../utils/types/index.cjs";
import { DocumentInterface } from "../documents/document.cjs";
import { BaseCallbackHandler, CallbackHandlerMethods, HandleLLMNewTokenCallbackFields, NewTokenIndices } from "./base.cjs";

//#region src/callbacks/manager.d.ts
type BaseCallbackManagerMethods = { [K in keyof CallbackHandlerMethods]?: (...args: Parameters<Required<CallbackHandlerMethods>[K]>) => Promise<unknown> };
interface CallbackManagerOptions {
  verbose?: boolean;
  tracing?: boolean;
}
type Callbacks = CallbackManager | (BaseCallbackHandler | CallbackHandlerMethods)[];
interface BaseCallbackConfig {
  /**
   * Name for the tracer run for this call. Defaults to the name of the class.
   */
  runName?: string;
  /**
   * Tags for this call and any sub-calls (eg. a Chain calling an LLM).
   * You can use these to filter calls.
   */
  tags?: string[];
  /**
   * Metadata for this call and any sub-calls (eg. a Chain calling an LLM).
   * Keys should be strings, values should be JSON-serializable.
   */
  metadata?: Record<string, unknown>;
  /**
   * Callbacks for this call and any sub-calls (eg. a Chain calling an LLM).
   * Tags are passed to all callbacks, metadata is passed to handle*Start callbacks.
   */
  callbacks?: Callbacks;
  /**
   * Unique identifier for the tracer run for this call. If not provided, a new UUID
   * will be generated.
   */
  runId?: string;
}
declare function parseCallbackConfigArg(arg: Callbacks | BaseCallbackConfig | undefined): BaseCallbackConfig;
/**
 * Manage callbacks from different components of LangChain.
 */
declare abstract class BaseCallbackManager {
  abstract addHandler(handler: BaseCallbackHandler): void;
  abstract removeHandler(handler: BaseCallbackHandler): void;
  abstract setHandlers(handlers: BaseCallbackHandler[]): void;
  setHandler(handler: BaseCallbackHandler): void;
}
/**
 * Base class for run manager in LangChain.
 */
declare class BaseRunManager {
  readonly runId: string;
  readonly handlers: BaseCallbackHandler[];
  protected readonly inheritableHandlers: BaseCallbackHandler[];
  protected readonly tags: string[];
  protected readonly inheritableTags: string[];
  protected readonly metadata: Record<string, unknown>;
  protected readonly inheritableMetadata: Record<string, unknown>;
  protected readonly _parentRunId?: string | undefined;
  constructor(runId: string, handlers: BaseCallbackHandler[], inheritableHandlers: BaseCallbackHandler[], tags: string[], inheritableTags: string[], metadata: Record<string, unknown>, inheritableMetadata: Record<string, unknown>, _parentRunId?: string | undefined);
  get parentRunId(): string | undefined;
  handleText(text: string): Promise<void>;
  handleCustomEvent(eventName: string, data: any, _runId?: string, _tags?: string[], _metadata?: Record<string, any>): Promise<void>;
}
/**
 * Manages callbacks for retriever runs.
 */
declare class CallbackManagerForRetrieverRun extends BaseRunManager implements BaseCallbackManagerMethods {
  getChild(tag?: string): CallbackManager;
  handleRetrieverEnd(documents: DocumentInterface[]): Promise<void>;
  handleRetrieverError(err: Error | unknown): Promise<void>;
}
declare class CallbackManagerForLLMRun extends BaseRunManager implements BaseCallbackManagerMethods {
  handleLLMNewToken(token: string, idx?: NewTokenIndices, _runId?: string, _parentRunId?: string, _tags?: string[], fields?: HandleLLMNewTokenCallbackFields): Promise<void>;
  handleLLMError(err: Error | unknown, _runId?: string, _parentRunId?: string, _tags?: string[], extraParams?: Record<string, unknown>): Promise<void>;
  handleLLMEnd(output: LLMResult, _runId?: string, _parentRunId?: string, _tags?: string[], extraParams?: Record<string, unknown>): Promise<void>;
}
declare class CallbackManagerForChainRun extends BaseRunManager implements BaseCallbackManagerMethods {
  getChild(tag?: string): CallbackManager;
  handleChainError(err: Error | unknown, _runId?: string, _parentRunId?: string, _tags?: string[], kwargs?: {
    inputs?: Record<string, unknown>;
  }): Promise<void>;
  handleChainEnd(output: ChainValues, _runId?: string, _parentRunId?: string, _tags?: string[], kwargs?: {
    inputs?: Record<string, unknown>;
  }): Promise<void>;
  handleAgentAction(action: AgentAction): Promise<void>;
  handleAgentEnd(action: AgentFinish): Promise<void>;
}
declare class CallbackManagerForToolRun extends BaseRunManager implements BaseCallbackManagerMethods {
  getChild(tag?: string): CallbackManager;
  handleToolError(err: Error | unknown): Promise<void>;
  handleToolEvent(chunk: unknown): Promise<void>;
  handleToolEnd(output: any): Promise<void>;
}
/**
 * @example
 * ```typescript
 * const prompt = PromptTemplate.fromTemplate("What is the answer to {question}?");
 *
 * // Example of using LLMChain with OpenAI and a simple prompt
 * const chain = new LLMChain({
 *   llm: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.9 }),
 *   prompt,
 * });
 *
 * // Running the chain with a single question
 * const result = await chain.call({
 *   question: "What is the airspeed velocity of an unladen swallow?",
 * });
 * console.log("The answer is:", result);
 * ```
 */
declare class CallbackManager extends BaseCallbackManager implements BaseCallbackManagerMethods {
  handlers: BaseCallbackHandler[];
  inheritableHandlers: BaseCallbackHandler[];
  tags: string[];
  inheritableTags: string[];
  metadata: Record<string, unknown>;
  inheritableMetadata: Record<string, unknown>;
  name: string;
  _parentRunId?: string;
  constructor(parentRunId?: string, options?: {
    handlers?: BaseCallbackHandler[];
    inheritableHandlers?: BaseCallbackHandler[];
    tags?: string[];
    inheritableTags?: string[];
    metadata?: Record<string, unknown>;
    inheritableMetadata?: Record<string, unknown>;
  });
  /**
   * Gets the parent run ID, if any.
   *
   * @returns The parent run ID.
   */
  getParentRunId(): string | undefined;
  handleLLMStart(llm: Serialized, prompts: string[], runId?: string | undefined, _parentRunId?: string | undefined, extraParams?: Record<string, unknown> | undefined, _tags?: string[] | undefined, _metadata?: Record<string, unknown> | undefined, runName?: string | undefined): Promise<CallbackManagerForLLMRun[]>;
  handleChatModelStart(llm: Serialized, messages: BaseMessage[][], runId?: string | undefined, _parentRunId?: string | undefined, extraParams?: Record<string, unknown> | undefined, _tags?: string[] | undefined, _metadata?: Record<string, unknown> | undefined, runName?: string | undefined): Promise<CallbackManagerForLLMRun[]>;
  handleChainStart(chain: Serialized, inputs: ChainValues, runId?: string, runType?: string | undefined, _tags?: string[] | undefined, _metadata?: Record<string, unknown> | undefined, runName?: string | undefined, _parentRunId?: string | undefined, extra?: Record<string, unknown> | undefined): Promise<CallbackManagerForChainRun>;
  handleToolStart(tool: Serialized, input: string, runId?: string, _parentRunId?: string | undefined, _tags?: string[] | undefined, _metadata?: Record<string, unknown> | undefined, runName?: string | undefined, toolCallId?: string | undefined): Promise<CallbackManagerForToolRun>;
  handleRetrieverStart(retriever: Serialized, query: string, runId?: string, _parentRunId?: string | undefined, _tags?: string[] | undefined, _metadata?: Record<string, unknown> | undefined, runName?: string | undefined): Promise<CallbackManagerForRetrieverRun>;
  handleCustomEvent?(eventName: string, data: any, runId: string, _tags?: string[], _metadata?: Record<string, any>): Promise<any>;
  addHandler(handler: BaseCallbackHandler, inherit?: boolean): void;
  removeHandler(handler: BaseCallbackHandler): void;
  setHandlers(handlers: BaseCallbackHandler[], inherit?: boolean): void;
  addTags(tags: string[], inherit?: boolean): void;
  removeTags(tags: string[]): void;
  addMetadata(metadata: Record<string, unknown>, inherit?: boolean): void;
  removeMetadata(metadata: Record<string, unknown>): void;
  copy(additionalHandlers?: BaseCallbackHandler[], inherit?: boolean): CallbackManager;
  static fromHandlers(handlers: CallbackHandlerMethods): CallbackManager;
  static configure(inheritableHandlers?: Callbacks, localHandlers?: Callbacks, inheritableTags?: string[], localTags?: string[], inheritableMetadata?: Record<string, unknown>, localMetadata?: Record<string, unknown>, options?: CallbackManagerOptions): CallbackManager | undefined;
  static _configureSync(inheritableHandlers?: Callbacks, localHandlers?: Callbacks, inheritableTags?: string[], localTags?: string[], inheritableMetadata?: Record<string, unknown>, localMetadata?: Record<string, unknown>, options?: CallbackManagerOptions): CallbackManager | undefined;
}
declare function ensureHandler(handler: BaseCallbackHandler | CallbackHandlerMethods): BaseCallbackHandler;
//#endregion
export { BaseCallbackConfig, BaseCallbackManager, BaseRunManager, CallbackManager, CallbackManagerForChainRun, CallbackManagerForLLMRun, CallbackManagerForRetrieverRun, CallbackManagerForToolRun, CallbackManagerOptions, Callbacks, ensureHandler, parseCallbackConfigArg };
//# sourceMappingURL=manager.d.cts.map