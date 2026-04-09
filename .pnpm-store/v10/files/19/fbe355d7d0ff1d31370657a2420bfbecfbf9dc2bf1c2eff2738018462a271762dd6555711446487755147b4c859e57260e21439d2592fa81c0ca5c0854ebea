import { Interrupt } from "../schema.cjs";
import { DefaultToolCall, Message, ToolCallWithResult } from "../types.messages.cjs";
import { BagTemplate } from "../types.template.cjs";
import { AnyStreamCustomOptions, CustomSubmitOptions, GetConfigurableType, GetInterruptType, GetUpdateType, MessageMetadata, SubagentStreamInterface } from "./types.cjs";
import { MessageTupleManager } from "./messages.cjs";
import { StreamManager } from "./manager.cjs";
import { BaseMessage } from "@langchain/core/messages";

//#region src/ui/orchestrator-custom.d.ts
/**
 * Framework-agnostic orchestrator for custom transport streams.
 *
 * Encapsulates all business logic shared across React, Vue, Svelte, and Angular
 * for custom transport (non-LGP) streaming.
 */
declare class CustomStreamOrchestrator<StateType extends Record<string, unknown> = Record<string, unknown>, Bag extends BagTemplate = BagTemplate> {
  #private;
  readonly stream: StreamManager<StateType, Bag>;
  readonly messageManager: MessageTupleManager;
  /**
   * Create a new {@link CustomStreamOrchestrator} instance.
   *
   * @param options - Configuration options for the custom transport stream,
   *   including thread ID, transport, callbacks, and subagent settings.
   */
  constructor(options: AnyStreamCustomOptions<StateType, Bag>);
  /**
   * Register a listener that is called whenever the orchestrator state changes.
   *
   * @param listener - Callback invoked on each state change.
   * @returns An unsubscribe function that removes the listener.
   */
  subscribe: (listener: () => void) => () => void;
  /**
   * Return the current version number, incremented on each state change.
   * Useful as a cache key for external sync (e.g. `useSyncExternalStore`).
   *
   * @returns The current version counter.
   */
  getSnapshot: () => number;
  /**
   * Synchronize the external thread ID with the orchestrator.
   * If the ID has changed, the current stream is cleared and listeners
   * are notified.
   *
   * @param newId - The new thread ID, or `null` to clear.
   */
  syncThreadId(newId: string | null): void;
  /**
   * The current stream state values, falling back to an empty object
   * when no stream values are available.
   */
  get values(): StateType;
  /**
   * The raw stream state values, or `null` if no stream has been started
   * or values have not yet been received.
   */
  get streamValues(): StateType | null;
  /** The most recent stream error, or `undefined` if no error occurred. */
  get error(): unknown;
  /** Whether a stream is currently in progress. */
  get isLoading(): boolean;
  /** The current branch identifier. */
  get branch(): string;
  /**
   * Update the current branch and notify listeners.
   *
   * @param value - The new branch identifier.
   */
  setBranch(value: string): void;
  /**
   * All messages from the current stream values, converted to
   * {@link BaseMessage} instances. Returns an empty array when no
   * stream values are available.
   */
  get messages(): BaseMessage[];
  /**
   * All tool calls paired with their results extracted from the
   * current stream messages.
   */
  get toolCalls(): ToolCallWithResult<DefaultToolCall>[];
  /**
   * Get tool calls (with results) that belong to a specific AI message.
   *
   * @param message - The AI message whose tool calls to retrieve.
   * @returns Tool calls associated with the given message.
   */
  getToolCalls(message: Message): ToolCallWithResult<DefaultToolCall>[];
  /**
   * All active interrupts from the current stream values.
   * Returns a single breakpoint interrupt when the interrupt array is
   * present but empty, or an empty array when no interrupts exist.
   */
  get interrupts(): Interrupt<GetInterruptType<Bag>>[];
  /**
   * The first active interrupt extracted from the current stream values,
   * or `undefined` if there are no interrupts.
   */
  get interrupt(): Interrupt<GetInterruptType<Bag>> | undefined;
  /**
   * Retrieve stream-level metadata for a given message.
   *
   * @param message - The message to look up metadata for.
   * @param index - Optional positional index used as fallback message ID.
   * @returns The metadata associated with the message, or `undefined`
   *   if no stream metadata is available.
   */
  getMessagesMetadata(message: Message, index?: number): MessageMetadata<StateType> | undefined;
  /** A map of all tracked subagent streams, keyed by tool call ID. */
  get subagents(): Map<string, SubagentStreamInterface>;
  /** The subset of subagent streams that are currently active (loading). */
  get activeSubagents(): SubagentStreamInterface[];
  /**
   * Look up a single subagent stream by its tool call ID.
   *
   * @param toolCallId - The tool call ID that initiated the subagent.
   * @returns The subagent stream, or `undefined` if not found.
   */
  getSubagent(toolCallId: string): SubagentStreamInterface<Record<string, unknown>, DefaultToolCall, string> | undefined;
  /**
   * Retrieve all subagent streams matching a given tool name / type.
   *
   * @param type - The subagent type (tool name) to filter by.
   * @returns An array of matching subagent streams.
   */
  getSubagentsByType(type: string): SubagentStreamInterface<Record<string, unknown>, DefaultToolCall, string>[];
  /**
   * Retrieve all subagent streams associated with a specific AI message.
   *
   * @param messageId - The ID of the parent AI message.
   * @returns An array of subagent streams linked to the message.
   */
  getSubagentsByMessage(messageId: string): SubagentStreamInterface<Record<string, unknown>, DefaultToolCall, string>[];
  /**
   * Reconstruct subagent streams from history values when subagent
   * filtering is enabled and the stream is not currently loading.
   * This is a no-op if subagents are already populated.
   */
  reconstructSubagentsIfNeeded(): void;
  /**
   * Abort the current stream and invoke the `onStop` callback
   * if one was provided in the options.
   */
  stop(): void;
  /**
   * Switch to a different thread. If the thread ID actually changed,
   * the current stream is cleared and listeners are notified.
   *
   * @param newThreadId - The thread ID to switch to, or `null` to clear.
   */
  switchThread(newThreadId: string | null): void;
  /**
   * Start a new stream run against the custom transport.
   *
   * This is the low-level submit entry point that handles thread ID
   * resolution, optimistic value merging, and transport invocation.
   * Prefer {@link submit} unless you need to bypass higher-level wrappers.
   *
   * @param values - The input values to send, or `null`/`undefined` for
   *   a resume-style invocation.
   * @param submitOptions - Optional per-call overrides such as
   *   `optimisticValues`, `config`, `command`, and error callbacks.
   */
  submitDirect(values: GetUpdateType<Bag, StateType> | null | undefined, submitOptions?: CustomSubmitOptions<StateType, GetConfigurableType<Bag>>): Promise<void>;
  /**
   * Submit input values and start a new stream run.
   *
   * Delegates to {@link submitDirect}. Override or wrap this method
   * in framework adapters to add queuing or other middleware.
   *
   * @param values - The input values to send, or `null`/`undefined` for
   *   a resume-style invocation.
   * @param submitOptions - Optional per-call overrides.
   */
  submit(values: GetUpdateType<Bag, StateType> | null | undefined, submitOptions?: CustomSubmitOptions<StateType, GetConfigurableType<Bag>>): Promise<void>;
  /**
   * Tear down the orchestrator. Marks the instance as disposed,
   * unsubscribes from the stream, and aborts any in-progress stream.
   * After calling this method, no further notifications will be emitted.
   */
  dispose(): void;
}
//#endregion
export { CustomStreamOrchestrator };
//# sourceMappingURL=orchestrator-custom.d.cts.map