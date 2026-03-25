import { BinaryOperatorAggregate } from "../channels/binop.cjs";
import { LastValue } from "../channels/last_value.cjs";
import { InteropZodToStateDefinition } from "../graph/zod/meta.cjs";
import { LangGraphRunnableConfig, Runtime } from "../pregel/runnable_types.cjs";
import { AnnotationRoot, SingleReducer, StateDefinition } from "../graph/annotation.cjs";
import { START } from "../constants.cjs";
import { CompiledStateGraph } from "../graph/state.cjs";
import { Messages } from "../graph/message.cjs";
import { MessagesAnnotation } from "../graph/messages_annotation.cjs";
import { ToolNode } from "./tool_node.cjs";
import { All, BaseCheckpointSaver, BaseStore } from "@langchain/langgraph-checkpoint";
import { InteropZodObject, InteropZodType } from "@langchain/core/utils/types";
import { Runnable, RunnableBinding, RunnableLike, RunnableToolLike } from "@langchain/core/runnables";
import * as _langchain_core_messages11 from "@langchain/core/messages";
import { BaseMessage, BaseMessageLike, SystemMessage } from "@langchain/core/messages";
import { DynamicTool, StructuredToolInterface } from "@langchain/core/tools";
import { LanguageModelLike } from "@langchain/core/language_models/base";

//#region src/prebuilt/react_agent_executor.d.ts
/**
 * @deprecated `AgentState` has been moved to {@link https://www.npmjs.com/package/langchain langchain} package.
 * Update your import to `import { AgentState } from "langchain";`
 */
interface AgentState<
// eslint-disable-next-line @typescript-eslint/no-explicit-any
StructuredResponseType extends Record<string, any> = Record<string, any>> {
  messages: BaseMessage[];
  // TODO: This won't be set until we
  // implement managed values in LangGraphJS
  // Will be useful for inserting a message on
  // graph recursion end
  // is_last_step: boolean;
  structuredResponse: StructuredResponseType;
}
type N = typeof START | "agent" | "tools";
type StructuredResponseSchemaOptions<StructuredResponseType> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: InteropZodType<StructuredResponseType> | Record<string, any>;
  prompt?: string;
  strict?: boolean;
  [key: string]: unknown;
};
type ServerTool = Record<string, unknown>;
type ClientTool = StructuredToolInterface | DynamicTool | RunnableToolLike;
type Prompt = SystemMessage | string | ((state: typeof MessagesAnnotation.State, config: LangGraphRunnableConfig) => BaseMessageLike[]) | ((state: typeof MessagesAnnotation.State, config: LangGraphRunnableConfig) => Promise<BaseMessageLike[]>) | Runnable;
/** @deprecated Use Prompt instead. */
type StateModifier = Prompt;
/** @deprecated Use Prompt instead. */
type MessageModifier = SystemMessage | string | ((messages: BaseMessage[]) => BaseMessage[]) | ((messages: BaseMessage[]) => Promise<BaseMessage[]>) | Runnable;
declare const createReactAgentAnnotation: <
// eslint-disable-next-line @typescript-eslint/no-explicit-any
T extends Record<string, any> = Record<string, any>>() => AnnotationRoot<{
  messages: BinaryOperatorAggregate<BaseMessage<_langchain_core_messages11.MessageStructure, _langchain_core_messages11.MessageType>[], Messages>;
  structuredResponse: {
    (): LastValue<T>;
    (annotation: SingleReducer<T, T>): BinaryOperatorAggregate<T, T>;
    Root: <S extends StateDefinition>(sd: S) => AnnotationRoot<S>;
  };
}>;
declare const PreHookAnnotation: AnnotationRoot<{
  llmInputMessages: BinaryOperatorAggregate<BaseMessage<_langchain_core_messages11.MessageStructure, _langchain_core_messages11.MessageType>[], Messages>;
}>;
type PreHookAnnotation = typeof PreHookAnnotation;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAnnotationRoot = AnnotationRoot<any>;
type ToAnnotationRoot<A extends AnyAnnotationRoot | InteropZodObject> = A extends AnyAnnotationRoot ? A : A extends InteropZodObject ? AnnotationRoot<InteropZodToStateDefinition<A>> : never;
/**
 * @deprecated `CreateReactAgentParams` has been moved to {@link https://www.npmjs.com/package/langchain langchain} package.
 * Update your import to `import { CreateAgentParams } from "langchain";`
 */
