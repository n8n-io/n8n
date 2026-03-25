import { CachePolicy, RetryPolicy } from "./utils/index.js";
import { Runnable, RunnableBinding, RunnableBindingArgs, RunnableConfig, RunnableLike } from "@langchain/core/runnables";

//#region src/pregel/read.d.ts

interface PregelNodeArgs<RunInput, RunOutput> extends Partial<RunnableBindingArgs<RunInput, RunOutput>> {
  channels: Record<string, string> | string[];
  triggers: Array<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapper?: (args: any) => any;
  writers?: Runnable<RunOutput, unknown>[];
  tags?: string[];
  bound?: Runnable<RunInput, RunOutput>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kwargs?: Record<string, any>;
  config?: RunnableConfig;
  metadata?: Record<string, unknown>;
  retryPolicy?: RetryPolicy;
  cachePolicy?: CachePolicy;
  subgraphs?: Runnable[];
  ends?: string[];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PregelNodeInputType = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PregelNodeOutputType = any;
declare class PregelNode<RunInput = PregelNodeInputType, RunOutput = PregelNodeOutputType> extends RunnableBinding<RunInput, RunOutput, RunnableConfig> {
  lc_graph_name: string;
  channels: Record<string, string> | string[];
  triggers: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapper?: (args: any) => any;
  writers: Runnable[];
  bound: Runnable<RunInput, RunOutput>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kwargs: Record<string, any>;
  metadata: Record<string, unknown>;
  tags: string[];
  retryPolicy?: RetryPolicy;
  cachePolicy?: CachePolicy;
  subgraphs?: Runnable[];
  ends?: string[];
  constructor(fields: PregelNodeArgs<RunInput, RunOutput>);
  getWriters(): Array<Runnable>;
  getNode(): Runnable<RunInput, RunOutput> | undefined;
  join(channels: Array<string>): PregelNode<RunInput, RunOutput>;
  pipe<NewRunOutput>(coerceable: RunnableLike): PregelNode<RunInput, Exclude<NewRunOutput, Error>>;
}
//#endregion
export { PregelNode };
//# sourceMappingURL=read.d.ts.map