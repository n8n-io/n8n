import { BaseChannel } from "../channels/base.cjs";
import { LangGraphRunnableConfig } from "./runnable_types.cjs";
import { PregelNode } from "./read.cjs";
import { PregelInputType, PregelInterface, PregelOptions, PregelOutputType, PregelParams, StateSnapshot } from "./types.cjs";
import { StrRecord } from "./algo.cjs";
import { All, CheckpointListOptions } from "@langchain/langgraph-checkpoint";
import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { Graph, Node } from "@langchain/core/runnables/graph";
import { StreamEvent } from "@langchain/core/tracers/log_stream";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { Checkpoint as Checkpoint$1, Client, ThreadState } from "@langchain/langgraph-sdk";

//#region src/pregel/remote.d.ts
type RemoteGraphParams = Omit<PregelParams<StrRecord<string, PregelNode>, StrRecord<string, BaseChannel>>, "channels" | "nodes" | "inputChannels" | "outputChannels"> & {
  graphId: string;
  client?: Client;
  url?: string;
  apiKey?: string;
  headers?: Record<string, string>;
};
/**
 * The `RemoteGraph` class is a client implementation for calling remote
 * APIs that implement the LangGraph Server API specification.
 *
 * For example, the `RemoteGraph` class can be used to call APIs from deployments
 * on LangGraph Cloud.
 *
 * `RemoteGraph` behaves the same way as a `StateGraph` and can be used directly as
 * a node in another `StateGraph`.
 *
 * @example
 * ```ts
 * import { RemoteGraph } from "@langchain/langgraph/remote";
 *
 * // Can also pass a LangGraph SDK client instance directly
 * const remoteGraph = new RemoteGraph({
 *   graphId: process.env.LANGGRAPH_REMOTE_GRAPH_ID!,
 *   apiKey: process.env.LANGGRAPH_REMOTE_GRAPH_API_KEY,
 *   url: process.env.LANGGRAPH_REMOTE_GRAPH_API_URL,
 * });
 *
 * const input = {
 *   messages: [
 *     {
 *       role: "human",
 *       content: "Hello world!",
 *     },
 *   ],
 * };
 *
 * const config = {
 *   configurable: { thread_id: "threadId1" },
 * };
 *
 * await remoteGraph.invoke(input, config);
 * ```
 */
declare class RemoteGraph<Nn extends StrRecord<string, PregelNode> = StrRecord<string, PregelNode>, Cc extends StrRecord<string, BaseChannel> = StrRecord<string, BaseChannel>,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
ContextType extends Record<string, any> = StrRecord<string, any>> extends Runnable<PregelInputType, PregelOutputType, PregelOptions<Nn, Cc, ContextType>> implements PregelInterface<Nn, Cc, ContextType> {
  static lc_name(): string;
  lc_namespace: string[];
  lg_is_pregel: boolean;
  config?: RunnableConfig;
  graphId: string;
  protected client: Client;
  protected interruptBefore?: Array<keyof Nn> | All;
  protected interruptAfter?: Array<keyof Nn> | All;
  constructor(params: RemoteGraphParams);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Remove ignore when we remove support for 0.2 versions of core
  withConfig(config: RunnableConfig): typeof this;
  protected _sanitizeConfig(config: RunnableConfig): {
    tags: string[];
    metadata: Record<string, unknown>;
    configurable: {
      [k: string]: any;
    };
    recursion_limit: number | undefined;
  };
  protected _getConfig(checkpoint: Record<string, unknown>): RunnableConfig;
  protected _getCheckpoint(config?: RunnableConfig): Checkpoint$1 | undefined;
  protected _createStateSnapshot(state: ThreadState): StateSnapshot;
  invoke(input: PregelInputType, options?: Partial<PregelOptions<Nn, Cc, ContextType>>): Promise<PregelOutputType>;
  streamEvents(input: PregelInputType, options: Partial<PregelOptions<Nn, Cc, ContextType>> & {
    version: "v1" | "v2";
  }): IterableReadableStream<StreamEvent>;
  streamEvents(input: PregelInputType, options: Partial<PregelOptions<Nn, Cc, ContextType>> & {
    version: "v1" | "v2";
    encoding: never;
  }): IterableReadableStream<never>;
  _streamIterator(input: PregelInputType, options?: Partial<PregelOptions<Nn, Cc, ContextType>>): AsyncGenerator<PregelOutputType>;
  updateState(inputConfig: LangGraphRunnableConfig, values: Record<string, unknown>, asNode?: string): Promise<RunnableConfig>;
  getStateHistory(config: RunnableConfig, options?: CheckpointListOptions): AsyncIterableIterator<StateSnapshot>;
  protected _getDrawableNodes(nodes: Array<{
    id: string | number;
    name?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: Record<string, any> | string;
    metadata?: unknown;
  }>): Record<string, Node>;
  getState(config: RunnableConfig, options?: {
    subgraphs?: boolean;
  }): Promise<StateSnapshot>;
  /** @deprecated Use getGraphAsync instead. The async method will become the default in the next minor release. */
  getGraph(_?: RunnableConfig & {
    xray?: boolean | number;
  }): Graph;
  /**
   * Returns a drawable representation of the computation graph.
   */
  getGraphAsync(config?: RunnableConfig & {
    xray?: boolean | number;
  }): Promise<Graph>;
  /** @deprecated Use getSubgraphsAsync instead. The async method will become the default in the next minor release. */
  getSubgraphs(): Generator<[string, PregelInterface<Nn, Cc, ContextType>]>;
  getSubgraphsAsync(namespace?: string, recurse?: boolean): AsyncGenerator<[string, PregelInterface<Nn, Cc, ContextType>]>;
}
//#endregion
export { RemoteGraph, RemoteGraphParams };
//# sourceMappingURL=remote.d.cts.map