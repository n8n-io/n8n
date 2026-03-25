import { BaseCallbackConfig } from "../../callbacks/manager.cjs";
import { Runnable } from "../../runnables/base.cjs";

//#region src/utils/testing/runnables.d.ts
declare class FakeRunnable extends Runnable<string, Record<string, unknown>> {
  lc_namespace: string[];
  returnOptions?: boolean;
  constructor(fields: {
    returnOptions?: boolean;
  });
  invoke(input: string, options?: Partial<BaseCallbackConfig>): Promise<Record<string, unknown>>;
}
//#endregion
export { FakeRunnable };
//# sourceMappingURL=runnables.d.cts.map