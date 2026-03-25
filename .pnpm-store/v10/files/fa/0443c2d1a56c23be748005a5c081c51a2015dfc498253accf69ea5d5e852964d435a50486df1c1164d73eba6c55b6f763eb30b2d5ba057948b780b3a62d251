import { Checkpoint, Config, Interrupt, Metadata, ThreadState } from "../schema.cjs";
import { Message } from "../types.messages.cjs";
import { CheckpointsStreamEvent, CustomStreamEvent, DebugStreamEvent, EventsStreamEvent, MetadataStreamEvent, StreamMode, TasksStreamEvent, UpdatesStreamEvent } from "../types.stream.cjs";
import { Command, DisconnectMode, Durability, MultitaskStrategy, OnCompletionBehavior } from "../types.cjs";
import { Client, ClientConfig } from "../client.cjs";
import { Sequence } from "../ui/branching.cjs";

//#region src/react/types.d.ts
type MessageMetadata<StateType extends Record<string, unknown>> = {
  /**
   * The ID of the message used.
   */
  messageId: string;
  /**
   * The first thread state the message was seen in.
   */
  firstSeenState: ThreadState<StateType> | undefined;
  /**
   * The branch of the message.
   */
  branch: string | undefined;
  /**
   * The list of branches this message is part of.
   * This is useful for displaying branching controls.
   */
  branchOptions: string[] | undefined;
  /**
   * Metadata sent alongside the message during run streaming.
   * @remarks This metadata only exists temporarily in browser memory during streaming and is not persisted after completion.
   */
  streamMetadata: Record<string, unknown> | undefined;
};
type BagTemplate = {
  ConfigurableType?: Record<string, unknown>;
  InterruptType?: unknown;
  CustomEventType?: unknown;
  UpdateType?: unknown;
};
type GetUpdateType<Bag extends BagTemplate, StateType extends Record<string, unknown>> = Bag extends {
  UpdateType: unknown;
} ? Bag["UpdateType"] : Partial<StateType>;
type GetConfigurableType<Bag extends BagTemplate> = Bag extends {
  ConfigurableType: Record<string, unknown>;
} ? Bag["ConfigurableType"] : Record<string, unknown>;
type GetInterruptType<Bag extends BagTemplate> = Bag extends {
  InterruptType: unknown;
} ? Bag["InterruptType"] : unknown;
type GetCustomEventType<Bag extends BagTemplate> = Bag extends {
  CustomEventType: unknown;
} ? Bag["CustomEventType"] : unknown;
interface RunCallbackMeta {
  run_id: string;
  thread_id: string;
}
interface UseStreamThread<StateType extends Record<string, unknown>> {
  data: ThreadState<StateType>[] | null | undefined;
  error: unknown;
  isLoading: boolean;
  mutate: (mutateId?: string) => Promise<ThreadState<StateType>[] | null | undefined>;
}
interface UseStreamOptions<StateType extends Record<string, unknown> = Record<string, unknown>, Bag extends BagTemplate = BagTemplate> {
  /**
   * The ID of the assistant to use.
   */
  assistantId: string;
  /**
   * Client used to send requests.
   */
  client?: Client;
  /**
   * The URL of the API to use.
   */
  apiUrl?: ClientConfig["apiUrl"];
  /**
   * The API key to use.
   */
  apiKey?: ClientConfig["apiKey"];
  /**
   * Custom call options, such as custom fetch implementation.
   */
  callerOptions?: ClientConfig["callerOptions"];
  /**
   * Default headers to send with requests.
   */
  defaultHeaders?: ClientConfig["defaultHeaders"];
  /**
   * Specify the key within the state that contains messages.
   * Defaults to "messages".
   *
   * @default "messages"
   */
  messagesKey?: string;
  /**
   * Callback that is called when an error occurs.
   */
  onError?: (error: unknown, run: RunCallbackMeta | undefined) => void;
  /**
   * Callback that is called when the stream is finished.
   */
  onFinish?: (state: ThreadState<StateType>, run: RunCallbackMeta | undefined) => void;
  /**
   * Callback that is called when a new stream is created.
   */
  onCreated?: (run: RunCallbackMeta) => void;
  /**
   * Callback that is called when an update event is received.
   */
  onUpdateEvent?: (data: UpdatesStreamEvent<GetUpdateType<Bag, StateType>>["data"], options: {
    namespace: string[] | undefined;
    mutate: (update: Partial<StateType> | ((prev: StateType) => Partial<StateType>)) => void;
  }) => void;
  /**
   * Callback that is called when a custom event is received.
   */
  onCustomEvent?: (data: CustomStreamEvent<GetCustomEventType<Bag>>["data"], options: {
    namespace: string[] | undefined;
    mutate: (update: Partial<StateType> | ((prev: StateType) => Partial<StateType>)) => void;
  }) => void;
  /**
   * Callback that is called when a metadata event is received.
   */
  onMetadataEvent?: (data: MetadataStreamEvent["data"]) => void;
  /**
   * Callback that is called when a LangChain event is received.
   * @see https://langchain-ai.github.io/langgraph/cloud/how-tos/stream_events/#stream-graph-in-events-mode for more details.
   */
  onLangChainEvent?: (data: EventsStreamEvent["data"]) => void;
  /**
   * Callback that is called when a debug event is received.
   * @internal This API is experimental and subject to change.
   */
  onDebugEvent?: (data: DebugStreamEvent["data"], options: {
    namespace: string[] | undefined;
  }) => void;
  /**
   * Callback that is called when a checkpoints event is received.
   */
  onCheckpointEvent?: (data: CheckpointsStreamEvent<StateType>["data"], options: {
    namespace: string[] | undefined;
  }) => void;
  /**
   * Callback that is called when a tasks event is received.
   */
  onTaskEvent?: (data: TasksStreamEvent<StateType, GetUpdateType<Bag, StateType>>["data"], options: {
    namespace: string[] | undefined;
  }) => void;
  /**
   * Callback that is called when the stream is stopped by the user.
   * Provides a mutate function to update the stream state immediately
   * without requiring a server roundtrip.
   *
   * @example
   * ```typescript
   * onStop: ({ mutate }) => {
   *   mutate((prev) => ({
   *     ...prev,
   *     ui: prev.ui?.map(component =>
   *       component.props.isLoading
   *         ? { ...component, props: { ...component.props, stopped: true, isLoading: false }}
   *         : component
   *     )
   *   }));
   * }
   * ```
   */
  onStop?: (options: {
    mutate: (update: Partial<StateType> | ((prev: StateType) => Partial<StateType>)) => void;
  }) => void;
  /**
   * The ID of the thread to fetch history and current values from.
   */
  threadId?: string | null;
  /**
   * Callback that is called when the thread ID is updated (ie when a new thread is created).
   */
  onThreadId?: (threadId: string) => void;
  /** Will reconnect the stream on mount */
  reconnectOnMount?: boolean | (() => RunMetadataStorage);
  /**
   * Initial values to display immediately when loading a thread.
   * Useful for displaying cached thread data while official history loads.
   * These values will be replaced when official thread data is fetched.
   *
   * Note: UI components from initialValues will render immediately if they're
   * predefined in LoadExternalComponent's components prop, providing instant
   * cached UI display without server fetches.
   */
  initialValues?: StateType | null;
  /**
   * Whether to fetch the history of the thread.
   * If true, the history will be fetched from the server. Defaults to 10 entries.
   * If false, only the last state will be fetched from the server.
   * @default true
   */
  fetchStateHistory?: boolean | {
    limit: number;
  };
  /**
   * Manage the thread state externally.
   * @experimental
   */
  experimental_thread?: UseStreamThread<StateType>;
}
interface RunMetadataStorage {
  getItem(key: `lg:stream:${string}`): string | null;
  setItem(key: `lg:stream:${string}`, value: string): void;
  removeItem(key: `lg:stream:${string}`): void;
}
interface UseStream<StateType extends Record<string, unknown> = Record<string, unknown>, Bag extends BagTemplate = BagTemplate> {
  /**
   * The current values of the thread.
   */
  values: StateType;
  /**
   * Last seen error from the thread or during streaming.
   */
  error: unknown;
  /**
   * Whether the stream is currently running.
   */
  isLoading: boolean;
  /**
   * Whether the thread is currently being loaded.
   */
  isThreadLoading: boolean;
  /**
   * Stops the stream.
   */
  stop: () => Promise<void>;
  /**
   * Create and stream a run to the thread.
   */
  submit: (values: GetUpdateType<Bag, StateType> | null | undefined, options?: SubmitOptions<StateType, GetConfigurableType<Bag>>) => Promise<void>;
  /**
   * The current branch of the thread.
   */
  branch: string;
  /**
   * Set the branch of the thread.
   */
  setBranch: (branch: string) => void;
  /**
   * Flattened history of thread states of a thread.
   */
  history: ThreadState<StateType>[];
  /**
   * Tree of all branches for the thread.
   * @experimental
   */
  experimental_branchTree: Sequence<StateType>;
  /**
   * Get the interrupt value for the stream if interrupted.
   */
  interrupt: Interrupt<GetInterruptType<Bag>> | undefined;
  /**
   * Messages inferred from the thread.
   * Will automatically update with incoming message chunks.
   */
  messages: Message[];
  /**
   * Get the metadata for a message, such as first thread state the message
   * was seen in and branch information.
   
   * @param message - The message to get the metadata for.
   * @param index - The index of the message in the thread.
   * @returns The metadata for the message.
   */
  getMessagesMetadata: (message: Message, index?: number) => MessageMetadata<StateType> | undefined;
  /**
   * LangGraph SDK client used to send request and receive responses.
   */
  client: Client;
  /**
   * The ID of the assistant to use.
   */
  assistantId: string;
  /**
   * Join an active stream.
   */
  joinStream: (runId: string, lastEventId?: string, options?: {
    streamMode?: StreamMode | StreamMode[];
  }) => Promise<void>;
}
type ConfigWithConfigurable<ConfigurableType extends Record<string, unknown>> = Config & {
  configurable?: ConfigurableType;
};
interface SubmitOptions<StateType extends Record<string, unknown> = Record<string, unknown>, ContextType extends Record<string, unknown> = Record<string, unknown>> {
  config?: ConfigWithConfigurable<ContextType>;
  context?: ContextType;
  checkpoint?: Omit<Checkpoint, "thread_id"> | null;
  command?: Command;
  interruptBefore?: "*" | string[];
  interruptAfter?: "*" | string[];
  metadata?: Metadata;
  multitaskStrategy?: MultitaskStrategy;
  onCompletion?: OnCompletionBehavior;
  onDisconnect?: DisconnectMode;
  feedbackKeys?: string[];
  streamMode?: Array<StreamMode>;
  runId?: string;
  optimisticValues?: Partial<StateType> | ((prev: StateType) => Partial<StateType>);
  /**
   * Whether or not to stream the nodes of any subgraphs called
   * by the assistant.
   * @default false
   */
  streamSubgraphs?: boolean;
  /**
   * Mark the stream as resumable. All events emitted during the run will be temporarily persisted
   * in order to be re-emitted if the stream is re-joined.
   * @default false
   */
  streamResumable?: boolean;
  /**
   * Whether to checkpoint during the run (or only at the end/interruption).
   * - `"async"`: Save checkpoint asynchronously while the next step executes (default).
   * - `"sync"`: Save checkpoint synchronously before the next step starts.
   * - `"exit"`: Save checkpoint only when the graph exits.
   * @default "async"
   */
  durability?: Durability;
  /**
   * The ID to use when creating a new thread. When provided, this ID will be used
   * for thread creation when threadId is `null` or `undefined`.
   * This enables optimistic UI updates where you know the thread ID
   * before the thread is actually created.
   */
  threadId?: string;
}
/**
 * Transport used to stream the thread.
 * Only applicable for custom endpoints using `toLangGraphEventStream` or `toLangGraphEventStreamResponse`.
 */
