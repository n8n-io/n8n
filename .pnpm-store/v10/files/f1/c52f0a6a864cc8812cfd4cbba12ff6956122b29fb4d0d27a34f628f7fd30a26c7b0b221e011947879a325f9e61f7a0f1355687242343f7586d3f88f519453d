import { Checkpoint, Config, Metadata } from "./schema.js";
import { StreamMode } from "./types.stream.js";
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

//#region src/types.d.ts
type MultitaskStrategy = "reject" | "interrupt" | "rollback" | "enqueue";
type OnConflictBehavior = "raise" | "do_nothing";
type OnCompletionBehavior = "complete" | "continue";
type DisconnectMode = "cancel" | "continue";
type Durability = "exit" | "async" | "sync";
type StreamEvent = "events" | "metadata" | "debug" | "updates" | "values" | "messages/partial" | "messages/metadata" | "messages/complete" | "messages" | (string & {}); // eslint-disable-line @typescript-eslint/ban-types
interface Send {
  node: string;
  input: unknown | null;
}
interface Command {
  /**
   * An object to update the thread state with.
   */
  update?: Record<string, unknown> | [string, unknown][] | null;
  /**
   * The value to return from an `interrupt` function call.
   */
  resume?: unknown;
  /**
   * Determine the next node to navigate to. Can be one of the following:
   * - Name(s) of the node names to navigate to next.
   * - `Send` command(s) to execute node(s) with provided input.
   */
  goto?: Send | Send[] | string | string[];
}
interface RunsInvokePayload {
  /**
   * Input to the run. Pass `null` to resume from the current state of the thread.
   */
  input?: Record<string, unknown> | null;
  /**
   * Metadata for the run.
   */
  metadata?: Metadata;
  /**
   * Additional configuration for the run.
   */
  config?: Config;
  /**
   * Static context to add to the assistant.
   * @remarks Added in LangGraph.js 0.4
   */
  context?: unknown;
  /**
   * Checkpoint ID for when creating a new run.
   */
  checkpointId?: string;
  /**
   * Checkpoint for when creating a new run.
   */
  checkpoint?: Omit<Checkpoint, "thread_id">;
  /**
   * Whether to checkpoint during the run (or only at the end/interruption).
   * @deprecated Use `durability` instead.
   */
  checkpointDuring?: boolean;
  /**
   * Whether to checkpoint during the run (or only at the end/interruption).
   * - `"async"`: Save checkpoint asynchronously while the next step executes (default).
   * - `"sync"`: Save checkpoint synchronously before the next step starts.
   * - `"exit"`: Save checkpoint only when the graph exits.
   * @default "async"
   */
  durability?: Durability;
  /**
   * Interrupt execution before entering these nodes.
   */
  interruptBefore?: "*" | string[];
  /**
   * Interrupt execution after leaving these nodes.
   */
  interruptAfter?: "*" | string[];
  /**
   * Strategy to handle concurrent runs on the same thread. Only relevant if
   * there is a pending/inflight run on the same thread. One of:
   * - "reject": Reject the new run.
   * - "interrupt": Interrupt the current run, keeping steps completed until now,
       and start a new one.
   * - "rollback": Cancel and delete the existing run, rolling back the thread to
      the state before it had started, then start the new run.
   * - "enqueue": Queue up the new run to start after the current run finishes.
   */
  multitaskStrategy?: MultitaskStrategy;
  /**
   * Abort controller signal to cancel the run.
   */
  signal?: AbortController["signal"];
  /**
   * Behavior to handle run completion. Only relevant if
   * there is a pending/inflight run on the same thread. One of:
   * - "complete": Complete the run.
   * - "continue": Continue the run.
   */
  onCompletion?: OnCompletionBehavior;
  /**
   * Webhook to call when the run is complete.
   */
  webhook?: string;
  /**
   * Behavior to handle disconnection. Only relevant if
   * there is a pending/inflight run on the same thread. One of:
   * - "cancel": Cancel the run.
   * - "continue": Continue the run.
   */
  onDisconnect?: DisconnectMode;
  /**
   * The number of seconds to wait before starting the run.
   * Use to schedule future runs.
   */
  afterSeconds?: number;
  /**
   * Behavior if the specified run doesn't exist. Defaults to "reject".
   */
  ifNotExists?: "create" | "reject";
  /**
   * One or more commands to invoke the graph with.
   */
  command?: Command;
  /**
   * Callback when a run is created.
   */
  onRunCreated?: (params: {
    run_id: string;
    thread_id?: string;
  }) => void;
  /**
   * @internal
   * For LangSmith tracing purposes only. Not part of the public API.
   */
  _langsmithTracer?: LangChainTracer;
}
interface RunsStreamPayload<TStreamMode extends StreamMode | StreamMode[] = [], TSubgraphs extends boolean = false> extends RunsInvokePayload {
  /**
   * One of `"values"`, `"messages"`, `"messages-tuple"`, `"updates"`, `"events"`, `"debug"`, `"custom"`.
   */
  streamMode?: TStreamMode;
  /**
   * Stream output from subgraphs. By default, streams only the top graph.
   */
  streamSubgraphs?: TSubgraphs;
  /**
   * Whether the stream is considered resumable.
   * If true, the stream can be resumed and replayed in its entirety even after disconnection.
   */
  streamResumable?: boolean;
  /**
   * Pass one or more feedbackKeys if you want to request short-lived signed URLs
   * for submitting feedback to LangSmith with this key for this run.
   */
  feedbackKeys?: string[];
}
interface RunsCreatePayload extends RunsInvokePayload {
  /**
   * One of `"values"`, `"messages"`, `"messages-tuple"`, `"updates"`, `"events"`, `"debug"`, `"custom"`.
   */
  streamMode?: StreamMode | Array<StreamMode>;
  /**
   * Stream output from subgraphs. By default, streams only the top graph.
   */
  streamSubgraphs?: boolean;
  /**
   * Whether the stream is considered resumable.
   * If true, the stream can be resumed and replayed in its entirety even after disconnection.
   */
  streamResumable?: boolean;
}
interface CronsCreatePayload extends RunsCreatePayload {
  /**
   * Schedule for running the Cron Job
   */
  schedule: string;
}
interface RunsWaitPayload extends RunsStreamPayload {
  /**
   * Raise errors returned by the run. Default is `true`.
   */
  raiseError?: boolean;
}
//#endregion
export { Command, CronsCreatePayload, DisconnectMode, Durability, MultitaskStrategy, OnCompletionBehavior, OnConflictBehavior, RunsCreatePayload, RunsInvokePayload, RunsStreamPayload, RunsWaitPayload, StreamEvent };
//# sourceMappingURL=types.d.ts.map