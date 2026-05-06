import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { Serialized } from '@langchain/core/load/serializable';
import type { LLMResult } from '@langchain/core/outputs';
import { context, SpanStatusCode, trace } from '@opentelemetry/api';
import type { Span, Context } from '@opentelemetry/api';

const TRACER_NAME = 'n8n-ai';

/**
 * OpenTelemetry callback handler for LangChain operations.
 * Creates child spans under the active node.execute span for LLM calls,
 * tool invocations, and chain executions. This allows AI agent internals
 * to appear in your OTEL traces alongside workflow/node spans.
 *
 * Note: Streaming LLM callbacks (handleLLMNewToken) are intentionally not
 * instrumented — the span lifecycle is handled by handleLLMStart/handleLLMEnd
 * which works correctly for both streaming and non-streaming models. Token
 * usage may be absent in handleLLMEnd for some streaming providers.
 */
export class OtelAiCallbackHandler extends BaseCallbackHandler {
	name = 'OtelAiCallbackHandler';

	awaitHandlers = true;

	private readonly tracer = trace.getTracer(TRACER_NAME);

	private readonly spans = new Map<string, { span: Span; ctx: Context }>();

	private readonly parentCtx: Context;

	constructor(parentSpan?: Span) {
		super();
		// If a parent span is provided, create a context with it as the active span.
		// Otherwise fall back to the current active context (which should have the node.execute span).
		this.parentCtx = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active();
	}

	async handleLLMStart(
		llm: Serialized,
		prompts: string[],
		runId: string,
		parentRunId?: string,
		extraParams?: Record<string, unknown>,
	): Promise<void> {
		const modelName = extractModelName(llm, extraParams);
		const parentCtx = this.getParentContext(parentRunId);
		const span = this.tracer.startSpan(
			'ai.llm.call',
			{
				attributes: {
					'gen_ai.system': extractProvider(llm),
					'gen_ai.request.model': modelName,
					'n8n.ai.prompt.length': prompts.join('').length,
					...(extraParams?.temperature !== undefined && {
						'gen_ai.request.temperature': Number(extraParams.temperature),
					}),
					...(extraParams?.max_tokens !== undefined && {
						'gen_ai.request.max_tokens': Number(extraParams.max_tokens),
					}),
				},
			},
			parentCtx,
		);

		this.spans.set(runId, { span, ctx: trace.setSpan(parentCtx, span) });
	}

	async handleLLMEnd(output: LLMResult, runId: string): Promise<void> {
		const tracked = this.spans.get(runId);
		if (!tracked) return;

		const { span } = tracked;

		const tokenUsage = output.llmOutput?.tokenUsage ?? output.llmOutput?.usage;
		if (tokenUsage) {
			span.setAttributes({
				...(tokenUsage.promptTokens !== undefined && {
					'gen_ai.usage.input_tokens': tokenUsage.promptTokens,
				}),
				...(tokenUsage.completionTokens !== undefined && {
					'gen_ai.usage.output_tokens': tokenUsage.completionTokens,
				}),
				...(tokenUsage.totalTokens !== undefined && {
					'gen_ai.usage.total_tokens': tokenUsage.totalTokens,
				}),
			});
		}

		span.setStatus({ code: SpanStatusCode.OK });
		span.end();
		this.spans.delete(runId);
	}

	async handleLLMError(error: Error | object, runId: string): Promise<void> {
		const tracked = this.spans.get(runId);
		if (!tracked) return;

		const { span } = tracked;
		span.setStatus({ code: SpanStatusCode.ERROR, message: getErrorMessage(error) });
		span.addEvent('exception', {
			'exception.message': getErrorMessage(error),
			'exception.type': error instanceof Error ? error.constructor.name : 'Error',
		});
		span.end();
		this.spans.delete(runId);
	}

	async handleToolStart(
		tool: Serialized,
		input: string,
		runId: string,
		parentRunId?: string,
		_tags?: string[],
		_metadata?: Record<string, unknown>,
		name?: string,
	): Promise<void> {
		const toolName = name ?? tool.id?.[tool.id.length - 1] ?? 'unknown_tool';
		const parentCtx = this.getParentContext(parentRunId);
		const span = this.tracer.startSpan(
			'ai.tool.call',
			{
				attributes: {
					'n8n.ai.tool.name': toolName,
					'n8n.ai.tool.input.length': input.length,
				},
			},
			parentCtx,
		);

		this.spans.set(runId, { span, ctx: trace.setSpan(parentCtx, span) });
	}

	async handleToolEnd(output: string, runId: string): Promise<void> {
		const tracked = this.spans.get(runId);
		if (!tracked) return;

		const { span } = tracked;
		span.setAttribute('n8n.ai.tool.output.length', output.length);
		span.setStatus({ code: SpanStatusCode.OK });
		span.end();
		this.spans.delete(runId);
	}

