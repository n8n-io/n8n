import { BaseChannel } from "../channels/base.cjs";
import { LangGraphRunnableConfig, RunnableLike as RunnableLike$1 } from "../pregel/runnable_types.cjs";
import { StateDefinition, StateType } from "./annotation.cjs";
import { RunnableCallable } from "../utils.cjs";
import { PregelNode } from "../pregel/read.cjs";
import { END, START, Send } from "../constants.cjs";
import { PregelParams } from "../pregel/types.cjs";
import { Pregel } from "../pregel/index.cjs";
import { All, BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { Graph } from "@langchain/core/runnables/graph";

//#region src/graph/graph.d.ts
interface BranchOptions<IO, N extends string, CallOptions extends LangGraphRunnableConfig = LangGraphRunnableConfig> {
  source: N;
  path: RunnableLike$1<IO, BranchPathReturnValue, CallOptions>;
  pathMap?: Record<string, N | typeof END> | (N | typeof END)[];
}
type BranchPathReturnValue = string | Send | (string | Send)[] | Promise<string | Send | (string | Send)[]>;
type NodeAction<S, U, C extends StateDefinition> = RunnableLike$1<S, U extends object ? U & Record<string, any> : U,
// eslint-disable-line @typescript-eslint/no-explicit-any
LangGraphRunnableConfig<StateType<C>>>;
declare class Branch<IO, N extends string, CallOptions extends LangGraphRunnableConfig = LangGraphRunnableConfig> {
  path: Runnable<IO, BranchPathReturnValue, CallOptions>;
  ends?: Record<string, N | typeof END>;
  constructor(options: Omit<BranchOptions<IO, N, CallOptions>, "source">);
  run(writer: (dests: (string | Send)[], config: LangGraphRunnableConfig) => Runnable | void | Promise<void>, reader?: (config: CallOptions) => IO): RunnableCallable<unknown, unknown>;
  _route(input: IO, config: CallOptions, writer: (dests: (string | Send)[], config: LangGraphRunnableConfig) => Runnable | void | Promise<void>, reader?: (config: CallOptions) => IO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<Runnable | any>;
}
type NodeSpec<RunInput, RunOutput> = {
  runnable: Runnable<RunInput, RunOutput>;
  metadata?: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subgraphs?: Pregel<any, any>[];
  ends?: string[];
  defer?: boolean;
};
type AddNodeOptions<Nodes extends string = string> = {
  metadata?: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subgraphs?: Pregel<any, any>[];
  ends?: Nodes[];
  defer?: boolean;
};
declare class Graph$1<N extends string = typeof START | typeof END,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
RunInput = any,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
RunOutput = any, NodeSpecType extends NodeSpec<RunInput, RunOutput> = NodeSpec<RunInput, RunOutput>, C extends StateDefinition = StateDefinition> {
  nodes: Record<N, NodeSpecType>;
  edges: Set<[N | typeof START, N | typeof END]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  branches: Record<string, Record<string, Branch<RunInput, N, any>>>;
  entryPoint?: string;
  compiled: boolean;
  constructor();
  protected warnIfCompiled(message: string): void;
  get allEdges(): Set<[string, string]>;
  addNode<K extends string, NodeInput = RunInput, NodeOutput = RunOutput>(nodes: Record<K, NodeAction<NodeInput, NodeOutput, C>> | [key: K, action: NodeAction<NodeInput, NodeOutput, C>, options?: AddNodeOptions][]): Graph$1<N | K, RunInput, RunOutput>;
  addNode<K extends string, NodeInput = RunInput, NodeOutput = RunOutput>(key: K, action: NodeAction<NodeInput, NodeOutput, C>, options?: AddNodeOptions): Graph$1<N | K, RunInput, RunOutput>;
  addEdge(startKey: N | typeof START, endKey: N | typeof END): this;
  addConditionalEdges(source: BranchOptions<RunInput, N, LangGraphRunnableConfig<StateType<C>>>): this;
  addConditionalEdges(source: N, path: RunnableLike$1<RunInput, BranchPathReturnValue, LangGraphRunnableConfig<StateType<C>>>, pathMap?: BranchOptions<RunInput, N, LangGraphRunnableConfig<StateType<C>>>["pathMap"]): this;
  /**
   * @deprecated use `addEdge(START, key)` instead
   */
  setEntryPoint(key: N): this;
  /**
   * @deprecated use `addEdge(key, END)` instead
   */
  setFinishPoint(key: N): this;
  compile({
    checkpointer,
    interruptBefore,
    interruptAfter,
    name
  }?: {
    checkpointer?: BaseCheckpointSaver | false;
    interruptBefore?: N[] | All;
    interruptAfter?: N[] | All;
    name?: string;
  }): CompiledGraph<N>;
  validate(interrupt?: string[]): void;
}
declare class CompiledGraph<N extends string, State = any,
// eslint-disable-line @typescript-eslint/no-explicit-any
Update = any,
// eslint-disable-line @typescript-eslint/no-explicit-any
ContextType extends Record<string, any> = Record<string, any>,
// eslint-disable-line @typescript-eslint/no-explicit-any
InputType = any,
// eslint-disable-line @typescript-eslint/no-explicit-any
OutputType = any,
// eslint-disable-line @typescript-eslint/no-explicit-any
NodeReturnType = unknown, CommandType = unknown, StreamCustomType = any // eslint-disable-line @typescript-eslint/no-explicit-any
> extends Pregel<Record<N | typeof START, PregelNode<State, Update>>, Record<N | typeof START | typeof END | string, BaseChannel>, ContextType & Record<string, any>,
// eslint-disable-line @typescript-eslint/no-explicit-any
InputType, OutputType, InputType, OutputType, NodeReturnType, CommandType, StreamCustomType> {
  "~NodeType": N;
  "~NodeReturnType": NodeReturnType;
  "~RunInput": Update;
  "~RunOutput": State;
  builder: Graph$1<N, State, Update>;
  constructor({
    builder,
    ...rest
  }: {
    builder: Graph$1<N, State, Update>;
  } & PregelParams<Record<N | typeof START, PregelNode<State, Update>>, Record<N | typeof START | typeof END | string, BaseChannel>>);
  attachNode(key: N, node: NodeSpec<State, Update>): void;
  attachEdge(start: N | typeof START, end: N | typeof END): void;
  attachBranch(start: N | typeof START, name: string, branch: Branch<State, N>): void;
  /**
   * Returns a drawable representation of the computation graph.
   */
  getGraphAsync(config?: RunnableConfig & {
    xray?: boolean | number;
  }): Promise<Graph>;
  /**
   * Returns a drawable representation of the computation graph.
   *
   * @deprecated Use getGraphAsync instead. The async method will be the default in the next minor core release.
   */
  getGraph(config?: RunnableConfig & {
    xray?: boolean | number;
  }): Graph;
}
//#endregion
export { AddNodeOptions, Branch, CompiledGraph, Graph$1 as Graph, NodeSpec };
//# sourceMappingURL=graph.d.cts.map