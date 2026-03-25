import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";

//#region src/utils.d.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface RunnableCallableArgs extends Partial<any> {
  name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  func: (...args: any[]) => any;
  tags?: string[];
  trace?: boolean;
  recurse?: boolean;
}
declare class RunnableCallable<I = unknown, O = unknown> extends Runnable<I, O> {
  lc_namespace: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  func: (...args: any[]) => any;
  tags?: string[];
  config?: RunnableConfig;
  trace: boolean;
  recurse: boolean;
  constructor(fields: RunnableCallableArgs);
  protected _tracedInvoke(input: I, config?: Partial<RunnableConfig>, runManager?: CallbackManagerForChainRun): Promise<O>;
  invoke(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: I, options?: Partial<RunnableConfig> | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<O>;
}
//#endregion
export { RunnableCallable };
//# sourceMappingURL=utils.d.ts.map