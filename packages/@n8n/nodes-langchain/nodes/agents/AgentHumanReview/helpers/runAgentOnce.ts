import omit from 'lodash/omit';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import type { IDataObject, IExecuteFunctions, IWebhookFunctions } from 'n8n-workflow';

import { getOptionalOutputParser } from '@utils/output_parsers/N8nOutputParser';

import {
	AGENT_TRACE_SCHEMA_VERSION,
	computeCost,
	describeModel,
	resolvePricing,
	TraceCallback,
	type AgentTrace,
	type Pricing,
} from './trace';
import {
	getChatModel,
	getOptionalMemory,
	getTools,
	preparePrompt,
} from '../../Agent/agents/ToolsAgent/common';
import { SYSTEM_MESSAGE } from '../../Agent/agents/ToolsAgent/prompt';
import { createAgentExecutor } from '../../Agent/agents/ToolsAgent/V2/execute';

export type { AgentTrace } from './trace';

/**
 * Either context the node runs the agent from. The first draft is produced in
 * `execute()`; every revise round is produced in `webhook()`, which is why this
 * runner cannot depend on anything only an execute context has (input items,
 * the data proxy, the cancel signal).
 */
export type AgentContext = IExecuteFunctions | IWebhookFunctions;

/**
 * Reads a node parameter from either context. The webhook signature has no item
 * index, so calling it execute-style would silently treat `0` as the fallback.
 */
export function getParam<T>(ctx: AgentContext, name: string, fallback: T): T {
	if ('getInputData' in ctx) {
		return ctx.getNodeParameter(name, 0, fallback) as T;
	}
	return ctx.getNodeParameter(name, fallback) as T;
}

export interface AgentRunResult {
	output: IDataObject;
	trace: AgentTrace;
}

export interface AgentOptions {
	systemMessage?: string;
	maxIterations?: number;
	returnIntermediateSteps?: boolean;
	/** Characters kept per message/tool payload in the trace; 0 = unlimited. */
	traceContentLimit?: number;
	/** JSON object merged into `trace.context.attributes`. */
	traceAttributes?: string;
	/** JSON map of model id → { input, output, cacheRead?, cacheWrite? } in USD per 1M tokens. */
	pricingOverride?: string;
}

/** Workflow-level facts the node knows and the trace should carry. */
export type TraceContext = IDataObject;

function parseJsonOption<T>(
	ctx: AgentContext,
	raw: string | undefined,
	label: string,
): T | undefined {
	if (!raw?.trim()) return undefined;
	try {
		return jsonParse<T>(raw);
	} catch (error) {
		ctx.logger.warn(`Ignoring invalid JSON in ${label}`, { error: (error as Error).message });
		return undefined;
	}
}

/**
 * Runs the connected chat model + tools (+ memory, + output parser) once with the
 * given prompt and returns the draft plus a full trace of how it was produced.
 * Tools are executed in-process, LangChain style, because a webhook context has
 * no engine loop to hand tool calls to.
 */
export async function runAgentOnce(
	ctx: AgentContext,
	input: string,
	options: AgentOptions,
	context: TraceContext = {},
): Promise<AgentRunResult> {
	const startedAt = Date.now();

	const model = await getChatModel(ctx, 0);
	if (!model) {
		throw new NodeOperationError(ctx.getNode(), 'A Chat Model must be connected');
	}
	const fallbackModel = getParam(ctx, 'needsFallback', false) ? await getChatModel(ctx, 1) : null;
	const memory = await getOptionalMemory(ctx);
	const outputParser = await getOptionalOutputParser(ctx);
	const tools = await getTools(ctx, outputParser);

	const modelInfo = describeModel(model);
	const pricingOverride = parseJsonOption<Record<string, Pricing>>(
		ctx,
		options.pricingOverride,
		'Model Pricing Override',
	);
	const pricing = resolvePricing(modelInfo.name, pricingOverride);
	const attributes = parseJsonOption<IDataObject>(ctx, options.traceAttributes, 'Trace Attributes');

	// Mirrors the stock agent's prompt minus binary passthrough, which needs input items.
	const prompt = preparePrompt([
		['system', `{system_message}${outputParser ? '\n\n{formatting_instructions}' : ''}`],
		['placeholder', '{chat_history}'],
		['human', '{input}'],
		['placeholder', '{agent_scratchpad}'],
	]);

	const executor = createAgentExecutor(
		model,
		tools,
		prompt,
		options,
		outputParser,
		memory,
		fallbackModel,
	);

	const systemMessage = options.systemMessage ?? SYSTEM_MESSAGE;
	const tracer = new TraceCallback({
		contentLimit: options.traceContentLimit ?? 4000,
		pricing: pricing?.rates,
		defaultModel: modelInfo.name,
	});

	let response: Record<string, unknown>;
	try {
		response = await executor.invoke(
			{
				input,
				system_message: systemMessage,
				formatting_instructions:
					'IMPORTANT: For your response to user, you MUST use the `format_final_json_response` tool with your complete answer formatted according to the required schema. Do not attempt to format the JSON manually - always use this tool. Your response will be rejected if it is not properly formatted through this tool. Only use this tool once you are ready to provide your final answer.',
			},
			{
				callbacks: [tracer],
				signal: 'getExecutionCancelSignal' in ctx ? ctx.getExecutionCancelSignal() : undefined,
			},
		);
	} catch (error) {
		tracer.errors.push({ stage: 'agent', message: (error as Error).message });
		throw error;
	}

	// Same post-processing as the stock agent when memory + parser are both connected.
	if (memory && outputParser) {
		const parsed = jsonParse<{ output: Record<string, unknown> }>(response.output as string);
		response.output = parsed?.output ?? parsed;
	}

	const output = omit(
		response,
		'system_message',
		'formatting_instructions',
		'input',
		'chat_history',
		'agent_scratchpad',
	) as IDataObject;

	const endedAt = Date.now();
	const fallbackInfo = fallbackModel ? describeModel(fallbackModel) : undefined;
	const trace: AgentTrace = {
		schemaVersion: AGENT_TRACE_SCHEMA_VERSION,
		startedAt: new Date(startedAt).toISOString(),
		endedAt: new Date(endedAt).toISOString(),
		latencyMs: endedAt - startedAt,
		model: {
			...modelInfo,
			fallback: fallbackInfo
				? { provider: fallbackInfo.provider, name: fallbackInfo.name }
				: undefined,
		},
		prompt: { input, systemMessage },
		llmCalls: tracer.llmCalls,
		toolCalls: tracer.toolCalls,
		usage: { ...tracer.usage, llmCalls: tracer.llmCalls.length },
		cost: pricing
			? {
					...computeCost(tracer.usage, pricing.rates),
					pricing: { source: pricing.source, model: modelInfo.name, ratesPer1M: pricing.rates },
				}
			: undefined,
		tools: {
			available: tools.map((tool) => ({ name: tool.name, description: tool.description })),
			memory: { connected: !!memory, type: memory?.constructor?.name },
			outputParser: { connected: !!outputParser, type: outputParser?.constructor?.name },
		},
		context: {
			...context,
			maxIterations: options.maxIterations ?? 10,
			...(attributes ? { attributes } : {}),
		},
		errors: tracer.errors,
	};

	return { output, trace };
}
