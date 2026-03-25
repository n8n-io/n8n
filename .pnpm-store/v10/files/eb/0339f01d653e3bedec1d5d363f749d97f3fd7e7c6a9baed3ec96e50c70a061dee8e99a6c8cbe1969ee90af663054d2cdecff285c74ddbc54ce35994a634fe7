import { Message } from "../types.messages.cjs";
import { CheckpointsStreamEvent, CustomStreamEvent, DebugStreamEvent, ErrorStreamEvent, EventsStreamEvent, FeedbackStreamEvent, MessagesTupleStreamEvent, MetadataStreamEvent, TasksStreamEvent, ToolsStreamEvent, UpdatesStreamEvent, ValuesStreamEvent } from "../types.stream.cjs";
import { BagTemplate } from "../types.template.cjs";
import { SubagentStreamInterface } from "./types.cjs";
import { MessageTupleManager } from "./messages.cjs";
import { BaseMessage } from "@langchain/core/messages";

//#region src/ui/manager.d.ts
type GetUpdateType<Bag extends BagTemplate, StateType extends Record<string, unknown>> = Bag extends {
  UpdateType: unknown;
} ? Bag["UpdateType"] : Partial<StateType>;
type GetCustomEventType<Bag extends BagTemplate> = Bag extends {
  CustomEventType: unknown;
} ? Bag["CustomEventType"] : unknown;
type EventStreamMap<StateType, UpdateType, CustomType> = {
  values: ValuesStreamEvent<StateType>;
  updates: UpdatesStreamEvent<UpdateType>;
  custom: CustomStreamEvent<CustomType>;
  debug: DebugStreamEvent;
  messages: MessagesTupleStreamEvent;
  events: EventsStreamEvent;
  metadata: MetadataStreamEvent;
  checkpoints: CheckpointsStreamEvent<StateType>;
  tasks: TasksStreamEvent<StateType, UpdateType>;
  error: ErrorStreamEvent;
  feedback: FeedbackStreamEvent;
  tools: ToolsStreamEvent;
};
type EventStreamEvent<StateType, UpdateType, CustomType> = EventStreamMap<StateType, UpdateType, CustomType>[keyof EventStreamMap<StateType, UpdateType, CustomType>];
interface StreamManagerEventCallbacks<StateType extends Record<string, unknown>, Bag extends BagTemplate = BagTemplate> {
  onUpdateEvent?: (data: UpdatesStreamEvent<GetUpdateType<Bag, StateType>>["data"], options: {
    namespace: string[] | undefined;
    mutate: (update: Partial<StateType> | ((prev: StateType) => Partial<StateType>)) => void;
  }) => void;
  onCustomEvent?: (data: GetCustomEventType<Bag>, options: {
    namespace: string[] | undefined;
    mutate: (update: Partial<StateType> | ((prev: StateType) => Partial<StateType>)) => void;
  }) => void;
  onMetadataEvent?: (data: MetadataStreamEvent["data"]) => void;
  onLangChainEvent?: (data: EventsStreamEvent["data"]) => void;
  onDebugEvent?: (data: DebugStreamEvent["data"], options: {
    namespace: string[] | undefined;
  }) => void;
  onCheckpointEvent?: (data: CheckpointsStreamEvent<StateType>["data"], options: {
    namespace: string[] | undefined;
  }) => void;
  onTaskEvent?: (data: TasksStreamEvent<StateType, GetUpdateType<Bag, StateType>>["data"], options: {
    namespace: string[] | undefined;
  }) => void;
  onToolEvent?: (data: ToolsStreamEvent["data"], options: {
    namespace: string[] | undefined;
    mutate: (update: Partial<StateType> | ((prev: StateType) => Partial<StateType>)) => void;
  }) => void;
}
/**
 * Options for StreamManager constructor.
 */
