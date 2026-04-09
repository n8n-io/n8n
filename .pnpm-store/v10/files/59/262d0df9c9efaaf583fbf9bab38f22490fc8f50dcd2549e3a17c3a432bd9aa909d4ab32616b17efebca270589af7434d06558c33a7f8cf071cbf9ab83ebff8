import { Interrupt, ThreadState } from "../schema.cjs";
import { DefaultToolCall, Message, ToolCallWithResult } from "../types.messages.cjs";
import { StreamMode } from "../types.stream.cjs";
import { StreamEvent } from "../types.cjs";
import { Client } from "../client.cjs";
import { BagTemplate } from "../types.template.cjs";
import { AnyStreamOptions, GetConfigurableType, GetInterruptType, MessageMetadata, SubagentStreamInterface, SubmitOptions, UseStreamThread } from "./types.cjs";
import { Sequence } from "./branching.cjs";
import { PendingRunsTracker, QueueEntry } from "./queue.cjs";
import { MessageTupleManager } from "./messages.cjs";
import { StreamManager } from "./manager.cjs";
import { BaseMessage } from "@langchain/core/messages";

//#region src/ui/orchestrator.d.ts
/**
 * Callbacks for resolving dynamic/reactive option values.
 * Framework adapters provide implementations that unwrap reactive primitives.
 */
interface OrchestratorAccessors {
  getClient(): Client;
  getAssistantId(): string;
  getMessagesKey(): string;
}
/**
 * Framework-agnostic orchestrator for LangGraph Platform streams.
 *
 * Encapsulates all business logic shared across React, Vue, Svelte, and Angular:
 * thread management, history fetching, stream lifecycle, queue management,
 * branching, subagent management, and auto-reconnect.
 *
 * Framework adapters subscribe to state changes via {@link subscribe} and
 * map the orchestrator's getters to framework-specific reactive primitives.
 */
