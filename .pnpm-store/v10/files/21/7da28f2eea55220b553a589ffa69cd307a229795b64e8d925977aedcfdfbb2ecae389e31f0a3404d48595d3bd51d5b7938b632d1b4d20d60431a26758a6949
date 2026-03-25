import { Assistant, AssistantGraph, AssistantSelectField, AssistantSortBy, AssistantVersion, AssistantsSearchResponse, CancelAction, Checkpoint, Config, Cron, CronCreateForThreadResponse, CronCreateResponse, CronSelectField, CronSortBy, DefaultValues, GraphSchema, Item, ListNamespaceResponse, Metadata, Run, RunSelectField, RunStatus, SearchItemsResponse, SortOrder, Subgraphs, Thread, ThreadSelectField, ThreadSortBy, ThreadState, ThreadStatus, ThreadValuesFilter } from "./schema.cjs";
import { StreamMode, ThreadStreamMode, TypedAsyncGenerator } from "./types.stream.cjs";
import { Command, CronsCreatePayload, CronsUpdatePayload, OnConflictBehavior, RunsCreatePayload, RunsStreamPayload, RunsWaitPayload, StreamEvent } from "./types.cjs";
import { AsyncCaller, AsyncCallerParams } from "./utils/async_caller.cjs";

//#region src/client.d.ts
type HeaderValue = string | undefined | null;
/**
 * Get the API key from the environment.
 * Precedence:
 *   1. explicit argument (if string)
 *   2. LANGGRAPH_API_KEY
 *   3. LANGSMITH_API_KEY
 *   4. LANGCHAIN_API_KEY
 *
 * @param apiKey - API key provided as an argument. If null, skips environment lookup. If undefined, tries environment.
 * @returns The API key if found, otherwise undefined
 */