type CreateReactAgentParams<A extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
StructuredResponseType extends Record<string, any> = Record<string, any>, C extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot> = {
  /** The chat model that can utilize OpenAI-style tool calling. */
  llm: LanguageModelLike | ((state: ToAnnotationRoot<A>["State"] & PreHookAnnotation["State"], runtime: Runtime<ToAnnotationRoot<C>["State"]>) => Promise<LanguageModelLike> | LanguageModelLike);
  /** A list of tools or a ToolNode. */
  tools: ToolNode | (ServerTool | ClientTool)[];
  /**
   * @deprecated Use prompt instead.
   */
  messageModifier?: MessageModifier;
  /**
   * @deprecated Use prompt instead.
   */
  stateModifier?: StateModifier;
  /**
   * An optional prompt for the LLM. This takes full graph state BEFORE the LLM is called and prepares the input to LLM.
   *
   * Can take a few different forms:
   *
   * - str: This is converted to a SystemMessage and added to the beginning of the list of messages in state["messages"].
   * - SystemMessage: this is added to the beginning of the list of messages in state["messages"].
   * - Function: This function should take in full graph state and the output is then passed to the language model.
   * - Runnable: This runnable should take in full graph state and the output is then passed to the language model.
   *
   * Note:
   * Prior to `v0.2.46`, the prompt was set using `stateModifier` / `messagesModifier` parameters.
   * This is now deprecated and will be removed in a future release.
   */
  prompt?: Prompt;
  /**
   * Additional state schema for the agent.
   */
  stateSchema?: A;
  /**
   * An optional schema for the context.
   */
  contextSchema?: C;
  /** An optional checkpoint saver to persist the agent's state. */
  checkpointSaver?: BaseCheckpointSaver | boolean;
  /** An optional checkpoint saver to persist the agent's state. Alias of "checkpointSaver". */
  checkpointer?: BaseCheckpointSaver | boolean;
  /** An optional list of node names to interrupt before running. */
  interruptBefore?: N[] | All;
  /** An optional list of node names to interrupt after running. */
  interruptAfter?: N[] | All;
  store?: BaseStore;
  /**
   * An optional schema for the final agent output.
   *
   * If provided, output will be formatted to match the given schema and returned in the 'structuredResponse' state key.
   * If not provided, `structuredResponse` will not be present in the output state.
   *
   * Can be passed in as:
   *   - Zod schema
   *   - JSON schema
   *   - { prompt, schema }, where schema is one of the above.
   *        The prompt will be used together with the model that is being used to generate the structured response.
   *
   * @remarks
   * **Important**: `responseFormat` requires the model to support `.withStructuredOutput()`.
   *
   * **Note**: The graph will make a separate call to the LLM to generate the structured response after the agent loop is finished.
   * This is not the only strategy to get structured responses, see more options in [this guide](https://langchain-ai.github.io/langgraph/how-tos/react-agent-structured-output/).
   */
  responseFormat?: InteropZodType<StructuredResponseType> | StructuredResponseSchemaOptions<StructuredResponseType>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Record<string, any>;
  /**
   * An optional name for the agent.
   */
  name?: string;
  /**
   * An optional description for the agent.
   * This can be used to describe the agent to the underlying supervisor LLM.
   */
  description?: string | undefined;
  /**
   * Use to specify how to expose the agent name to the underlying supervisor LLM.
         - undefined: Relies on the LLM provider {@link AIMessage#name}. Currently, only OpenAI supports this.
      - `"inline"`: Add the agent name directly into the content field of the {@link AIMessage} using XML-style tags.
          Example: `"How can I help you"` -> `"<name>agent_name</name><content>How can I help you?</content>"`
   */
  includeAgentName?: "inline" | undefined;
  /**
   * An optional node to add before the `agent` node (i.e., the node that calls the LLM).
   * Useful for managing long message histories (e.g., message trimming, summarization, etc.).
   */
  preModelHook?: RunnableLike<ToAnnotationRoot<A>["State"] & PreHookAnnotation["State"], ToAnnotationRoot<A>["Update"] & PreHookAnnotation["Update"], LangGraphRunnableConfig>;
  /**
   * An optional node to add after the `agent` node (i.e., the node that calls the LLM).
   * Useful for implementing human-in-the-loop, guardrails, validation, or other post-processing.
   */
  postModelHook?: RunnableLike<ToAnnotationRoot<A>["State"], ToAnnotationRoot<A>["Update"], LangGraphRunnableConfig>;
  /**
   * Determines the version of the graph to create.
   *
   * Can be one of
   * - `"v1"`: The tool node processes a single message. All tool calls in the message are
   *           executed in parallel within the tool node.
   * - `"v2"`: The tool node processes a single tool call. Tool calls are distributed across
   *           multiple instances of the tool node using the Send API.
   *
   * @default `"v1"`
   */
  version?: "v1" | "v2";
};
/**
 * @deprecated `createReactAgent` has been moved to {@link https://www.npmjs.com/package/langchain langchain} package.
 * Update your import to `import { createAgent } from "langchain";`
 *
 * Creates a StateGraph agent that relies on a chat model utilizing tool calling.
 *
 * @example
 * ```ts
 * import { ChatOpenAI } from "@langchain/openai";
 * import { tool } from "@langchain/core/tools";
 * import { z } from "zod";
 * import { createReactAgent } from "@langchain/langgraph/prebuilt";
 *
 * const model = new ChatOpenAI({
 *   model: "gpt-4o",
 * });
 *
 * const getWeather = tool((input) => {
 *   if (["sf", "san francisco"].includes(input.location.toLowerCase())) {
 *     return "It's 60 degrees and foggy.";
 *   } else {
 *     return "It's 90 degrees and sunny.";
 *   }
 * }, {
 *   name: "get_weather",
 *   description: "Call to get the current weather.",
 *   schema: z.object({
 *     location: z.string().describe("Location to get the weather for."),
 *   })
 * })
 *
 * const agent = createReactAgent({ llm: model, tools: [getWeather] });
 *
 * const inputs = {
 *   messages: [{ role: "user", content: "what is the weather in SF?" }],
 * };
 *
 * const stream = await agent.stream(inputs, { streamMode: "values" });
 *
 * for await (const { messages } of stream) {
 *   console.log(messages);
 * }
 * // Returns the messages in the state at each step of execution
 * ```
 */
declare function createReactAgent<A extends AnyAnnotationRoot | InteropZodObject = typeof MessagesAnnotation,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
StructuredResponseFormat extends Record<string, any> = Record<string, any>, C extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot>(params: CreateReactAgentParams<A, StructuredResponseFormat, C>): CompiledStateGraph<ToAnnotationRoot<A>["State"], ToAnnotationRoot<A>["Update"],
// eslint-disable-next-line @typescript-eslint/no-explicit-any
any, typeof MessagesAnnotation.spec & ToAnnotationRoot<A>["spec"], ReturnType<typeof createReactAgentAnnotation<StructuredResponseFormat>>["spec"] & ToAnnotationRoot<A>["spec"]>;
//#endregion
export { AgentState, CreateReactAgentParams, createReactAgent, createReactAgentAnnotation };
//# sourceMappingURL=react_agent_executor.d.cts.map