declare class StreamOrchestrator<StateType extends Record<string, unknown> = Record<string, unknown>, Bag extends BagTemplate = BagTemplate> {
  #private;
  readonly stream: StreamManager<StateType, Bag>;
  readonly messageManager: MessageTupleManager;
  readonly pendingRuns: PendingRunsTracker<StateType, SubmitOptions<StateType, GetConfigurableType<Bag>>>;
  readonly historyLimit: boolean | number;
  /**
   * Create a new StreamOrchestrator.
   *
   * @param options - Configuration options for the stream, including callbacks,
   *   throttle settings, reconnect behaviour, and subagent filters.
   * @param accessors - Framework-specific accessors that resolve reactive
   *   primitives (client, assistant ID, messages key) at call time.
   */
  constructor(options: AnyStreamOptions<StateType, Bag>, accessors: OrchestratorAccessors);
  /**
   * Register a listener that is called whenever the orchestrator's internal
   * state changes (stream updates, queue changes, history mutations, etc.).
   *
   * @param listener - Callback invoked on every state change.
   * @returns An unsubscribe function that removes the listener.
   */
  subscribe(listener: () => void): () => void;
  /**
   * Return the current version number, incremented on every state change.
   * Useful as a React `useSyncExternalStore` snapshot.
   *
   * @returns The current monotonically increasing version counter.
   */
  getSnapshot(): number;
  /**
   * The current thread ID, or `undefined` if no thread is active.
   */
  get threadId(): string | undefined;
  /**
   * Update thread ID from an external source (e.g. reactive prop change).
   * Clears the current stream and triggers a history fetch.
   * @param newId - The new thread ID to set.
   * @returns The new thread ID.
   */
  setThreadId(newId: string | undefined): void;
  /**
   * The current thread history fetch state, including data, loading status,
   * error, and a {@link UseStreamThread.mutate | mutate} function to
   * manually re-fetch.
   */
  get historyData(): UseStreamThread<StateType>;
  /**
   * Trigger initial history fetch for the current thread ID.
   * Should be called once after construction when the initial threadId is known.
   */
  initThreadId(threadId: string | undefined): void;
  /**
   * The currently active branch identifier. An empty string represents
   * the main (default) branch.
   */
  get branch(): string;
  /**
   * Set the active branch and notify listeners if the value changed.
   *
   * @param value - The branch identifier to switch to.
   */
  setBranch(value: string): void;
  /**
   * Derived branch context computed from the current branch and thread
   * history. Contains the thread head, branch tree, and checkpoint-to-branch
   * mapping for the active branch.
   */
  get branchContext(): {
    branchTree: Sequence<any>;
    flatHistory: ThreadState<any>[];
    branchByCheckpoint: {
      [x: string]: {
        branch: string | undefined;
        branchOptions: string[] | undefined;
      };
    };
    threadHead: ThreadState<any> | undefined;
  };
  /**
   * The state values from the thread head of the current branch history,
   * falling back to {@link AnyStreamOptions.initialValues | initialValues}
   * or an empty object.
   */
  get historyValues(): StateType;
  /**
   * The error from the last task in the thread head, if any.
   * Attempts to parse structured {@link StreamError} instances from JSON.
   */
  get historyError(): unknown;
  /**
   * The latest state values received from the active stream, or `null` if
   * no stream is running or no values have been received yet.
   */
  get streamValues(): StateType | null;
  /**
   * The error from the active stream, if one occurred during streaming.
   */
  get streamError(): unknown;
  /**
   * The merged state values, preferring live stream values over history.
   * This is the primary way to read the current thread state.
   */
  get values(): StateType;
  /**
   * The first available error from the stream, history, or thread fetch.
   * Returns `undefined` when no error is present.
   */
  get error(): unknown;
  /**
   * Whether the stream is currently active and receiving events.
   */
  get isLoading(): boolean;
  /**
   * The messages array extracted from the current {@link values} using the
   * configured messages key.
   */
  get messages(): Message[];
  /**
   * The current messages converted to LangChain {@link BaseMessage} instances.
   * Automatically tracks the `"messages-tuple"` stream mode.
   */
  get messageInstances(): BaseMessage[];
  /**
   * All tool calls with their corresponding results extracted from
   * the current messages. Automatically tracks the `"messages-tuple"`
   * stream mode.
   */
  get toolCalls(): ToolCallWithResult<DefaultToolCall>[];
  /**
   * Get tool calls with results for a specific AI message.
   * Automatically tracks the `"messages-tuple"` stream mode.
   *
   * @param message - The AI message to extract tool calls from.
   * @returns Tool calls whose AI message ID matches the given message.
   */
  getToolCalls(message: Message): ToolCallWithResult<DefaultToolCall>[];
  /**
   * All active interrupts for the current thread state.
   * Returns an empty array when the stream is loading or no interrupts
   * are present. Falls back to a `{ when: "breakpoint" }` sentinel when
   * there are pending next nodes but no explicit interrupt data.
   */
  get interrupts(): Interrupt<GetInterruptType<Bag>>[];
  /**
   * The single most relevant interrupt for the current thread state,
   * or `undefined` if no interrupt is active. Convenience accessor that
   * delegates to {@link extractInterrupts}.
   */
  get interrupt(): Interrupt<GetInterruptType<Bag>> | undefined;
  /**
   * Flattened history messages as LangChain {@link BaseMessage} instances,
   * ordered chronologically across all branch checkpoints.
   *
   * @throws If `fetchStateHistory` was not enabled in the options.
   */
  get flatHistory(): ThreadState<any>[];
  /**
   * Whether the initial thread history is still being loaded and no data
   * is available yet. Returns `false` once the first fetch completes.
   */
  get isThreadLoading(): boolean;
  /**
   * The full branch tree structure for the current thread history.
   *
   * @experimental This API may change in future releases.
   * @throws If `fetchStateHistory` was not enabled in the options.
   */
  get experimental_branchTree(): Sequence<any>;
  /**
   * A map of metadata entries for all messages, derived from history
   * and branch context. Used internally by {@link getMessagesMetadata}.
   */
  get messageMetadata(): {
    messageId: string;
    firstSeenState: ThreadState<StateType> | undefined;
    branch: string | undefined;
    branchOptions: string[] | undefined;
  }[];
  /**
   * Look up metadata for a specific message, merging stream-time metadata
   * with history-derived metadata.
   *
   * @param message - The message to look up metadata for.
   * @param index - Optional positional index used as a fallback identifier.
   * @returns The merged metadata, or `undefined` if none is available.
   */
  getMessagesMetadata(message: Message, index?: number): MessageMetadata<StateType> | undefined;
  /**
   * The list of pending run entries currently waiting in the queue.
   */
  get queueEntries(): readonly QueueEntry<StateType, SubmitOptions<StateType, GetConfigurableType<Bag>>>[];
  /**
   * The number of pending runs in the queue.
   */
  get queueSize(): number;
  /**
   * Cancel and remove a specific pending run from the queue.
   * If the run exists and a thread is active, the run is also cancelled
   * on the server.
   *
   * @param id - The run ID to cancel.
   * @returns `true` if the run was found and removed, `false` otherwise.
   */
  cancelQueueItem(id: string): Promise<boolean>;
  /**
   * Remove all pending runs from the queue and cancel them on the server.
   */
  clearQueue(): Promise<void>;
  /**
   * A map of all known subagent stream interfaces, keyed by tool call ID.
   */
  get subagents(): Map<string, SubagentStreamInterface>;
  /**
   * The subset of subagents that are currently active (streaming).
   */
  get activeSubagents(): SubagentStreamInterface[];
  /**
   * Retrieve a specific subagent stream interface by its tool call ID.
   *
   * @param toolCallId - The tool call ID that spawned the subagent.
   * @returns The subagent interface, or `undefined` if not found.
   */
  getSubagent(toolCallId: string): SubagentStreamInterface<Record<string, unknown>, DefaultToolCall, string> | undefined;
  /**
   * Retrieve all subagent stream interfaces that match a given agent type.
   *
   * @param type - The agent type name to filter by.
   * @returns An array of matching subagent interfaces.
   */
  getSubagentsByType(type: string): SubagentStreamInterface<Record<string, unknown>, DefaultToolCall, string>[];
  /**
   * Retrieve all subagent stream interfaces associated with a specific
   * AI message.
   *
   * @param messageId - The ID of the parent AI message.
   * @returns An array of subagent interfaces spawned by that message.
   */
  getSubagentsByMessage(messageId: string): SubagentStreamInterface<Record<string, unknown>, DefaultToolCall, string>[];
  /**
   * Reconstruct subagents from history messages if applicable.
   * Call this when history finishes loading and the stream isn't active.
   * Returns an AbortController for cancelling the subagent history fetch,
   * or null if no reconstruction was needed.
   */
  reconstructSubagentsIfNeeded(): AbortController | null;
  /**
   * Register additional stream modes that should be included in future
   * stream requests. Modes are deduplicated automatically.
   *
   * @param modes - One or more stream modes to track.
   */
  trackStreamMode(...modes: StreamMode[]): void;
  /**
   * Stop the currently active stream. If reconnect metadata storage is
   * configured, also cancels the run on the server and cleans up stored
   * run metadata.
   */
  stop(): void;
  /**
   * Join an existing run's event stream by run ID. Used for reconnecting
   * to in-progress runs or consuming queued runs.
   *
   * @param runId - The ID of the run to join.
   * @param lastEventId - The last event ID received, for resuming mid-stream.
   *   Defaults to `"-1"` (start from the beginning).
   * @param joinOptions - Additional options for stream mode and event filtering.
   */
  joinStream(runId: string, lastEventId?: string, joinOptions?: {
    streamMode?: StreamMode | StreamMode[];
    filter?: (event: {
      id?: string;
      event: StreamEvent;
      data: unknown;
    }) => boolean;
  }): Promise<void>;
  /**
   * Submit input values directly to the LangGraph Platform, creating a new
   * thread if necessary. Starts a streaming run and processes events until
   * completion. Unlike {@link submit}, this does not handle queueing — if
   * a stream is already active, a concurrent run will be started.
   *
   * @param values - The state values to send as run input.
   * @param submitOptions - Optional configuration for the run (config,
   *   checkpoint, multitask strategy, optimistic values, etc.).
   */
  submitDirect(values: StateType, submitOptions?: SubmitOptions<StateType, GetConfigurableType<Bag>>): Promise<void>;
  /**
   * Trigger queue draining. Framework adapters should call this
   * when isLoading or queue size changes.
   */
  drainQueue(): void;
  /**
   * Submit input values with automatic queue management. If a stream is
   * already active, the run is enqueued (unless the multitask strategy
   * is `"interrupt"` or `"rollback"`, in which case the current run is
   * replaced). Queued runs are drained sequentially via {@link drainQueue}.
   *
   * @param values - The state values to send as run input.
   * @param submitOptions - Optional configuration for the run.
   * @returns The result of {@link submitDirect} if the run was started
   *   immediately, or `void` if the run was enqueued.
   */
  submit(values: StateType, submitOptions?: SubmitOptions<StateType, GetConfigurableType<Bag>>): Promise<ReturnType<typeof this.submitDirect> | void>;
  /**
   * Switch to a different thread (or clear the current thread).
   * Clears the active stream, cancels all queued runs on the previous
   * thread, fetches history for the new thread, and notifies the
   * {@link AnyStreamOptions.onThreadId | onThreadId} callback.
   *
   * @param newThreadId - The thread ID to switch to, or `null` to clear.
   */
  switchThread(newThreadId: string | null): void;
  /**
   * Attempt to reconnect to a previously running stream.
   * Returns true if a reconnection was initiated.
   */
  tryReconnect(): boolean;
  /**
   * Whether reconnect-on-mount behaviour is enabled (i.e. run metadata
   * storage is available).
   */
  get shouldReconnect(): boolean;
  /**
   * Tear down the orchestrator: stop the active stream, remove all
   * internal subscriptions, and mark the instance as disposed.
   * After calling this method, the orchestrator should not be reused.
   */
  dispose(): void;
}
//#endregion
export { OrchestratorAccessors, StreamOrchestrator };
//# sourceMappingURL=orchestrator.d.cts.map