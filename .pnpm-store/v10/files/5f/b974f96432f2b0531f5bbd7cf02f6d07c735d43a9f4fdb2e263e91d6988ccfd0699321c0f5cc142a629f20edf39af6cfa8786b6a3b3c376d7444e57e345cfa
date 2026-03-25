import { BaseCallbackHandlerInput } from "@langchain/core/callbacks/base";
import { Document } from "@langchain/core/documents";
import { BaseTracer, Run } from "@langchain/core/tracers/base";
import { KVMap } from "langsmith/schemas";

//#region src/experimental/callbacks/handlers/datadog.d.ts
type DatadogLLMObsSpanKind = "llm" | "workflow" | "agent" | "tool" | "task" | "embedding" | "retrieval";
type DatadogLLMObsIO = {
  value: string;
} | {
  documents: {
    text?: string;
    id?: string;
    name?: string;
    score: string | number;
  }[];
} | {
  messages: {
    content: string;
    role?: string;
  }[];
};
interface DatadogLLMObsSpan {
  span_id: string;
  trace_id: string;
  parent_id: string;
  session_id?: string;
  name: string;
  start_ns: number;
  duration: number;
  error: number;
  status: string;
  tags?: string[];
  meta: {
    kind: DatadogLLMObsSpanKind;
    model_name?: string;
    model_provider?: string;
    temperature?: string;
    input: DatadogLLMObsIO;
    output: DatadogLLMObsIO | undefined;
  };
  metrics: {
    [key: string]: number;
  };
}
interface DatadogLLMObsRequestBody {
  data: {
    type: "span";
    attributes: {
      ml_app: string;
      tags: string[];
      spans: DatadogLLMObsSpan[];
      session_id?: string;
    };
  };
}
type FormatDocument<Metadata extends Record<string, any> = Record<string, any>> = (document: Document<Metadata>) => {
  text: string;
  id: string;
  name: string;
  score: number;
};
interface DatadogLLMObsTracerFields extends BaseCallbackHandlerInput {
  mlApp: string;
  userId?: string;
  userHandle?: string;
  sessionId?: string;
  env?: string;
  service?: string;
  tags?: Record<string, string | undefined>;
  ddApiKey?: string;
  ddLLMObsEndpoint?: string;
  formatDocument?: FormatDocument;
}
declare class DatadogLLMObsTracer extends BaseTracer implements DatadogLLMObsTracerFields {
  name: string;
  ddLLMObsEndpoint?: string;
  protected endpoint: string;
  protected headers: Record<string, string>;
  mlApp: string;
  sessionId?: string;
  tags: Record<string, string | undefined>;
  formatDocument?: FormatDocument;
  constructor(fields: DatadogLLMObsTracerFields);
  protected persistRun(_run: Run): Promise<void>;
  protected convertRunToDDSpans(run: Run): DatadogLLMObsSpan[];
  protected formatRequestBody(spans: DatadogLLMObsSpan[]): DatadogLLMObsRequestBody;
  protected uuidToBigInt(uuid: string): string;
  protected milisecondsToNanoseconds(ms: number): number;
  protected toDatadogSpanKind(kind: string): DatadogLLMObsSpanKind | null;
  protected transformInput(inputs: KVMap, spanKind: DatadogLLMObsSpanKind): DatadogLLMObsIO;
  protected transformOutput(outputs: KVMap | undefined, spanKind: DatadogLLMObsSpanKind): {
    output: DatadogLLMObsIO | undefined;
    tokensMetadata: Record<string, number>;
  };
  protected langchainRunToDatadogLLMObsSpan(run: Run): DatadogLLMObsSpan | null;
}
//#endregion
export { DatadogLLMObsIO, DatadogLLMObsRequestBody, DatadogLLMObsSpan, DatadogLLMObsSpanKind, DatadogLLMObsTracer, DatadogLLMObsTracerFields, FormatDocument };
//# sourceMappingURL=datadog.d.cts.map