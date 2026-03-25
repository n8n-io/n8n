import { AgentAction, AgentFinish } from "../agents.cjs";
import { Serialized } from "../load/serializable.cjs";
import { BaseMessage } from "../messages/base.cjs";
import { LLMResult } from "../outputs.cjs";
import { ChainValues } from "../utils/types/index.cjs";
import { Document } from "../documents/document.cjs";
import { BaseCallbackHandler, BaseCallbackHandlerInput, HandleLLMNewTokenCallbackFields, NewTokenIndices } from "../callbacks/base.cjs";
import * as langsmith_schemas0 from "langsmith/schemas";
import { BaseRun, KVMap } from "langsmith/schemas";
import { RunTree } from "langsmith/run_trees";

//#region src/tracers/base.d.ts
type RunType = string;
interface Run extends BaseRun {
  id: string;
  start_time: number;
  end_time?: number;
  execution_order: number;
  child_runs: this[];
  child_execution_order: number;
  events: Array<{
    name: string;
    time: string;
    kwargs?: Record<string, unknown>;
  }>;
  trace_id?: string;
  dotted_order?: string;
  /** @internal */
  _serialized_start_time?: string;
}
interface AgentRun extends Run {
  actions: AgentAction[];
}
declare function isBaseTracer(x: BaseCallbackHandler): x is BaseTracer;
declare abstract class BaseTracer extends BaseCallbackHandler {
  /** @deprecated Use `runTreeMap` instead. */
  protected runMap: Map<string, Run>;
  protected runTreeMap: Map<string, RunTree>;
  protected usesRunTreeMap: boolean;
  constructor(_fields?: BaseCallbackHandlerInput);
  copy(): this;
  protected getRunById(runId?: string): Run | undefined;
  protected stringifyError(error: unknown): string;
  protected abstract persistRun(run: Run): Promise<void>;
  protected _addChildRun(parentRun: Run, childRun: Run): void;
  _addRunToRunMap(run: Run): {
    name: string;
    run_type: string;
    extra?: KVMap | undefined;
    error?: string | undefined;
    serialized?: object | undefined;
    inputs: KVMap;
    outputs?: KVMap | undefined;
    reference_example_id?: string | undefined;
    parent_run_id?: string | undefined;
    tags?: string[] | undefined;
    attachments?: langsmith_schemas0.Attachments | undefined;
    id: string;
    start_time: number;
    end_time?: number | undefined;
    execution_order: number;
    child_runs: Run[];
    child_execution_order: number;
    events: {
      name: string;
      time: string;
      kwargs?: Record<string, unknown> | undefined;
    }[];
    trace_id?: string | undefined;
    dotted_order?: string | undefined; /** @internal */
    _serialized_start_time?: string | undefined;
  };
  protected _endTrace(run: Run): Promise<void>;
  protected _getExecutionOrder(parentRunId: string | undefined): number;
  /**
   * Create and add a run to the run map for LLM start events.
   * This must sometimes be done synchronously to avoid race conditions
   * when callbacks are backgrounded, so we expose it as a separate method here.
   */
  _createRunForLLMStart(llm: Serialized, prompts: string[], runId: string, parentRunId?: string, extraParams?: KVMap, tags?: string[], metadata?: KVMap, name?: string): {
    name: string;
    run_type: string;
    extra?: KVMap | undefined;
    error?: string | undefined;
    serialized?: object | undefined;
    inputs: KVMap;
    outputs?: KVMap | undefined;
    reference_example_id?: string | undefined;
    parent_run_id?: string | undefined;
    tags?: string[] | undefined;
    attachments?: langsmith_schemas0.Attachments | undefined;
    id: string;
    start_time: number;
    end_time?: number | undefined;
    execution_order: number;
    child_runs: Run[];
    child_execution_order: number;
    events: {
      name: string;
      time: string;
      kwargs?: Record<string, unknown> | undefined;
    }[];
    trace_id?: string | undefined;
    dotted_order?: string | undefined; /** @internal */
    _serialized_start_time?: string | undefined;
  };
  handleLLMStart(llm: Serialized, prompts: string[], runId: string, parentRunId?: string, extraParams?: KVMap, tags?: string[], metadata?: KVMap, name?: string): Promise<Run>;
  /**
   * Create and add a run to the run map for chat model start events.
   * This must sometimes be done synchronously to avoid race conditions
   * when callbacks are backgrounded, so we expose it as a separate method here.
   */
  _createRunForChatModelStart(llm: Serialized, messages: BaseMessage[][], runId: string, parentRunId?: string, extraParams?: KVMap, tags?: string[], metadata?: KVMap, name?: string): {
    name: string;
    run_type: string;
    extra?: KVMap | undefined;
    error?: string | undefined;
    serialized?: object | undefined;
    inputs: KVMap;
    outputs?: KVMap | undefined;
    reference_example_id?: string | undefined;
    parent_run_id?: string | undefined;
    tags?: string[] | undefined;
    attachments?: langsmith_schemas0.Attachments | undefined;
    id: string;
    start_time: number;
    end_time?: number | undefined;
    execution_order: number;
    child_runs: Run[];
    child_execution_order: number;
    events: {
      name: string;
      time: string;
      kwargs?: Record<string, unknown> | undefined;
    }[];
    trace_id?: string | undefined;
    dotted_order?: string | undefined; /** @internal */
    _serialized_start_time?: string | undefined;
  };
  handleChatModelStart(llm: Serialized, messages: BaseMessage[][], runId: string, parentRunId?: string, extraParams?: KVMap, tags?: string[], metadata?: KVMap, name?: string): Promise<Run>;
  handleLLMEnd(output: LLMResult, runId: string, _parentRunId?: string, _tags?: string[], extraParams?: Record<string, unknown>): Promise<Run>;
  handleLLMError(error: unknown, runId: string, _parentRunId?: string, _tags?: string[], extraParams?: Record<string, unknown>): Promise<Run>;
  /**
   * Create and add a run to the run map for chain start events.
   * This must sometimes be done synchronously to avoid race conditions
   * when callbacks are backgrounded, so we expose it as a separate method here.
   */
  _createRunForChainStart(chain: Serialized, inputs: ChainValues, runId: string, parentRunId?: string, tags?: string[], metadata?: KVMap, runType?: string, name?: string, extra?: Record<string, unknown>): {
    name: string;
    run_type: string;
    extra?: KVMap | undefined;
    error?: string | undefined;
    serialized?: object | undefined;
    inputs: KVMap;
    outputs?: KVMap | undefined;
    reference_example_id?: string | undefined;
    parent_run_id?: string | undefined;
    tags?: string[] | undefined;
    attachments?: langsmith_schemas0.Attachments | undefined;
    id: string;
    start_time: number;
    end_time?: number | undefined;
    execution_order: number;
    child_runs: Run[];
    child_execution_order: number;
    events: {
      name: string;
      time: string;
      kwargs?: Record<string, unknown> | undefined;
    }[];
    trace_id?: string | undefined;
    dotted_order?: string | undefined; /** @internal */
    _serialized_start_time?: string | undefined;
  };
  handleChainStart(chain: Serialized, inputs: ChainValues, runId: string, parentRunId?: string, tags?: string[], metadata?: KVMap, runType?: string, name?: string): Promise<Run>;
  handleChainEnd(outputs: ChainValues, runId: string, _parentRunId?: string, _tags?: string[], kwargs?: {
    inputs?: Record<string, unknown>;
  }): Promise<Run>;
  handleChainError(error: unknown, runId: string, _parentRunId?: string, _tags?: string[], kwargs?: {
    inputs?: Record<string, unknown>;
  }): Promise<Run>;
  /**
   * Create and add a run to the run map for tool start events.
   * This must sometimes be done synchronously to avoid race conditions
   * when callbacks are backgrounded, so we expose it as a separate method here.
   */
  _createRunForToolStart(tool: Serialized, input: string, runId: string, parentRunId?: string, tags?: string[], metadata?: KVMap, name?: string): {
    name: string;
    run_type: string;
    extra?: KVMap | undefined;
    error?: string | undefined;
    serialized?: object | undefined;
    inputs: KVMap;
    outputs?: KVMap | undefined;
    reference_example_id?: string | undefined;
    parent_run_id?: string | undefined;
    tags?: string[] | undefined;
    attachments?: langsmith_schemas0.Attachments | undefined;
    id: string;
    start_time: number;
    end_time?: number | undefined;
    execution_order: number;
    child_runs: Run[];
    child_execution_order: number;
    events: {
      name: string;
      time: string;
      kwargs?: Record<string, unknown> | undefined;
    }[];
    trace_id?: string | undefined;
    dotted_order?: string | undefined; /** @internal */
    _serialized_start_time?: string | undefined;
  };
  handleToolStart(tool: Serialized, input: string, runId: string, parentRunId?: string, tags?: string[], metadata?: KVMap, name?: string): Promise<Run>;
  handleToolEnd(output: any, runId: string): Promise<Run>;
  handleToolError(error: unknown, runId: string): Promise<Run>;
  handleAgentAction(action: AgentAction, runId: string): Promise<void>;
  handleAgentEnd(action: AgentFinish, runId: string): Promise<void>;
  /**
   * Create and add a run to the run map for retriever start events.
   * This must sometimes be done synchronously to avoid race conditions
   * when callbacks are backgrounded, so we expose it as a separate method here.
   */
  _createRunForRetrieverStart(retriever: Serialized, query: string, runId: string, parentRunId?: string, tags?: string[], metadata?: KVMap, name?: string): {
    name: string;
    run_type: string;
    extra?: KVMap | undefined;
    error?: string | undefined;
    serialized?: object | undefined;
    inputs: KVMap;
    outputs?: KVMap | undefined;
    reference_example_id?: string | undefined;
    parent_run_id?: string | undefined;
    tags?: string[] | undefined;
    attachments?: langsmith_schemas0.Attachments | undefined;
    id: string;
    start_time: number;
    end_time?: number | undefined;
    execution_order: number;
    child_runs: Run[];
    child_execution_order: number;
    events: {
      name: string;
      time: string;
      kwargs?: Record<string, unknown> | undefined;
    }[];
    trace_id?: string | undefined;
    dotted_order?: string | undefined; /** @internal */
    _serialized_start_time?: string | undefined;
  };
  handleRetrieverStart(retriever: Serialized, query: string, runId: string, parentRunId?: string, tags?: string[], metadata?: KVMap, name?: string): Promise<Run>;
  handleRetrieverEnd(documents: Document<Record<string, unknown>>[], runId: string): Promise<Run>;
  handleRetrieverError(error: unknown, runId: string): Promise<Run>;
  handleText(text: string, runId: string): Promise<void>;
  handleLLMNewToken(token: string, idx: NewTokenIndices, runId: string, _parentRunId?: string, _tags?: string[], fields?: HandleLLMNewTokenCallbackFields): Promise<Run>;
  onRunCreate?(run: Run): void | Promise<void>;
  onRunUpdate?(run: Run): void | Promise<void>;
  onLLMStart?(run: Run): void | Promise<void>;
  onLLMEnd?(run: Run): void | Promise<void>;
  onLLMError?(run: Run): void | Promise<void>;
  onChainStart?(run: Run): void | Promise<void>;
  onChainEnd?(run: Run): void | Promise<void>;
  onChainError?(run: Run): void | Promise<void>;
  onToolStart?(run: Run): void | Promise<void>;
  onToolEnd?(run: Run): void | Promise<void>;
  onToolError?(run: Run): void | Promise<void>;
  onAgentAction?(run: Run): void | Promise<void>;
  onAgentEnd?(run: Run): void | Promise<void>;
  onRetrieverStart?(run: Run): void | Promise<void>;
  onRetrieverEnd?(run: Run): void | Promise<void>;
  onRetrieverError?(run: Run): void | Promise<void>;
  onText?(run: Run): void | Promise<void>;
  onLLMNewToken?(run: Run, token: string, kwargs?: {
    chunk: any;
  }): void | Promise<void>;
}
//#endregion
export { AgentRun, BaseTracer, Run, RunType, isBaseTracer };
//# sourceMappingURL=base.d.cts.map