interface UseStreamTransport<StateType extends Record<string, unknown> = Record<string, unknown>, Bag extends BagTemplate = BagTemplate> {
  stream: (payload: {
    input: GetUpdateType<Bag, StateType> | null | undefined;
    context: GetConfigurableType<Bag> | undefined;
    command: Command | undefined;
    config: ConfigWithConfigurable<GetConfigurableType<Bag>> | undefined;
    signal: AbortSignal;
  }) => Promise<AsyncGenerator<{
    id?: string;
    event: string;
    data: unknown;
  }>>;
}
type UseStreamCustomOptions<StateType extends Record<string, unknown> = Record<string, unknown>, Bag extends BagTemplate = BagTemplate> = Pick<UseStreamOptions<StateType, Bag>, "messagesKey" | "threadId" | "onThreadId" | "onError" | "onCreated" | "onUpdateEvent" | "onCustomEvent" | "onMetadataEvent" | "onLangChainEvent" | "onDebugEvent" | "onCheckpointEvent" | "onTaskEvent" | "onStop" | "initialValues"> & {
  transport: UseStreamTransport<StateType, Bag>;
};
type UseStreamCustom<StateType extends Record<string, unknown> = Record<string, unknown>, Bag extends BagTemplate = BagTemplate> = Pick<UseStream<StateType, Bag>, "values" | "error" | "isLoading" | "stop" | "interrupt" | "messages"> & {
  submit: (values: GetUpdateType<Bag, StateType> | null | undefined, options?: CustomSubmitOptions<StateType, GetConfigurableType<Bag>>) => Promise<void>;
};
type CustomSubmitOptions<StateType extends Record<string, unknown> = Record<string, unknown>, ConfigurableType extends Record<string, unknown> = Record<string, unknown>> = Pick<SubmitOptions<StateType, ConfigurableType>, "optimisticValues" | "context" | "command" | "config">;
//#endregion
export { BagTemplate, GetConfigurableType, GetUpdateType, MessageMetadata, UseStream, UseStreamCustom, UseStreamCustomOptions, UseStreamOptions, UseStreamThread, UseStreamTransport };
//# sourceMappingURL=types.d.cts.map