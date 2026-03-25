import { Interrupt, ThreadState } from "../../schema.cjs";
import { DefaultToolCall, Message } from "../../types.messages.cjs";
import { StreamMode, ToolProgress } from "../../types.stream.cjs";
import { StreamEvent } from "../../types.cjs";
import { Client } from "../../client.cjs";
import { BagTemplate } from "../../types.template.cjs";
import { GetConfigurableType, GetInterruptType, GetUpdateType, MessageMetadata, SubmitOptions } from "../types.cjs";
import { Sequence } from "../branching.cjs";
import { QueueInterface } from "../queue.cjs";

//#region src/ui/stream/base.d.ts
/**
 * Base stream interface shared by all stream types.
 *
 * Contains core properties for state management, messaging, and stream control
 * that are common to CompiledStateGraph, ReactAgent, and DeepAgent streams.
 *
 * This interface provides the foundation that all stream types build upon:
 * - State management (`values`, `isLoading`, `error`)
 * - Message handling (`messages`)
 * - Interrupt handling (`interrupt`)
 * - Stream lifecycle (`submit`, `stop`)
 * - Branching and history (`branch`, `history`)
 *
 * @template StateType - The state type of the stream
 * @template ToolCall - The tool call type for messages (inferred from agent tools)
 * @template Bag - Type configuration bag for interrupts, configurable, updates, etc.
 *
 * @example
 * ```typescript
 * // BaseStream is not used directly - use one of the specialized interfaces:
 * // - UseGraphStream for CompiledStateGraph
 * // - UseAgentStream for ReactAgent (createAgent)
 * // - UseDeepAgentStream for DeepAgent (createDeepAgent)
 * ```
 */
interface BaseStream<StateType extends Record<string, unknown> = Record<string, unknown>, ToolCall = DefaultToolCall, Bag extends BagTemplate = BagTemplate> {
  /**
   * The current state values of the stream.
   * Updated as streaming events are received.
   */
  values: StateType;
  /**
   * Last seen error from the stream, if any.
   * Reset to `undefined` when a new stream starts.
   */
  error: unknown;
  /**
   * Whether the stream is currently running.
   * `true` while streaming, `false` when idle or completed.
   */
  isLoading: boolean;
  /**
   * Whether the thread is currently being loaded.
   * `true` during initial thread data fetch.
   */
  isThreadLoading: boolean;
  /**
   * Messages accumulated during the stream.
   * Includes both human and AI messages.
   * AI messages include typed tool calls based on the agent's tools.
   */
  messages: Message<ToolCall>[];
  /**
   * Current interrupt, if the stream is interrupted.
   * Convenience alias for `interrupts[0]`.
   * For workflows with multiple concurrent interrupts, use `interrupts` instead.
   */
  interrupt: Interrupt<GetInterruptType<Bag>> | undefined;
  /**
   * All current interrupts from the stream.
   * When using Send() fan-out with per-task interrupt() calls,
   * multiple interrupts may be pending simultaneously.
   */
  interrupts: Interrupt<GetInterruptType<Bag>>[];
  /**
   * Stops the currently running stream.
   * @returns A promise that resolves when the stream is stopped.
   */
  stop: () => Promise<void>;
  /**
   * Create and stream a run to the thread.
   *
   * @param values - The input values to send, or null/undefined for empty input
   * @param options - Optional configuration for the submission
   * @returns A promise that resolves when the stream completes
   */
  submit: (values: GetUpdateType<Bag, StateType> | null | undefined, options?: SubmitOptions<StateType, GetConfigurableType<Bag>>) => Promise<void>;
  /**
   * The current branch of the thread.
   * Used for navigating between different conversation branches.
   */
  branch: string;
  /**
   * Set the branch of the thread.
   * @param branch - The branch identifier to switch to
   */
  setBranch: (branch: string) => void;
  /**
   * Flattened history of thread states of a thread.
   * Contains all states in the current branch's history.
   */
  history: ThreadState<StateType>[];
  /**
   * Tree of all branches for the thread.
   * @experimental This API is experimental and subject to change.
   */
  experimental_branchTree: Sequence<StateType>;
  /**
   * Get the metadata for a message, such as first thread state the message
   * was seen in and branch information.
   *
   * @param message - The message to get the metadata for
   * @param index - The index of the message in the thread
   * @returns The metadata for the message, or undefined if not found
   */
  getMessagesMetadata: (message: Message<ToolCall>, index?: number) => MessageMetadata<StateType> | undefined;
  /**
   * Progress of tool executions during streaming. Populated when stream mode includes "tools"
   * and tools yield or report progress.
   */
  toolProgress: ToolProgress[];
  /**
   * LangGraph SDK client used to send requests and receive responses.
   */
  client: Client;
  /**
   * The ID of the assistant to use.
   */
  assistantId: string;
  /**
   * Join an active stream that's already running.
   *
   * @param runId - The ID of the run to join
   * @param lastEventId - Optional last event ID for resuming from a specific point
   * @param options - Optional configuration for the stream
   */
  joinStream: (runId: string, lastEventId?: string, options?: {
    streamMode?: StreamMode | StreamMode[];
    filter?: (event: {
      id?: string;
      event: StreamEvent;
      data: unknown;
    }) => boolean;
  }) => Promise<void>;
  /**
   * Switch to a different thread, clearing the current stream state.
   * Pass `null` to reset to no thread (a new thread will be created on next submit).
   */
  switchThread: (newThreadId: string | null) => void;
  /**
   * Server-side submission queue. Pending runs created via
   * `multitaskStrategy: "enqueue"` when submitting while the agent is busy.
   */
  queue: QueueInterface<StateType, SubmitOptions<StateType, GetConfigurableType<Bag>>>;
}
//#endregion
export { BaseStream };
//# sourceMappingURL=base.d.cts.map