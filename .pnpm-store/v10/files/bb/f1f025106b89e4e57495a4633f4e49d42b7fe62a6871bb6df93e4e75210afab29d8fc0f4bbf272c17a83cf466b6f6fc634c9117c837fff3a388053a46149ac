import { BaseTracer, Run } from "../../tracers/base.cjs";

//#region src/utils/testing/tracers.d.ts
declare class SingleRunExtractor extends BaseTracer {
  runPromiseResolver: (run: Run) => void;
  runPromise: Promise<Run>;
  /** The name of the callback handler. */
  name: string;
  constructor();
  persistRun(run: Run): Promise<void>;
  extract(): Promise<Run>;
}
//#endregion
export { SingleRunExtractor };
//# sourceMappingURL=tracers.d.cts.map