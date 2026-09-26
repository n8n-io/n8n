/**
 * Every constant below mirrors the published values of the `mlflow-tracing` npm
 * package, checked against 0.1.3 (`dist/core/constants.js`). The package is not a
 * dependency: it would add `@databricks/sdk-experimental` for type checking only,
 * and its entities are type-only exports, so its own client cannot be used
 * without reaching into `dist`. Diff against that file when MLflow changes.
 *
 * MLflow's `SpanType`, limited to the values a LangChain agent run produces.
 * The published enum has eleven; `mlflow/entities/span.py` on master has fifteen.
 */
export const MLFLOW_SPAN_TYPE = {
	Agent: 'AGENT',
	ChatModel: 'CHAT_MODEL',
	Llm: 'LLM',
	Tool: 'TOOL',
	Retriever: 'RETRIEVER',
} as const;

export type MlflowSpanType = (typeof MLFLOW_SPAN_TYPE)[keyof typeof MLFLOW_SPAN_TYPE];

/** `SpanAttributeKey` in mlflow-tracing 0.1.3. */
export const MLFLOW_ATTRIBUTE = {
	SpanType: 'mlflow.spanType',
	SpanInputs: 'mlflow.spanInputs',
	SpanOutputs: 'mlflow.spanOutputs',
	TraceRequestId: 'mlflow.traceRequestId',
	/** `{ input_tokens, output_tokens, total_tokens }`. */
	TokenUsage: 'mlflow.chat.tokenUsage',
	/** Tells the MLflow UI how to parse the messages in inputs and outputs. */
	MessageFormat: 'mlflow.message.format',
} as const;

/** `TraceMetadataKey` in mlflow-tracing 0.1.3. */
export const MLFLOW_TRACE_METADATA = {
	TokenUsage: 'mlflow.trace.tokenUsage',
} as const;

/**
 * Databricks serves the OpenAI protocol, so messages are reported in that shape
 * and the MLflow UI renders them as a chat transcript instead of raw LangChain
 * objects.
 */
export const MLFLOW_MESSAGE_FORMAT = 'openai';

export type MlflowStatusCode = 'OK' | 'ERROR';

export interface MlflowSpanStatus {
	code: MlflowStatusCode;
	/** Scrubbed of credential material. Only set when `code` is ERROR. */
	message?: string;
}

export interface TokenUsage {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
}

/**
 * One span in MLflow's own field naming. Ids are base64 of the raw id bytes and
 * times are Unix nanoseconds as decimal strings, both because nanoseconds exceed
 * the safe integer range and MLflow encodes ids that way (`encodeSpanIdToBase64`,
 * `convertHrTimeToNanoSeconds` in its TypeScript SDK).
 *
 * `attributes` values are JSON-encoded strings, per MLflow's span serialization.
 * The object is uploaded as it is, so it holds only MLflow fields.
 */
export interface MlflowSpan {
	trace_id: string;
	span_id: string;
	parent_span_id?: string;
	name: string;
	start_time_unix_nano: string;
	end_time_unix_nano: string;
	status: MlflowSpanStatus;
	attributes: Record<string, string>;
}

export interface CollectedTrace {
	traceId: string;
	rootSpanId: string;
	/** Parents always precede their children. */
	spans: MlflowSpan[];
	startTimeMs: number;
	endTimeMs: number;
	/** The root span's status, so a run that recovered from a failed step is OK. */
	state: MlflowStatusCode;
	/** The sum over all model calls. Unset when no model reported usage. */
	tokenUsage?: TokenUsage;
	/** From `getTracingConfig`, for MLflow's TraceInfo. */
	executionId?: string;
	workflowId?: string;
	nodeName?: string;
	/** The user's question and the agent's answer, as plain text. */
	requestPreview?: string;
	responsePreview?: string;
}