	async handleToolError(error: Error | object, runId: string): Promise<void> {
		const tracked = this.spans.get(runId);
		if (!tracked) return;

		const { span } = tracked;
		span.setStatus({ code: SpanStatusCode.ERROR, message: getErrorMessage(error) });
		span.addEvent('exception', {
			'exception.message': getErrorMessage(error),
			'exception.type': error instanceof Error ? error.constructor.name : 'Error',
		});
		span.end();
		this.spans.delete(runId);
	}

	async handleChainStart(
		chain: Serialized,
		_inputs: Record<string, unknown>,
		runId: string,
		parentRunId?: string,
	): Promise<void> {
		const chainType = chain.id?.[chain.id.length - 1] ?? 'unknown_chain';
		const parentCtx = this.getParentContext(parentRunId);
		const span = this.tracer.startSpan(
			'ai.chain.call',
			{
				attributes: {
					'n8n.ai.chain.type': chainType,
				},
			},
			parentCtx,
		);

		this.spans.set(runId, { span, ctx: trace.setSpan(parentCtx, span) });
	}

	async handleChainEnd(_outputs: Record<string, unknown>, runId: string): Promise<void> {
		const tracked = this.spans.get(runId);
		if (!tracked) return;

		const { span } = tracked;
		span.setStatus({ code: SpanStatusCode.OK });
		span.end();
		this.spans.delete(runId);
	}

	async handleChainError(error: Error | object, runId: string): Promise<void> {
		const tracked = this.spans.get(runId);
		if (!tracked) return;

		const { span } = tracked;
		span.setStatus({ code: SpanStatusCode.ERROR, message: getErrorMessage(error) });
		span.addEvent('exception', {
			'exception.message': getErrorMessage(error),
			'exception.type': error instanceof Error ? error.constructor.name : 'Error',
		});
		span.end();
		this.spans.delete(runId);
	}

	async handleRetrieverStart(
		retriever: Serialized,
		query: string,
		runId: string,
		parentRunId?: string,
	): Promise<void> {
		const retrieverType = retriever.id?.[retriever.id.length - 1] ?? 'unknown_retriever';
		const parentCtx = this.getParentContext(parentRunId);
		const span = this.tracer.startSpan(
			'ai.retriever.call',
			{
				attributes: {
					'n8n.ai.retriever.type': retrieverType,
					'n8n.ai.retriever.query.length': query.length,
				},
			},
			parentCtx,
		);

		this.spans.set(runId, { span, ctx: trace.setSpan(parentCtx, span) });
	}

	async handleRetrieverEnd(
		documents: Array<{ pageContent: string }>,
		runId: string,
	): Promise<void> {
		const tracked = this.spans.get(runId);
		if (!tracked) return;

		const { span } = tracked;
		span.setAttribute('n8n.ai.retriever.document_count', documents.length);
		span.setStatus({ code: SpanStatusCode.OK });
		span.end();
		this.spans.delete(runId);
	}

	async handleRetrieverError(error: Error | object, runId: string): Promise<void> {
		const tracked = this.spans.get(runId);
		if (!tracked) return;

		const { span } = tracked;
		span.setStatus({ code: SpanStatusCode.ERROR, message: getErrorMessage(error) });
		span.addEvent('exception', {
			'exception.message': getErrorMessage(error),
			'exception.type': error instanceof Error ? error.constructor.name : 'Error',
		});
		span.end();
		this.spans.delete(runId);
	}

	/**
	 * Get the parent context for a new span. If the parent run has a tracked span,
	 * use that as parent (creating proper nesting). Otherwise use the root parent context
	 * (the node.execute span).
	 */
	private getParentContext(parentRunId?: string): Context {
		if (parentRunId) {
			const parentTracked = this.spans.get(parentRunId);
			if (parentTracked) return parentTracked.ctx;
		}
		return this.parentCtx;
	}
}

function extractModelName(llm: Serialized, extraParams?: Record<string, unknown>): string {
	if (extraParams?.model) return String(extraParams.model);
	if (extraParams?.modelName) return String(extraParams.modelName);
	if (llm.type === 'constructor' && llm.kwargs) {
		const kwargs = llm.kwargs as Record<string, unknown>;
		if (kwargs.model) return String(kwargs.model);
		if (kwargs.modelName) return String(kwargs.modelName);
	}
	return llm.id?.[llm.id.length - 1] ?? 'unknown';
}

function extractProvider(llm: Serialized): string {
	// The Serialized id array typically looks like ['langchain', 'llms', 'openai']
	// or ['langchain', 'chat_models', 'anthropic']
	if (llm.id && llm.id.length >= 3) {
		return llm.id[llm.id.length - 1];
	}
	return 'unknown';
}

function getErrorMessage(error: Error | object): string {
	if (error instanceof Error) return error.message;
	if (typeof error === 'object' && 'message' in error) return String(error.message);
	return String(error);
}