interface StreamManagerOptions {
  /**
   * Throttle the stream updates.
   * If a number is provided, updates are throttled to the given milliseconds.
   * If `true`, updates are batched in a single macrotask.
   * If `false`, updates are not throttled.
   */
  throttle: number | boolean;
  /**
   * Tool names that indicate subagent invocation.
   *
   * When an AI message contains tool calls with these names, they are
   * automatically tracked as subagent executions. This enables the
   * `subagents`, `activeSubagents`, `getSubagent()`, and `getSubagentsByType()`
   * properties on the stream.
   *
   * @default ["task"]
   *
   * @example
   * ```typescript
   * // Track both "task" and "delegate" as subagent tools
   * subagentToolNames: ["task", "delegate", "spawn_agent"]
   * ```
   */
  subagentToolNames?: string[];
  /**
   * Filter out messages from subagent streams in the main messages array.
   *
   * When enabled, messages from subagraph executions (those with a `tools:` namespace)
   * are excluded from `stream.messages`. Instead, these messages are tracked
   * per-subagent and accessible via `stream.subagents.get(id).messages`.
   *
   * This is useful for deep agent architectures where you want to display
   * the main conversation separately from subagent activity.
   *
   * @default false
   *
   * @example
   * ```typescript
   * const stream = useStream({
   *   assistantId: "my-agent",
   *   filterSubagentMessages: true,
   * });
   *
   * // Main thread messages only (no subagent messages)
   * stream.messages
   *
   * // Access subagent messages individually
   * stream.subagents.get("call_xyz").messages
   * ```
   */
  filterSubagentMessages?: boolean;
  /**
   * Converts a @langchain/core BaseMessage to the desired output format.
   *
   * Defaults to `toMessageDict` which produces plain Message objects.
   * Framework SDKs pass `toMessageClass` (identity) to keep class instances.
   */
  toMessage?: (chunk: BaseMessage) => Message | BaseMessage;
}
declare class StreamManager<StateType extends Record<string, unknown>, Bag extends BagTemplate = BagTemplate> {
  private abortRef;
  private messages;
  private subagentManager;
  private listeners;
  private throttle;
  private filterSubagentMessages;
  private toMessage;
  private queue;
  private queueSize;
  private state;
  constructor(messages: MessageTupleManager, options: StreamManagerOptions);
  /**
   * Increment version counter to trigger React re-renders.
   * Called when subagent state changes.
   */
  private bumpVersion;
  /**
   * Get all subagents as a Map.
   */
  getSubagents(): Map<string, SubagentStreamInterface>;
  /**
   * Get all currently running subagents.
   */
  getActiveSubagents(): SubagentStreamInterface[];
  /**
   * Get a specific subagent by tool call ID.
   */
  getSubagent(toolCallId: string): SubagentStreamInterface | undefined;
  /**
   * Get all subagents of a specific type.
   */
  getSubagentsByType(type: string): SubagentStreamInterface[];
  /**
   * Get all subagents triggered by a specific AI message.
   */
  getSubagentsByMessage(messageId: string): SubagentStreamInterface[];
  /**
   * Reconstruct subagent state from historical messages.
   *
   * This method should be called when loading thread history to restore
   * subagent visualization after:
   * - Page refresh (when stream has already completed)
   * - Loading thread history
   * - Navigating between threads
   *
   * @param messages - Array of messages from thread history
   * @param options - Optional configuration
   * @param options.skipIfPopulated - If true, skip reconstruction if subagents already exist
   */
  reconstructSubagents(messages: Message[], options?: {
    skipIfPopulated?: boolean;
  }): void;
  /**
   * Check if any subagents are currently tracked.
   */
  hasSubagents(): boolean;
  private setState;
  private notifyListeners;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => {
    isLoading: boolean;
    values: [values: StateType, kind: "stop" | "stream"] | null;
    error: unknown; /** Version counter to force React re-renders on subagent changes */
    version: number;
  };
  get isLoading(): boolean;
  get values(): StateType | null;
  get error(): unknown;
  setStreamValues: (values: StateType | ((prev: StateType | null, kind: "stop" | "stream") => StateType | null) | null, kind?: "stop" | "stream") => void;
  private getMutateFn;
  private matchEventType;
  protected enqueue: (action: (signal: AbortSignal) => Promise<AsyncGenerator<EventStreamEvent<StateType, GetUpdateType<Bag, StateType>, GetCustomEventType<Bag>>, any, any>>, options: {
    getMessages: (values: StateType) => Message[];
    setMessages: (current: StateType, messages: Message[]) => StateType;
    initialValues: StateType;
    callbacks: StreamManagerEventCallbacks<StateType, Bag>;
    onSuccess: () => void | StateType | Promise<void | StateType | null | undefined> | null | undefined;
    onError: (error: unknown) => void | Promise<void>;
    onFinish?: (() => void) | undefined;
  }) => Promise<void>;
  start: (action: (signal: AbortSignal) => Promise<AsyncGenerator<EventStreamEvent<StateType, GetUpdateType<Bag, StateType>, GetCustomEventType<Bag>>, any, any>>, options: {
    getMessages: (values: StateType) => Message[];
    setMessages: (current: StateType, messages: Message[]) => StateType;
    initialValues: StateType;
    callbacks: StreamManagerEventCallbacks<StateType, Bag>;
    onSuccess: () => void | StateType | Promise<void | StateType | null | undefined> | null | undefined;
    onError: (error: unknown) => void | Promise<void>;
    onFinish?: (() => void) | undefined;
  }, startOptions?: {
    /**
     * If true, abort any currently running stream before starting this one.
     * Used for multitask_strategy: "interrupt" and "rollback" to unblock
     * the queue so the new run request can proceed immediately.
     */
    abortPrevious?: boolean | undefined;
  } | undefined) => Promise<void>;
  stop: (historyValues: StateType, options: {
    onStop?: ((options: {
      mutate: (update: Partial<StateType> | ((prev: StateType) => Partial<StateType>)) => void;
    }) => void) | undefined;
  }) => Promise<void>;
  clear: () => void;
}
//#endregion
export { EventStreamEvent, StreamManager };
//# sourceMappingURL=manager.d.cts.map