import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";

//#region src/utils.d.ts
interface RunnableCallableArgs extends Partial<any> {
  name?: string;
  func: (...args: any[]) => any;
  tags?: string[];
  trace?: boolean;
  recurse?: boolean;
}
declare class RunnableCallable<I = unknown, O = unknown> extends Runnable<I, O> {
  lc_namespace: string[];
  func: (...args: any[]) => any;
  tags?: string[];
  config?: RunnableConfig;
  trace: boolean;
  recurse: boolean;
  constructor(fields: RunnableCallableArgs);
  protected _tracedInvoke(input: I, config?: Partial<RunnableConfig>, runManager?: CallbackManagerForChainRun): Promise<O>;
  invoke(input: I, options?: Partial<RunnableConfig> | undefined): Promise<O>;
}
//#endregion
export { RunnableCallable };
//# sourceMappingURL=utils.d.cts.map