declare function getApiKey(apiKey?: string | null): string | undefined;
type RequestHook = (url: URL, init: RequestInit) => Promise<RequestInit> | RequestInit;
interface ClientConfig {
  apiUrl?: string;
  /**
   * API key for authentication.
   * - If a string is provided, that key will be used
   * - If undefined (default), the key will be auto-loaded from environment variables (LANGGRAPH_API_KEY, LANGSMITH_API_KEY, or LANGCHAIN_API_KEY)
   * - If null, no API key will be set (skips auto-loading)
   */
  apiKey?: string | null;
  callerOptions?: AsyncCallerParams;
  timeoutMs?: number;
  defaultHeaders?: Record<string, HeaderValue>;
  onRequest?: RequestHook;
}
declare class BaseClient {
  protected asyncCaller: AsyncCaller;
  protected timeoutMs: number | undefined;
  protected apiUrl: string;
  protected defaultHeaders: Record<string, HeaderValue>;
  protected onRequest?: RequestHook;
  constructor(config?: ClientConfig);
  protected prepareFetchOptions(path: string, options?: RequestInit & {
    json?: unknown;
    params?: Record<string, unknown>;
    timeoutMs?: number | null;
    withResponse?: boolean;
  }): [url: URL, init: RequestInit];
  protected fetch<T>(path: string, options: RequestInit & {
    json?: unknown;
    params?: Record<string, unknown>;
    timeoutMs?: number | null;
    signal: AbortSignal | undefined;
    withResponse: true;
  }): Promise<[T, Response]>;
  protected fetch<T>(path: string, options?: RequestInit & {
    json?: unknown;
    params?: Record<string, unknown>;
    timeoutMs?: number | null;
    signal: AbortSignal | undefined;
    withResponse?: false;
  }): Promise<T>;
  /**
   * Protected helper for streaming with automatic retry logic.
   * Handles both initial requests and reconnections with SSE.
   */
  protected streamWithRetry<T extends {
    id?: string;
    event: string;
    data: unknown;
  }>(config: {
    endpoint: string;
    method?: string;
    signal?: AbortSignal;
    headers?: Record<string, string>;
    params?: Record<string, unknown>;
    json?: unknown;
    maxRetries?: number;
    onReconnect?: (options: {
      attempt: number;
      lastEventId?: string;
      cause: unknown;
    }) => void;
    onInitialResponse?: (response: Response) => void | Promise<void>;
  }): AsyncGenerator<T>;
}
declare class CronsClient extends BaseClient {
  /**
   *
   * @param threadId The ID of the thread.
   * @param assistantId Assistant ID to use for this cron job.
   * @param payload Payload for creating a cron job.
   * @returns The created background run.
   */
  createForThread(threadId: string, assistantId: string, payload?: CronsCreatePayload): Promise<CronCreateForThreadResponse>;
  /**
   *
   * @param assistantId Assistant ID to use for this cron job.
   * @param payload Payload for creating a cron job.
   * @returns
   */
  create(assistantId: string, payload?: CronsCreatePayload): Promise<CronCreateResponse>;
  /**
   * Update a cron job by ID.
   *
   * @param cronId The cron ID to update.
   * @param payload Payload for updating a cron job.
   * @returns The updated cron job.
   * ```
   */
  update(cronId: string, payload?: CronsUpdatePayload): Promise<Cron>;
  /**
   * Delete a cron job by ID.
   *
   * @param cronId Cron ID of Cron job to delete.
   * @param options Optional parameters for the request.
   */
  delete(cronId: string, options?: {
    signal?: AbortSignal;
  }): Promise<void>;
  /**
   *
   * @param query Query options.
   * @returns List of crons.
   */
  search(query?: {
    assistantId?: string;
    threadId?: string;
    enabled?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: CronSortBy;
    sortOrder?: SortOrder;
    select?: CronSelectField[];
    signal?: AbortSignal;
  }): Promise<Cron[]>;
  /**
   * Count cron jobs matching filters.
   *
   * @param query.assistantId Assistant ID to filter by.
   * @param query.threadId Thread ID to filter by.
   * @returns Number of cron jobs matching the criteria.
   */
  count(query?: {
    assistantId?: string;
    threadId?: string;
    signal?: AbortSignal;
  }): Promise<number>;
}
declare class AssistantsClient extends BaseClient {
  /**
   * Get an assistant by ID.
   *
   * @param assistantId The ID of the assistant.
   * @returns Assistant
   */
  get(assistantId: string, options?: {
    signal?: AbortSignal;
  }): Promise<Assistant>;
  /**
   * Get the JSON representation of the graph assigned to a runnable
   * @param assistantId The ID of the assistant.
   * @param options.xray Whether to include subgraphs in the serialized graph representation. If an integer value is provided, only subgraphs with a depth less than or equal to the value will be included.
   * @returns Serialized graph
   */
  getGraph(assistantId: string, options?: {
    xray?: boolean | number;
    signal?: AbortSignal;
  }): Promise<AssistantGraph>;
  /**
   * Get the state and config schema of the graph assigned to a runnable
   * @param assistantId The ID of the assistant.
   * @returns Graph schema
   */
  getSchemas(assistantId: string, options?: {
    signal?: AbortSignal;
  }): Promise<GraphSchema>;
  /**
   * Get the schemas of an assistant by ID.
   *
   * @param assistantId The ID of the assistant to get the schema of.
   * @param options Additional options for getting subgraphs, such as namespace or recursion extraction.
   * @returns The subgraphs of the assistant.
   */
  getSubgraphs(assistantId: string, options?: {
    namespace?: string;
    recurse?: boolean;
    signal?: AbortSignal;
  }): Promise<Subgraphs>;
  /**
   * Create a new assistant.
   * @param payload Payload for creating an assistant.
   * @returns The created assistant.
   */
  create(payload: {
    graphId: string;
    config?: Config;
    context?: unknown;
    metadata?: Metadata;
    assistantId?: string;
    ifExists?: OnConflictBehavior;
    name?: string;
    description?: string;
    signal?: AbortSignal;
  }): Promise<Assistant>;
  /**
   * Update an assistant.
   * @param assistantId ID of the assistant.
   * @param payload Payload for updating the assistant.
   * @returns The updated assistant.
   */
  update(assistantId: string, payload: {
    graphId?: string;
    config?: Config;
    context?: unknown;
    metadata?: Metadata;
    name?: string;
    description?: string;
    signal?: AbortSignal;
  }): Promise<Assistant>;
  /**
   * Delete an assistant.
   *
   * @param assistantId ID of the assistant.
   * @param deleteThreads If true, delete all threads with `metadata.assistant_id` equal to `assistantId`. Defaults to false.
   */
  delete(assistantId: string, options?: {
    signal?: AbortSignal;
    deleteThreads?: boolean;
  }): Promise<void>;
  /**
   * List assistants.
   * @param query Query options.
   * @returns List of assistants or, when includePagination is true, a mapping with the assistants and next cursor.
   */
  search(query: {
    graphId?: string;
    name?: string;
    metadata?: Metadata;
    limit?: number;
    offset?: number;
    sortBy?: AssistantSortBy;
    sortOrder?: SortOrder;
    select?: AssistantSelectField[];
    includePagination: true;
    signal?: AbortSignal;
  }): Promise<AssistantsSearchResponse>;
  search(query?: {
    graphId?: string;
    name?: string;
    metadata?: Metadata;
    limit?: number;
    offset?: number;
    sortBy?: AssistantSortBy;
    sortOrder?: SortOrder;
    select?: AssistantSelectField[];
    includePagination?: false;
    signal?: AbortSignal;
  }): Promise<Assistant[]>;
  /**
   * Count assistants matching filters.
   *
   * @param query.metadata Metadata to filter by. Exact match for each key/value.
   * @param query.graphId Optional graph id to filter by.
   * @param query.name Optional name to filter by.
   * @returns Number of assistants matching the criteria.
   */
  count(query?: {
    metadata?: Metadata;
    graphId?: string;
    name?: string;
    signal?: AbortSignal;
  }): Promise<number>;
  /**
   * List all versions of an assistant.
   *
   * @param assistantId ID of the assistant.
   * @returns List of assistant versions.
   */
  getVersions(assistantId: string, payload?: {
    metadata?: Metadata;
    limit?: number;
    offset?: number;
    signal?: AbortSignal;
  }): Promise<AssistantVersion[]>;
  /**
   * Change the version of an assistant.
   *
   * @param assistantId ID of the assistant.
   * @param version The version to change to.
   * @returns The updated assistant.
   */
  setLatest(assistantId: string, version: number, options?: {
    signal?: AbortSignal;
  }): Promise<Assistant>;
}
declare class ThreadsClient<TStateType = DefaultValues, TUpdateType = TStateType> extends BaseClient {
  /**
   * Get a thread by ID.
   *
   * @param threadId ID of the thread.
   * @returns The thread.
   */
  get<ValuesType = TStateType>(threadId: string, options?: {
    signal?: AbortSignal;
  }): Promise<Thread<ValuesType>>;
  /**
   * Create a new thread.
   *
   * @param payload Payload for creating a thread.
   * @returns The created thread.
   */
  create(payload?: {
    /**
     * Metadata for the thread.
     */
    metadata?: Metadata;
    /**
     * ID of the thread to create.
     *
     * If not provided, a random UUID will be generated.
     */
    threadId?: string;
    /**
     * How to handle duplicate creation.
     *
     * @default "raise"
     */
    ifExists?: OnConflictBehavior;
    /**
     * Graph ID to associate with the thread.
     */
    graphId?: string;
    /**
     * Apply a list of supersteps when creating a thread, each containing a sequence of updates.
     *
     * Used for copying a thread between deployments.
     */
    supersteps?: Array<{
      updates: Array<{
        values: unknown;
        command?: Command;
        asNode: string;
      }>;
    }>;
    /**
     * Optional time-to-live in minutes for the thread.
     * If a number is provided, it is treated as minutes and defaults to strategy "delete".
     * You may also provide an object { ttl: number, strategy?: "delete" }.
     */
    ttl?: number | {
      ttl: number;
      strategy?: "delete";
    };
    /**
     * Signal to abort the request.
     */
    signal?: AbortSignal;
  }): Promise<Thread<TStateType>>;
  /**
   * Copy an existing thread
   * @param threadId ID of the thread to be copied
   * @returns Newly copied thread
   */
  copy(threadId: string, options?: {
    signal?: AbortSignal;
  }): Promise<Thread<TStateType>>;
  /**
   * Update a thread.
   *
   * @param threadId ID of the thread.
   * @param payload Payload for updating the thread.
   * @returns The updated thread.
   */
  update(threadId: string, payload?: {
    /**
     * Metadata for the thread.
     */
    metadata?: Metadata;
    /**
     * Optional time-to-live in minutes for the thread.
     * If a number is provided, it is treated as minutes and defaults to strategy "delete".
     * You may also provide an object { ttl: number, strategy?: "delete" }.
     */
    ttl?: number | {
      ttl: number;
      strategy?: "delete";
    };
    /**
     * Signal to abort the request.
     */
    signal?: AbortSignal;
  }): Promise<Thread>;
  /**
   * Delete a thread.
   *
   * @param threadId ID of the thread.
   */
  delete(threadId: string, options?: {
    signal?: AbortSignal;
  }): Promise<void>;
  /**
   * List threads
   *
   * @param query Query options
   * @returns List of threads
   */
  search<ValuesType = TStateType>(query?: {
    /**
     * Metadata to filter threads by.
     */
    metadata?: Metadata;
    /**
     * Filter by specific thread IDs.
     */
    ids?: string[];
    /**
     * Maximum number of threads to return.
     * Defaults to 10
     */
    limit?: number;
    /**
     * Offset to start from.
     */
    offset?: number;
    /**
     * Thread status to filter on.
     */
    status?: ThreadStatus;
    /**
     * Sort by.
     */
    sortBy?: ThreadSortBy;
    /**
     * Sort order.
     * Must be one of 'asc' or 'desc'.
     */
    sortOrder?: SortOrder;
    /**
     * Array of fields to select.
     * Elements or array must be one of 'thread_id, 'created_at', 'updated_at', 'metadata', 'config', 'context', 'status', 'values', or 'interrupts'.
     */
    select?: ThreadSelectField[];
    /**
     * Values to filter threads by.
     */
    values?: ThreadValuesFilter;
    /**
     * Dictionary mapping aliases to JSONB paths to extract from thread data.
     * Paths use dot notation for nested keys and bracket notation for array
     * indices (e.g., `{"last_msg": "values.messages[-1]"}`). Extracted values
     * are returned in an `extracted` field on each thread. Maximum 10 paths.
     */
    extract?: Record<string, string>;
    /**
     * Signal to abort the request.
     */
    signal?: AbortSignal;
  }): Promise<Thread<ValuesType>[]>;
  /**
   * Count threads matching filters.
   *
   * @param query.metadata Thread metadata to filter on.
   * @param query.values State values to filter on.
   * @param query.status Thread status to filter on.
   * @returns Number of threads matching the criteria.
   */
  count<ValuesType = TStateType>(query?: {
    metadata?: Metadata;
    values?: ValuesType;
    status?: ThreadStatus;
    signal?: AbortSignal;
  }): Promise<number>;
  /**
   * Get state for a thread.
   *
   * @param threadId ID of the thread.
   * @returns Thread state.
   */
  getState<ValuesType = TStateType>(threadId: string, checkpoint?: Checkpoint | string, options?: {
    subgraphs?: boolean;
    signal?: AbortSignal;
  }): Promise<ThreadState<ValuesType>>;
  /**
   * Add state to a thread.
   *
   * @param threadId The ID of the thread.
   * @returns
   */
  updateState<ValuesType = TUpdateType>(threadId: string, options: {
    values: ValuesType;
    checkpoint?: Checkpoint;
    checkpointId?: string;
    asNode?: string;
    signal?: AbortSignal;
  }): Promise<Pick<Config, "configurable">>;
  /**
   * Patch the metadata of a thread.
   *
   * @param threadIdOrConfig Thread ID or config to patch the state of.
   * @param metadata Metadata to patch the state with.
   */
  patchState(threadIdOrConfig: string | Config, metadata: Metadata, options?: {
    signal?: AbortSignal;
  }): Promise<void>;
  /**
   * Get all past states for a thread.
   *
   * @param threadId ID of the thread.
   * @param options Additional options.
   * @returns List of thread states.
   */
  getHistory<ValuesType = TStateType>(threadId: string, options?: {
    limit?: number;
    before?: Config;
    checkpoint?: Partial<Omit<Checkpoint, "thread_id">>;
    metadata?: Metadata;
    signal?: AbortSignal;
  }): Promise<ThreadState<ValuesType>[]>;
  joinStream(threadId: string, options?: {
    lastEventId?: string;
    streamMode?: ThreadStreamMode | ThreadStreamMode[];
    signal?: AbortSignal;
  }): AsyncGenerator<{
    id?: string;
    event: StreamEvent;
    data: any;
  }>;
}
declare class RunsClient<TStateType = DefaultValues, TUpdateType = TStateType, TCustomEventType = unknown> extends BaseClient {
  stream<TStreamMode extends StreamMode | StreamMode[] = StreamMode, TSubgraphs extends boolean = false>(threadId: null, assistantId: string, payload?: Omit<RunsStreamPayload<TStreamMode, TSubgraphs>, "multitaskStrategy" | "onCompletion">): TypedAsyncGenerator<TStreamMode, TSubgraphs, TStateType, TUpdateType, TCustomEventType>;
  stream<TStreamMode extends StreamMode | StreamMode[] = StreamMode, TSubgraphs extends boolean = false>(threadId: string, assistantId: string, payload?: RunsStreamPayload<TStreamMode, TSubgraphs>): TypedAsyncGenerator<TStreamMode, TSubgraphs, TStateType, TUpdateType, TCustomEventType>;
  /**
   * Create a run.
   *
   * @param threadId The ID of the thread.
   * @param assistantId Assistant ID to use for this run.
   * @param payload Payload for creating a run.
   * @returns The created run.
   */
  create(threadId: string | null, assistantId: string, payload?: RunsCreatePayload): Promise<Run>;
  /**
   * Create a batch of stateless background runs.
   *
   * @param payloads An array of payloads for creating runs.
   * @returns An array of created runs.
   */
  createBatch(payloads: (Omit<RunsCreatePayload, "signal"> & {
    assistantId: string;
  })[], options?: {
    signal?: AbortSignal;
  }): Promise<Run[]>;
  wait(threadId: null, assistantId: string, payload?: Omit<RunsWaitPayload, "multitaskStrategy" | "onCompletion">): Promise<ThreadState["values"]>;
  wait(threadId: string, assistantId: string, payload?: RunsWaitPayload): Promise<ThreadState["values"]>;
  /**
   * List all runs for a thread.
   *
   * @param threadId The ID of the thread.
   * @param options Filtering and pagination options.
   * @returns List of runs.
   */
  list(threadId: string, options?: {
    /**
     * Maximum number of runs to return.
     * Defaults to 10
     */
    limit?: number;
    /**
     * Offset to start from.
     * Defaults to 0.
     */
    offset?: number;
    /**
     * Status of the run to filter by.
     */
    status?: RunStatus;
    select?: RunSelectField[];
    /**
     * Signal to abort the request.
     */
    signal?: AbortSignal;
  }): Promise<Run[]>;
  /**
   * Get a run by ID.
   *
   * @param threadId The ID of the thread.
   * @param runId The ID of the run.
   * @returns The run.
   */
  get(threadId: string, runId: string, options?: {
    signal?: AbortSignal;
  }): Promise<Run>;
  /**
   * Cancel a run.
   *
   * @param threadId The ID of the thread.
   * @param runId The ID of the run.
   * @param wait Whether to block when canceling
   * @param action Action to take when cancelling the run. Possible values are `interrupt` or `rollback`. Default is `interrupt`.
   * @returns
   */
  cancel(threadId: string, runId: string, wait?: boolean, action?: CancelAction, options?: {
    signal?: AbortSignal;
  }): Promise<void>;
  /**
   * Block until a run is done.
   *
   * @param threadId The ID of the thread.
   * @param runId The ID of the run.
   * @returns
   */
  join(threadId: string, runId: string, options?: {
    signal?: AbortSignal;
  }): Promise<TStateType>;
  /**
   * Stream output from a run in real-time, until the run is done.
   *
   * @param threadId The ID of the thread. Can be set to `null` | `undefined` for stateless runs.
   * @param runId The ID of the run.
   * @param options Additional options for controlling the stream behavior:
   *   - signal: An AbortSignal that can be used to cancel the stream request
   *   - lastEventId: The ID of the last event received. Can be used to reconnect to a stream without losing events.
   *   - cancelOnDisconnect: When true, automatically cancels the run if the client disconnects from the stream
   *   - streamMode: Controls what types of events to receive from the stream (can be a single mode or array of modes)
   *        Must be a subset of the stream modes passed when creating the run. Background runs default to having the union of all
   *        stream modes enabled.
   * @returns An async generator yielding stream parts.
   */
  joinStream(threadId: string | undefined | null, runId: string, options?: {
    signal?: AbortSignal;
    cancelOnDisconnect?: boolean;
    lastEventId?: string;
    streamMode?: StreamMode | StreamMode[];
  } | AbortSignal): AsyncGenerator<{
    id?: string;
    event: StreamEvent;
    data: any;
  }>;
  /**
   * Delete a run.
   *
   * @param threadId The ID of the thread.
   * @param runId The ID of the run.
   * @returns
   */
  delete(threadId: string, runId: string, options?: {
    signal?: AbortSignal;
  }): Promise<void>;
}
declare class StoreClient extends BaseClient {
  /**
   * Store or update an item.
   *
   * @param namespace A list of strings representing the namespace path.
   * @param key The unique identifier for the item within the namespace.
   * @param value A dictionary containing the item's data.
   * @param options.index Controls search indexing - null (use defaults), false (disable), or list of field paths to index.
   * @param options.ttl Optional time-to-live in minutes for the item, or null for no expiration.
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * await client.store.putItem(
   *   ["documents", "user123"],
   *   "item456",
   *   { title: "My Document", content: "Hello World" },
   *   { ttl: 60 } // expires in 60 minutes
   * );
   * ```
   */
  putItem(namespace: string[], key: string, value: Record<string, unknown>, options?: {
    index?: false | string[] | null;
    ttl?: number | null;
    signal?: AbortSignal;
  }): Promise<void>;
  /**
   * Retrieve a single item.
   *
   * @param namespace A list of strings representing the namespace path.
   * @param key The unique identifier for the item.
   * @param options.refreshTtl Whether to refresh the TTL on this read operation. If null, uses the store's default behavior.
   * @returns Promise<Item>
   *
   * @example
   * ```typescript
   * const item = await client.store.getItem(
   *   ["documents", "user123"],
   *   "item456",
   *   { refreshTtl: true }
   * );
   * console.log(item);
   * // {
   * //   namespace: ["documents", "user123"],
   * //   key: "item456",
   * //   value: { title: "My Document", content: "Hello World" },
   * //   createdAt: "2024-07-30T12:00:00Z",
   * //   updatedAt: "2024-07-30T12:00:00Z"
   * // }
   * ```
   */
  getItem(namespace: string[], key: string, options?: {
    refreshTtl?: boolean | null;
    signal?: AbortSignal;
  }): Promise<Item | null>;
  /**
   * Delete an item.
   *
   * @param namespace A list of strings representing the namespace path.
   * @param key The unique identifier for the item.
   * @returns Promise<void>
   */
  deleteItem(namespace: string[], key: string, options?: {
    signal?: AbortSignal;
  }): Promise<void>;
  /**
   * Search for items within a namespace prefix.
   *
   * @param namespacePrefix List of strings representing the namespace prefix.
   * @param options.filter Optional dictionary of key-value pairs to filter results.
   * @param options.limit Maximum number of items to return (default is 10).
   * @param options.offset Number of items to skip before returning results (default is 0).
   * @param options.query Optional search query.
   * @param options.refreshTtl Whether to refresh the TTL on items returned by this search. If null, uses the store's default behavior.
   * @returns Promise<SearchItemsResponse>
   *
   * @example
   * ```typescript
   * const results = await client.store.searchItems(
   *   ["documents"],
   *   {
   *     filter: { author: "John Doe" },
   *     limit: 5,
   *     refreshTtl: true
   *   }
   * );
   * console.log(results);
   * // {
   * //   items: [
   * //     {
   * //       namespace: ["documents", "user123"],
   * //       key: "item789",
   * //       value: { title: "Another Document", author: "John Doe" },
   * //       createdAt: "2024-07-30T12:00:00Z",
   * //       updatedAt: "2024-07-30T12:00:00Z"
   * //     },
   * //     // ... additional items ...
   * //   ]
   * // }
   * ```
   */
  searchItems(namespacePrefix: string[], options?: {
    filter?: Record<string, unknown>;
    limit?: number;
    offset?: number;
    query?: string;
    refreshTtl?: boolean | null;
    signal?: AbortSignal;
  }): Promise<SearchItemsResponse>;
  /**
   * List namespaces with optional match conditions.
   *
   * @param options.prefix Optional list of strings representing the prefix to filter namespaces.
   * @param options.suffix Optional list of strings representing the suffix to filter namespaces.
   * @param options.maxDepth Optional integer specifying the maximum depth of namespaces to return.
   * @param options.limit Maximum number of namespaces to return (default is 100).
   * @param options.offset Number of namespaces to skip before returning results (default is 0).
   * @returns Promise<ListNamespaceResponse>
   */
  listNamespaces(options?: {
    prefix?: string[];
    suffix?: string[];
    maxDepth?: number;
    limit?: number;
    offset?: number;
    signal?: AbortSignal;
  }): Promise<ListNamespaceResponse>;
}
declare class UiClient extends BaseClient {
  private static promiseCache;
  private static getOrCached;
  getComponent(assistantId: string, agentName: string): Promise<string>;
}
declare class Client<TStateType = DefaultValues, TUpdateType = TStateType, TCustomEventType = unknown> {
  /**
   * The client for interacting with assistants.
   */
  assistants: AssistantsClient;
  /**
   * The client for interacting with threads.
   */
  threads: ThreadsClient<TStateType, TUpdateType>;
  /**
   * The client for interacting with runs.
   */
  runs: RunsClient<TStateType, TUpdateType, TCustomEventType>;
  /**
   * The client for interacting with cron runs.
   */
  crons: CronsClient;
  /**
   * The client for interacting with the KV store.
   */
  store: StoreClient;
  /**
   * The client for interacting with the UI.
   * @internal Used by LoadExternalComponent and the API might change in the future.
   */
  "~ui": UiClient;
  /**
   * @internal Used to obtain a stable key representing the client.
   */
  private "~configHash";
  constructor(config?: ClientConfig);
}
/**
 * @internal Used to obtain a stable key representing the client.
 */
declare function getClientConfigHash(client: Client): string | undefined;
//#endregion
export { AssistantsClient, Client, ClientConfig, CronsClient, RequestHook, RunsClient, StoreClient, ThreadsClient, getApiKey, getClientConfigHash };
//# sourceMappingURL=client.d.cts.map