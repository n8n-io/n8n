import { BaseCallbackHandlerInput } from "../callbacks/base.cjs";
import { BaseTracer, Run as Run$2 } from "./base.cjs";
import { BaseRun, KVMap, RunCreate, RunUpdate as RunUpdate$1 } from "langsmith/schemas";
import { RunTree, RunTreeConfig } from "langsmith/run_trees";
import { LangSmithTracingClientInterface } from "langsmith";

//#region src/tracers/tracer_langchain.d.ts
interface Run extends BaseRun {
  id: string;
  child_runs: this[];
  child_execution_order: number;
  dotted_order?: string;
  trace_id?: string;
}
interface RunCreate2 extends RunCreate {
  trace_id?: string;
  dotted_order?: string;
}
interface RunUpdate extends RunUpdate$1 {
  events: BaseRun["events"];
  inputs: KVMap;
  trace_id?: string;
  dotted_order?: string;
}
interface LangChainTracerFields extends BaseCallbackHandlerInput {
  exampleId?: string;
  projectName?: string;
  client?: LangSmithTracingClientInterface;
  replicas?: RunTreeConfig["replicas"];
}
declare class LangChainTracer extends BaseTracer implements LangChainTracerFields {
  name: string;
  projectName?: string;
  exampleId?: string;
  client: LangSmithTracingClientInterface;
  replicas?: RunTreeConfig["replicas"];
  usesRunTreeMap: boolean;
  constructor(fields?: LangChainTracerFields);
  protected persistRun(_run: Run): Promise<void>;
  onRunCreate(run: Run): Promise<void>;
  onRunUpdate(run: Run): Promise<void>;
  onLLMEnd(run: Run$2): void;
  getRun(id: string): Run | undefined;
  updateFromRunTree(runTree: RunTree): void;
  getRunTreeWithTracingConfig(id: string): RunTree | undefined;
  static getTraceableRunTree(): RunTree | undefined;
}
//#endregion
export { LangChainTracer, LangChainTracerFields, Run, RunCreate2, RunUpdate };
//# sourceMappingURL=tracer_langchain.d.cts.map