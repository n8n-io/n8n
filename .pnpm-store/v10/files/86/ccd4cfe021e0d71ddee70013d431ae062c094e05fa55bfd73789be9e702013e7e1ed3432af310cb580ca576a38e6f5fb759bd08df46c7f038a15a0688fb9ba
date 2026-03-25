import { BaseMessage } from "../messages/base.cjs";
import { AIMessageChunk } from "../messages/ai.cjs";
import { MessageStructure, MessageToolSet } from "../messages/message.cjs";
import { ChatResult } from "../outputs.cjs";
import { InteropZodType } from "../utils/types/zod.cjs";
import { CallbackManagerForLLMRun } from "../callbacks/manager.cjs";
import { Runnable } from "../runnables/base.cjs";
import { BaseLanguageModelInput, StructuredOutputMethodOptions, StructuredOutputMethodParams } from "../language_models/base.cjs";
import { StructuredTool } from "../tools/index.cjs";
import { BaseChatModel, BaseChatModelCallOptions } from "../language_models/chat_models.cjs";
import { ToolSpec } from "../utils/testing/chat_models.cjs";

//#region src/testing/fake_model_builder.d.ts
type ResponseFactory = (messages: BaseMessage[]) => BaseMessage | Error;
interface FakeModelCall {
  messages: BaseMessage[];
  options: any;
}
/**
 * A fake chat model for testing, created via {@link fakeModel}.
 *
 * Queue responses with `.respond()` and `.respondWithTools()`, then
 * pass the instance directly wherever a chat model is expected.
 * Responses are consumed in first-in-first-out order — one per `invoke()` call.
 * When all queued responses are consumed, further invocations throw.
 */
declare class FakeBuiltModel extends BaseChatModel {
  private queue;
  private _alwaysThrowError;
  private _structuredResponseValue;
  private _tools;
  private _callIndex;
  private _calls;
  /**
   * All invocations recorded by this model, in order.
   * Each entry contains the `messages` array and `options` that were
   * passed to `invoke()`.
   */
  get calls(): FakeModelCall[];
  /**
   * The number of times this model has been invoked.
   */
  get callCount(): number;
  constructor();
  _llmType(): string;
  _combineLLMOutput(): never[];
  /**
   * Enqueue a response that the model will return on its next invocation.
   * @param entry A {@link BaseMessage} to return, an `Error` to throw, or
   *   a factory `(messages) => BaseMessage | Error` for dynamic responses.
   * @returns `this`, for chaining.
   */
  respond(entry: BaseMessage | Error | ResponseFactory): this;
  /**
   * Enqueue an {@link AIMessage} that carries the given tool calls.
   * Content is derived from the input messages at invocation time.
   * @param toolCalls Array of tool calls. Each entry needs `name` and
   *   `args`; `id` is optional and auto-generated when omitted.
   * @returns `this`, for chaining.
   */
  respondWithTools(toolCalls: Array<{
    name: string;
    args: Record<string, any>;
    id?: string;
  }>): this;
  /**
   * Make every invocation throw the given error, regardless of the queue.
   * @param error The error to throw.
   * @returns `this`, for chaining.
   */
  alwaysThrow(error: Error): this;
  /**
   * Set the value that {@link withStructuredOutput} will resolve to.
   * @param value The structured object to return.
   * @returns `this`, for chaining.
   */
  structuredResponse(value: Record<string, any>): this;
  /**
   * Bind tools to the model. Returns a new model that shares the same
   * response queue and call history.
   * @param tools The tools to bind, as {@link StructuredTool} instances or
   *   plain {@link ToolSpec} objects.
   * @returns A new RunnableBinding with the tools bound.
   */
  bindTools(tools: (StructuredTool | ToolSpec)[]): Runnable<BaseLanguageModelInput, AIMessageChunk<MessageStructure<MessageToolSet>>, BaseChatModelCallOptions>;
  /**
   * Returns a {@link Runnable} that produces the {@link structuredResponse}
   * value. The schema argument is accepted for compatibility but ignored.
   * @param _params Schema or params (ignored).
   * @param _config Options (ignored).
   * @returns A Runnable that resolves to the structured response value.
   */
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(_params: StructuredOutputMethodParams<RunOutput, boolean> | InteropZodType<RunOutput> | Record<string, any>, _config?: StructuredOutputMethodOptions<boolean>): Runnable<BaseLanguageModelInput, RunOutput> | Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
  _generate(messages: BaseMessage[], options?: this["ParsedCallOptions"], _runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
}
/**
 * Creates a new {@link FakeBuiltModel} for testing.
 *
 * Returns a chainable builder — queue responses, then pass the model
 * anywhere a chat model is expected. Responses are consumed in FIFO
 * order, one per `invoke()` call.
 *
 * ## API summary
 *
 * | Method | Description |
 * | --- | --- |
 * | `fakeModel()` | Creates a new fake chat model. Returns a chainable builder. |
 * | `.respond(message)` | Queue an `AIMessage` (or any `BaseMessage`) to return on the next invocation. |
 * | `.respond(error)` | Queue an `Error` to throw on the next invocation. |
 * | `.respond(factory)` | Queue a function `(messages) => BaseMessage \| Error` for dynamic responses. |
 * | `.respondWithTools(toolCalls)` | Shorthand for `.respond()` with tool calls. Each entry needs `name` and `args`; `id` is optional. |
 * | `.alwaysThrow(error)` | Make every invocation throw this error, regardless of the queue. |
 * | `.structuredResponse(value)` | Set the value returned by `.withStructuredOutput()`. |
 * | `.bindTools(tools)` | Bind tools to the model. Returns a `RunnableBinding` that shares the response queue and call recording. |
 * | `.withStructuredOutput(schema)` | Returns a runnable that produces the `.structuredResponse()` value. |
 * | `.calls` | Array of `{ messages, options }` for every invocation (read-only). |
 * | `.callCount` | Number of times the model has been invoked. |
 *
 * @example
 * ```typescript
 * const model = fakeModel()
 *   .respondWithTools([{ name: "search", args: { query: "weather" } }])
 *   .respond(new AIMessage("Sunny and warm."));
 *
 * const r1 = await model.invoke([new HumanMessage("What's the weather?")]);
 * // r1.tool_calls[0].name === "search"
 *
 * const r2 = await model.invoke([new HumanMessage("Thanks")]);
 * // r2.content === "Sunny and warm."
 * ```
 */
declare function fakeModel(): FakeBuiltModel;
//#endregion
export { FakeBuiltModel, fakeModel };
//# sourceMappingURL=fake_model_builder.d.cts.map