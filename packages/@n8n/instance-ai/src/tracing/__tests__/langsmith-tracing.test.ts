import type { Context, ContextManager } from '@opentelemetry/api';
import { jsonParse } from 'n8n-workflow';
import type * as AsyncHooks from 'node:async_hooks';

import { executeTool } from '../../__tests__/tool-test-utils';

jest.mock('@n8n/agents', () => {
	const actual = jest.requireActual<Record<string, unknown>>('@n8n/agents');
	const { AsyncLocalStorage } = jest.requireActual<typeof AsyncHooks>('node:async_hooks');
	const { ROOT_CONTEXT, context, trace } = jest.requireActual<{
		ROOT_CONTEXT: Context;
		context: {
			active(): Context;
			with<T>(
				ctx: Context,
				fn: (...args: unknown[]) => T,
				thisArg?: unknown,
				...args: unknown[]
			): T;
			setGlobalContextManager(contextManager: ContextManager): boolean;
		};
		trace: {
			getSpan(ctx: Context): unknown;
			setSpan(ctx: Context, span: unknown): Context;
		};
	}>('@opentelemetry/api');

	let spanCounter = 0;
	const contextStorage = new AsyncLocalStorage<Context>();
	const contextManager: ContextManager = {
		active: () => contextStorage.getStore() ?? ROOT_CONTEXT,
		with: (ctx, fn, thisArg, ...args) => contextStorage.run(ctx, () => fn.call(thisArg, ...args)),
		bind: (_ctx, target) => target,
		enable: () => contextManager,
		disable: () => contextManager,
	};
	context.setGlobalContextManager(contextManager);

	const spans: Array<{
		id: string;
		traceId: string;
		parentSpanId?: string;
		name: string;
		attributes: Record<string, unknown>;
		status?: { code: number; message?: string };
		ended: boolean;
	}> = [];

	function nextHex(length: number): string {
		spanCounter += 1;
		return spanCounter.toString(16).padStart(length, '0').slice(-length);
	}

	class MockSpan {
		private readonly traceId: string;
		private readonly spanId: string;
		private readonly record: (typeof spans)[number];

		constructor(name: string, attributes: Record<string, unknown>, parentSpan?: MockSpan) {
			this.traceId = parentSpan?.spanContext().traceId ?? nextHex(32);
			this.spanId = nextHex(16);
			this.record = {
				id: this.spanId,
				traceId: this.traceId,
				...(parentSpan ? { parentSpanId: parentSpan.spanContext().spanId } : {}),
				name,
				attributes: { ...attributes },
				ended: false,
			};
			spans.push(this.record);
		}

		spanContext(): { traceId: string; spanId: string } {
			return { traceId: this.traceId, spanId: this.spanId };
		}

		setAttributes(attributes: Record<string, unknown>): void {
			Object.assign(this.record.attributes, attributes);
		}

		recordException(): void {}

		setStatus(status: { code: number; message?: string }): void {
			this.record.status = status;
		}

		end(): void {
			this.record.ended = true;
		}
	}

	const tracer = {
		startSpan: (
			name: string,
			options?: { attributes?: Record<string, unknown> },
			parentContext?: Context,
		) => {
			const parentSpan = trace.getSpan(parentContext ?? context.active()) as MockSpan | undefined;
			return new MockSpan(name, options?.attributes ?? {}, parentSpan);
		},
		startActiveSpan: async <T>(
			name: string,
			options: { attributes?: Record<string, unknown> },
			fn: (span: MockSpan) => Promise<T>,
		): Promise<T> => {
			const span = tracer.startSpan(name, options);
			const spanContext = trace.setSpan(context.active(), span as never);
			return await context.with(spanContext, async () => await fn(span));
		},
	};

	const provider = {
		forceFlush: jest.fn(async () => await Promise.resolve()),
		shutdown: jest.fn(async () => await Promise.resolve()),
	};

	class MockLangSmithTelemetry {
		private functionIdValue?: string;
		private metadataValue?: Record<string, unknown>;
		private recordInputsValue = true;
		private recordOutputsValue = true;
		private runtimeRootSpanEnabledValue = true;

		functionId(value: string): this {
			this.functionIdValue = value;
			return this;
		}

		metadata(value: Record<string, unknown>): this {
			this.metadataValue = value;
			return this;
		}

		recordInputs(value: boolean): this {
			this.recordInputsValue = value;
			return this;
		}

		recordOutputs(value: boolean): this {
			this.recordOutputsValue = value;
			return this;
		}

		runtimeRootSpan(value: boolean): this {
			this.runtimeRootSpanEnabledValue = value;
			return this;
		}

		async build(): Promise<Record<string, unknown>> {
			return await Promise.resolve({
				enabled: true,
				functionId: this.functionIdValue,
				metadata: this.metadataValue,
				recordInputs: this.recordInputsValue,
				recordOutputs: this.recordOutputsValue,
				runtimeRootSpanEnabled: this.runtimeRootSpanEnabledValue,
				integrations: [],
				tracer,
				provider,
			});
		}
	}

	return {
		...actual,
		LangSmithTelemetry: MockLangSmithTelemetry,
		__mock: {
			reset: () => {
				spanCounter = 0;
				spans.length = 0;
				provider.forceFlush.mockClear();
				provider.shutdown.mockClear();
			},
			getSpans: () => spans,
			getProvider: () => provider,
		},
	};
});

jest.mock('langsmith', () => {
	let runCounter = 0;
	const createdRunTrees: Array<{
		id: string;
		dotted_order: string;
		name: string;
		run_type: string;
		parent_run_id?: string;
		client?: unknown;
	}> = [];

	class MockRunTree {
		id: string;
		name: string;
		run_type: string;
		project_name: string;
		parent_run?: MockRunTree;
		parent_run_id?: string;
		child_runs: MockRunTree[];
		start_time: number;
		end_time?: number;
		extra: { metadata?: Record<string, unknown> };
		tags?: string[];
		error?: string;
		serialized: Record<string, never>;
		inputs: Record<string, unknown>;
		outputs?: Record<string, unknown>;
		events?: Array<Record<string, unknown>>;
		trace_id: string;
		dotted_order: string;
		execution_order: number;
		child_execution_order: number;
		client?: unknown;

		constructor(config: {
			id?: string;
			name: string;
			run_type?: string;
			project_name?: string;
			parent_run?: MockRunTree;
			parent_run_id?: string;
			start_time?: number;
			end_time?: number;
			metadata?: Record<string, unknown>;
			tags?: string[];
			error?: string;
			inputs?: Record<string, unknown>;
			outputs?: Record<string, unknown>;
			execution_order?: number;
			child_execution_order?: number;
			trace_id?: string;
			dotted_order?: string;
			serialized?: Record<string, never>;
			client?: unknown;
		}) {
			runCounter += 1;
			this.id = config.id ?? `run-${runCounter}`;
			this.name = config.name;
			this.run_type = config.run_type ?? 'chain';
			this.project_name = config.project_name ?? 'instance-ai';
			this.parent_run = config.parent_run;
			this.parent_run_id = config.parent_run_id;
			this.child_runs = [];
			this.start_time = config.start_time ?? runCounter;
			this.end_time = config.end_time;
			this.extra = config.metadata ? { metadata: { ...config.metadata } } : {};
			this.tags = config.tags;
			this.error = config.error;
			this.serialized = config.serialized ?? {};
			this.inputs = config.inputs ?? {};
			this.outputs = config.outputs;
			this.events = [];
			this.execution_order = config.execution_order ?? 1;
			this.child_execution_order = config.child_execution_order ?? this.execution_order;
			this.trace_id = config.trace_id ?? this.parent_run?.trace_id ?? this.id;
			this.dotted_order =
				config.dotted_order ??
				(this.parent_run ? `${this.parent_run.dotted_order}.${this.id}` : this.id);
			this.client = config.client;

			createdRunTrees.push({
				id: this.id,
				dotted_order: this.dotted_order,
				name: this.name,
				run_type: this.run_type,
				...(this.parent_run_id ? { parent_run_id: this.parent_run_id } : {}),
				...(this.client ? { client: this.client } : {}),
			});
		}

		get metadata(): Record<string, unknown> | undefined {
			return this.extra.metadata;
		}

		set metadata(metadata: Record<string, unknown> | undefined) {
			this.extra = metadata ? { ...this.extra, metadata: { ...metadata } } : this.extra;
		}

		createChild(config: {
			name: string;
			run_type?: string;
			tags?: string[];
			metadata?: Record<string, unknown>;
			inputs?: Record<string, unknown>;
		}): MockRunTree {
			const childExecutionOrder = this.child_execution_order + 1;
			const child = new MockRunTree({
				...config,
				parent_run: this,
				parent_run_id: this.id,
				project_name: this.project_name,
				execution_order: childExecutionOrder,
				child_execution_order: childExecutionOrder,
			});

			this.child_execution_order = Math.max(this.child_execution_order, childExecutionOrder);
			this.child_runs.push(child);

			return child;
		}

		async postRun(): Promise<void> {
			await Promise.resolve();
		}

		async end(
			outputs?: Record<string, unknown>,
			error?: string,
			endTime = Date.now(),
			metadata?: Record<string, unknown>,
		): Promise<void> {
			this.outputs = outputs ?? this.outputs;
			this.error = error ?? this.error;
			this.end_time = endTime;
			if (metadata) {
				this.metadata = {
					...(this.metadata ?? {}),
					...metadata,
				};
			}
			await Promise.resolve();
		}

		async patchRun(): Promise<void> {
			if (this.parent_run_id === undefined && this.dotted_order.includes('.')) {
				await Promise.resolve();
				throw new Error(
					'invalid dotted_order: dotted_order must contain a single part for root runs',
				);
			}
			await Promise.resolve();
		}

		addEvent(event: Record<string, unknown> | string): void {
			this.events?.push(typeof event === 'string' ? { message: event } : event);
		}

		toHeaders(): { 'langsmith-trace': string; baggage: string } {
			return {
				'langsmith-trace': this.dotted_order,
				baggage: '',
			};
		}
	}

	const createFeedbackCalls: Array<{
		runId: string;
		key: string;
		options: Record<string, unknown>;
		clientApiUrl: string;
	}> = [];

	class MockClient {
		apiUrl: string;
		apiKey: string;

		constructor(config: { apiUrl?: string; apiKey?: string }) {
			this.apiUrl = config.apiUrl ?? '';
			this.apiKey = config.apiKey ?? '';
		}

		// eslint-disable-next-line @typescript-eslint/require-await
		async createFeedback(
			runId: string,
			key: string,
			options: Record<string, unknown>,
		): Promise<void> {
			createFeedbackCalls.push({ runId, key, options, clientApiUrl: this.apiUrl });
		}
	}

	return {
		Client: MockClient,
		RunTree: MockRunTree,
		__mock: {
			reset: () => {
				runCounter = 0;
				createdRunTrees.length = 0;
				createFeedbackCalls.length = 0;
			},
			getCreatedRunTrees: () => createdRunTrees,
			getCreateFeedbackCalls: () => createFeedbackCalls,
		},
	};
});

jest.mock('langsmith/traceable', () => {
	let currentRunTree: unknown;

	return {
		traceable: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
		getCurrentRunTree: () => currentRunTree,
		withRunTree: async <T>(runTree: unknown, fn: () => Promise<T>): Promise<T> => {
			const previous = currentRunTree;
			currentRunTree = runTree;
			try {
				return await fn();
			} finally {
				currentRunTree = previous;
			}
		},
	};
});

type LangSmithMockModule = {
	__mock: {
		reset: () => void;
		getCreatedRunTrees: () => Array<{
			id: string;
			dotted_order: string;
			name: string;
			run_type: string;
			parent_run_id?: string;
			client?: unknown;
		}>;
		getCreateFeedbackCalls: () => Array<{
			runId: string;
			key: string;
			options: Record<string, unknown>;
			clientApiUrl: string;
		}>;
	};
};

type AgentsMockModule = {
	__mock: {
		reset: () => void;
		getSpans: () => Array<{
			id: string;
			traceId: string;
			parentSpanId?: string;
			name: string;
			attributes: Record<string, unknown>;
			status?: { code: number; message?: string };
			ended: boolean;
		}>;
		getProvider: () => {
			forceFlush: jest.Mock<Promise<void>, []>;
			shutdown: jest.Mock<Promise<void>, []>;
		};
	};
};

function isExecutableTool(
	value: unknown,
): value is { handler: (input: unknown, context: unknown) => Promise<unknown> } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'handler' in value &&
		typeof value.handler === 'function'
	);
}

const {
	buildAgentTraceInputs,
	createDetachedSubAgentTraceContext,
	createInstanceAiTraceContext,
	continueInstanceAiTraceContext,
	mergeTraceRunInputs,
	redactLangSmithTelemetrySpan,
	submitLangsmithUserFeedback,
	withCurrentTraceSpan,
} =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../langsmith-tracing') as typeof import('../langsmith-tracing');
const { createAskUserTool } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../../tools/shared/ask-user.tool') as typeof import('../../tools/shared/ask-user.tool');
const { __mock: langsmithMock } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('langsmith') as LangSmithMockModule;
const { __mock: agentsMock } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@n8n/agents') as AgentsMockModule;

describe('createInstanceAiTraceContext', () => {
	const originalLangSmithApiKey = process.env.LANGSMITH_API_KEY;
	const originalLangSmithTracing = process.env.LANGSMITH_TRACING;
	const originalLangChainTracingV2 = process.env.LANGCHAIN_TRACING_V2;

	beforeEach(() => {
		langsmithMock.reset();
		agentsMock.reset();
		process.env.LANGSMITH_API_KEY = 'test-key';
		delete process.env.LANGSMITH_TRACING;
		delete process.env.LANGCHAIN_TRACING_V2;
	});

	afterAll(() => {
		process.env.LANGSMITH_API_KEY = originalLangSmithApiKey;
		if (originalLangSmithTracing === undefined) {
			delete process.env.LANGSMITH_TRACING;
		} else {
			process.env.LANGSMITH_TRACING = originalLangSmithTracing;
		}
		if (originalLangChainTracingV2 === undefined) {
			delete process.env.LANGCHAIN_TRACING_V2;
		} else {
			process.env.LANGCHAIN_TRACING_V2 = originalLangChainTracingV2;
		}
	});

	it('persists the parent run id for child runs created from a parent run tree', async () => {
		const tracing = await createInstanceAiTraceContext({
			threadId: 'thread-1',
			messageId: 'message-1',
			runId: 'run-1',
			userId: 'user-1',
			input: { message: 'What workflows do I have?' },
		});

		expect(tracing).toBeDefined();
		expect(tracing?.orchestratorRun.parentRunId).toBe(tracing?.messageRun.id);
	});

	it('creates native telemetry with thread and run metadata', async () => {
		const tracing = await createInstanceAiTraceContext({
			threadId: 'thread-1',
			conversationId: 'conversation-1',
			messageId: 'message-1',
			messageGroupId: 'group-1',
			runId: 'run-1',
			userId: 'user-1',
			input: { message: 'What workflows do I have?' },
		});

		expect(tracing?.getTelemetry).toBeDefined();

		const telemetryOrBuilder = tracing!.getTelemetry!({
			agentRole: 'orchestrator',
			functionId: 'instance-ai.orchestrator',
			executionMode: 'foreground',
			metadata: { custom_flag: true },
		});
		const telemetry =
			'build' in telemetryOrBuilder ? await telemetryOrBuilder.build() : telemetryOrBuilder;

		expect(telemetry.functionId).toBe('instance-ai.orchestrator');
		expect(telemetry.recordInputs).toBe(true);
		expect(telemetry.recordOutputs).toBe(true);
		expect(telemetry.runtimeRootSpanEnabled).toBe(false);
		expect(telemetry.metadata).toEqual(
			expect.objectContaining({
				thread_id: 'thread-1',
				conversation_id: 'conversation-1',
				message_group_id: 'group-1',
				message_id: 'message-1',
				run_id: 'run-1',
				user_id: 'user-1',
				agent_role: 'orchestrator',
				execution_mode: 'foreground',
				trace_kind: 'message_turn',
				langsmith_trace_id: tracing?.rootRun.traceId,
				langsmith_root_run_id: tracing?.rootRun.id,
				langsmith_actor_run_id: tracing?.actorRun.id,
				custom_flag: true,
			}),
		);

		await telemetry.provider?.shutdown();
	});

	it('redacts secret-bearing native telemetry span attributes', () => {
		const span = {
			attributes: {
				'ai.prompt.messages': JSON.stringify([
					{
						role: 'user',
						content: [{ type: 'text', text: 'use token=secret-token' }],
						credentials: { apiKey: 'secret-key', id: 'cred-1' },
					},
				]),
				'ai.response.text': 'Authorization: Bearer abc.def.ghi',
				'ai.telemetry.metadata.thread_id': 'thread-1',
				'ai.usage.inputTokens': 123,
				'ai.usage.outputTokens': 45,
				'ai.usage.cachedInputTokens': 67,
				'ai.usage.inputTokenDetails.cacheReadTokens': 67,
				'gen_ai.usage.input_tokens': 123,
				'gen_ai.usage.input_token_details': JSON.stringify({ cache_read: 67 }),
				'headers.authorization': 'Bearer secret',
				'metadata.access_token': 'secret-token',
				'langsmith.span.parent_id': 'parent-run-1',
				'langsmith.is_root': true,
			},
		};

		const redacted = redactLangSmithTelemetrySpan(span);

		expect(redacted).toEqual({
			attributes: {
				'ai.prompt.messages': JSON.stringify([
					{
						role: 'user',
						content: [{ type: 'text', text: 'use token=[redacted]' }],
						credentials: '[redacted]',
					},
				]),
				'ai.response.text': 'Authorization: Bearer [redacted]',
				'ai.telemetry.metadata.thread_id': 'thread-1',
				'ai.usage.inputTokens': 123,
				'ai.usage.outputTokens': 45,
				'ai.usage.cachedInputTokens': 67,
				'ai.usage.inputTokenDetails.cacheReadTokens': 67,
				'gen_ai.usage.input_tokens': 123,
				'gen_ai.usage.input_token_details': JSON.stringify({ cache_read: 67 }),
				'headers.authorization': '[redacted]',
				'metadata.access_token': '[redacted]',
				'langsmith.span.parent_id': 'parent-run-1',
				'langsmith.is_root': true,
			},
		});
	});

	it('adds LangSmith prompt input with tool specs for native AI SDK spans', () => {
		const span = {
			attributes: {
				'ai.prompt.messages': JSON.stringify([{ role: 'user', content: 'hello' }]),
				'ai.prompt.tools': [
					JSON.stringify({
						type: 'function',
						name: 'lookup',
						description: 'Lookup records',
						input_schema: {
							type: 'object',
							properties: {
								query: { type: 'string' },
							},
						},
					}),
				],
				'ai.prompt.toolChoice': JSON.stringify({ type: 'auto' }),
			},
		};

		const redacted = redactLangSmithTelemetrySpan(span) as {
			attributes: Record<string, unknown>;
		};
		const prompt = jsonParse<Record<string, unknown>>(
			redacted.attributes['gen_ai.prompt'] as string,
		);

		expect(prompt).toEqual({
			input: [{ role: 'user', content: 'hello' }],
			tools: [
				{
					type: 'function',
					name: 'lookup',
					description: 'Lookup records',
					input_schema: {
						type: 'object',
						properties: {
							query: { type: 'string' },
						},
					},
				},
			],
			tool_choice: { type: 'auto' },
		});
	});

	it('finishes OTel child spans with their parent linkage', async () => {
		const tracing = await createInstanceAiTraceContext({
			threadId: 'thread-1',
			messageId: 'message-1',
			runId: 'run-1',
			userId: 'user-1',
			input: { message: 'What workflows do I have?' },
		});

		expect(tracing).toBeDefined();
		await expect(
			tracing?.finishRun(tracing.orchestratorRun, {
				outputs: { result: 'done' },
			}),
		).resolves.toBeUndefined();

		const spans = agentsMock.getSpans();
		const orchestratorSpan = spans.find((span) => span.id === tracing?.orchestratorRun.otelSpanId);
		expect(orchestratorSpan?.parentSpanId).toBe(tracing?.messageRun.otelSpanId);
		expect(orchestratorSpan?.ended).toBe(true);
		expect(orchestratorSpan?.attributes.gen_ai_completion).toBeUndefined();
		expect(orchestratorSpan?.attributes['gen_ai.completion']).toBe(
			JSON.stringify({ result: 'done' }),
		);
	});

	it('reuses the same message root when continuing a trace for the same message group', async () => {
		const tracing = await createInstanceAiTraceContext({
			threadId: 'thread-1',
			messageId: 'message-1',
			messageGroupId: 'group-1',
			runId: 'run-1',
			userId: 'user-1',
			input: { message: 'initial turn' },
		});

		expect(tracing).toBeDefined();

		const continuedTracing = await continueInstanceAiTraceContext(tracing!, {
			threadId: 'thread-1',
			messageId: 'message-1',
			messageGroupId: 'group-1',
			runId: 'run-2',
			userId: 'user-1',
			input: { message: 'follow-up turn' },
		});

		expect(continuedTracing.messageRun).toBe(tracing?.messageRun);
		expect(continuedTracing.messageRun.id).toBe(tracing?.messageRun.id);
		expect(continuedTracing.orchestratorRun.id).not.toBe(tracing?.orchestratorRun.id);
		expect(continuedTracing.orchestratorRun.parentRunId).toBe(tracing?.messageRun.id);
	});

	it('creates detached sub-agent traces as separate root traces', async () => {
		const tracing = await createDetachedSubAgentTraceContext({
			threadId: 'thread-1',
			conversationId: 'thread-1',
			messageGroupId: 'group-1',
			messageId: 'message-1',
			runId: 'run-1',
			userId: 'user-1',
			agentId: 'agent-builder-1',
			role: 'workflow-builder',
			kind: 'builder',
			taskId: 'build-1',
			spawnedByTraceId: 'trace-parent-1',
			spawnedBySpanId: 'span-parent-1',
			spawnedByRunId: 'run-parent-1',
			spawnedByAgentId: 'agent-001',
			spawnedByAgentRole: 'orchestrator',
			spawnedByToolCallId: 'toolu-1',
			input: { task: 'Build a workflow' },
		});

		expect(tracing).toBeDefined();
		expect(tracing?.traceKind).toBe('detached_subagent');
		expect(tracing?.rootRun.id).toBe(tracing?.actorRun.id);
		expect(tracing?.rootRun.parentRunId).toBeUndefined();
		expect(tracing?.rootRun.name).toBe('instance-ai.subagent.workflow-builder');
		expect(tracing?.rootRun.metadata).toEqual(
			expect.objectContaining({
				thread_id: 'thread-1',
				message_group_id: 'group-1',
				task_id: 'build-1',
				task_kind: 'builder',
				agent_id: 'agent-builder-1',
				spawned_by_trace_id: 'trace-parent-1',
				spawned_by_span_id: 'span-parent-1',
				spawned_by_run_id: 'run-parent-1',
				spawned_by_agent_id: 'agent-001',
				spawned_by_agent_role: 'orchestrator',
				spawned_by_tool_call_id: 'toolu-1',
			}),
		);

		const telemetryOrBuilder = tracing!.getTelemetry!({
			agentRole: 'workflow-builder',
			functionId: 'instance-ai.subagent.workflow-builder',
			executionMode: 'detached_subagent',
		});
		const telemetry =
			'build' in telemetryOrBuilder ? await telemetryOrBuilder.build() : telemetryOrBuilder;

		expect(telemetry.runtimeRootSpanEnabled).toBe(false);
	});

	it('attaches root agent config without duplicating it into llm steps', async () => {
		const tracing = await createDetachedSubAgentTraceContext({
			threadId: 'thread-1',
			conversationId: 'thread-1',
			messageGroupId: 'group-1',
			messageId: 'message-1',
			runId: 'run-1',
			userId: 'user-1',
			agentId: 'agent-builder-1',
			role: 'workflow-builder',
			kind: 'builder',
			taskId: 'build-1',
			input: { task: 'Build a workflow' },
		});

		expect(tracing).toBeDefined();

		mergeTraceRunInputs(
			tracing?.actorRun,
			buildAgentTraceInputs({
				systemPrompt: ['line 1', 'line 2', 'line 3', 'line 4'].join('\n').repeat(700),
				tools: {
					'build-workflow': {
						description: 'Build or patch a workflow from SDK code.',
					},
					'submit-workflow': {
						description: 'Submit a workflow to n8n.',
					},
				} as never,
				modelId: 'anthropic/claude-sonnet-4-6',
			}),
		);

		const actorInputs = tracing?.actorRun.inputs as Record<string, unknown>;
		const loadedTools = actorInputs.loaded_tools as Array<Record<string, unknown>>;
		const systemPrompt = actorInputs.system_prompt as Record<string, unknown>;

		expect(actorInputs.task).toBe('Build a workflow');
		expect(actorInputs.model).toBe('anthropic/claude-sonnet-4-6');
		expect(actorInputs.loaded_tool_count).toBe(2);
		expect(loadedTools).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'build-workflow' }),
				expect.objectContaining({ name: 'submit-workflow' }),
			]),
		);
		expect(systemPrompt.part_01).toEqual(expect.any(String));
		expect(systemPrompt.part_02).toEqual(expect.any(String));
	});

	it('persists merged actor inputs while the actor run is active', async () => {
		const tracing = await createDetachedSubAgentTraceContext({
			threadId: 'thread-1',
			conversationId: 'thread-1',
			messageGroupId: 'group-1',
			messageId: 'message-1',
			runId: 'run-1',
			userId: 'user-1',
			agentId: 'agent-builder-1',
			role: 'workflow-builder',
			kind: 'builder',
			taskId: 'build-1',
			input: { task: 'Build a workflow' },
		});

		expect(tracing).toBeDefined();

		await tracing?.withRunTree(tracing.actorRun, async () => {
			mergeTraceRunInputs(
				tracing?.actorRun,
				buildAgentTraceInputs({
					systemPrompt: 'system prompt',
					tools: {
						'build-workflow': {
							description: 'Build or patch a workflow from SDK code.',
						},
					} as never,
					modelId: 'anthropic/claude-sonnet-4-6',
				}),
			);
			await Promise.resolve();
		});

		const actorInputs = tracing?.actorRun.inputs as Record<string, unknown>;
		expect(actorInputs.model).toBe('anthropic/claude-sonnet-4-6');
		expect(actorInputs.system_prompt).toBe('system prompt');
		expect(actorInputs.loaded_tool_count).toBe(1);
	});

	it('redacts model secrets from agent trace inputs', () => {
		const inputs = buildAgentTraceInputs({
			systemPrompt: 'You are a helpful agent.',
			modelId: {
				id: 'openai-compat/gpt-4o',
				url: 'https://custom.endpoint/v1',
				apiKey: 'sk-super-secret-key',
			},
			tools: {} as never,
		});

		expect(inputs.model).toBe('openai-compat/gpt-4o');
		expect(JSON.stringify(inputs)).not.toContain('sk-super-secret-key');
		expect(JSON.stringify(inputs)).not.toContain('custom.endpoint');
	});

	it('redacts model secrets from trace metadata', async () => {
		const tracing = await createInstanceAiTraceContext({
			threadId: 'thread-1',
			messageId: 'message-1',
			runId: 'run-1',
			userId: 'user-1',
			modelId: {
				id: 'anthropic/claude-sonnet-4-6',
				url: 'https://api.anthropic.com/v1/messages',
				apiKey: 'sk-ant-secret',
			},
			input: { message: 'What workflows do I have?' },
		});

		expect(tracing?.messageRun.metadata).toEqual(
			expect.objectContaining({
				model_id: 'anthropic/claude-sonnet-4-6',
			}),
		);
		expect(JSON.stringify(tracing?.messageRun.metadata)).not.toContain('sk-ant-secret');
		expect(JSON.stringify(tracing?.orchestratorRun.metadata)).not.toContain('apiKey');

		await tracing?.finishRun(tracing.orchestratorRun, {
			outputs: { result: 'done' },
			metadata: {
				model_id: {
					id: 'anthropic/claude-sonnet-4-6',
					url: 'https://api.anthropic.com/v1/messages',
					apiKey: 'sk-ant-secret',
				},
			},
		});

		expect(tracing?.orchestratorRun.metadata).toEqual(
			expect.objectContaining({
				model_id: 'anthropic/claude-sonnet-4-6',
			}),
		);
		expect(JSON.stringify(tracing?.orchestratorRun.metadata)).not.toContain('sk-ant-secret');
	});

	it('traces suspendable tools and HITL suspension spans', async () => {
		const tracing = await createInstanceAiTraceContext({
			threadId: 'thread-1',
			messageId: 'message-1',
			runId: 'run-1',
			userId: 'user-1',
			input: { message: 'Ask me a question' },
		});

		expect(tracing).toBeDefined();

		const wrappedTools = tracing!.wrapTools(
			{ 'ask-user': createAskUserTool() },
			{ agentRole: 'orchestrator', tags: ['orchestrator'] },
		);
		const wrappedAskUser = wrappedTools['ask-user'];
		expect(wrappedAskUser).toBeDefined();
		if (!isExecutableTool(wrappedAskUser)) {
			throw new Error('Wrapped ask-user tool is not executable');
		}

		await tracing!.withRunTree(tracing!.orchestratorRun, async () => {
			await wrappedAskUser.handler(
				{
					questions: [{ id: 'q1', question: 'What do you want?', type: 'text' }],
				},
				{
					toolCallId: 'toolu-ask',
					resumeData: undefined,
					suspend: async () => {
						await Promise.resolve();
						return undefined as never;
					},
				},
			);
		});

		const spans = agentsMock.getSpans();
		const spanNames = spans.map((span) => span.name);
		expect(spanNames).toContain('instance-ai.hitl.suspend');
		expect(
			spans.find((span) => span.name === 'instance-ai.hitl.suspend')?.attributes.tool_call_id,
		).toBe('toolu-ask');
		expect(spanNames.some((name) => name.startsWith('instance-ai.tool.'))).toBe(false);
	});

	it('does not wrap local tools for duplicate product-level LangSmith spans', async () => {
		const tracing = await createInstanceAiTraceContext({
			threadId: 'thread-1',
			messageId: 'message-1',
			runId: 'run-1',
			userId: 'user-1',
			input: { message: 'Find a template' },
		});

		expect(tracing).toBeDefined();

		const regularTool = {
			name: 'templates',
			description: 'Search templates',
			handler: jest.fn(),
		};
		const workspaceTool = {
			name: 'workspace_execute_command',
			description: 'Run a workspace command',
			handler: jest.fn(),
		};

		const wrappedTools = tracing!.wrapTools({
			templates: regularTool as never,
			workspace_execute_command: workspaceTool as never,
		});

		expect(wrappedTools.templates).toBe(regularTool);
		expect(wrappedTools.workspace_execute_command).toBe(workspaceTool);
	});

	it('keeps ad-hoc child spans rooted under the active sub-agent run', async () => {
		const tracing = await createInstanceAiTraceContext({
			threadId: 'thread-1',
			messageId: 'message-1',
			runId: 'run-1',
			userId: 'user-1',
			input: { message: 'Build a workflow' },
		});

		expect(tracing).toBeDefined();

		const subAgentRun = await tracing!.startChildRun(tracing!.orchestratorRun, {
			name: 'instance-ai.subagent.workflow-builder.stream',
			tags: ['sub-agent'],
			metadata: { agent_role: 'workflow-builder' },
			inputs: { task: 'Build a workflow' },
		});

		await tracing!.withRunTree(subAgentRun, async () => {
			await withCurrentTraceSpan(
				{
					name: 'llm:anthropic/claude-sonnet-4-6',
					runType: 'llm',
				},
				async () => {
					await Promise.resolve();
					return 'done';
				},
			);
		});

		const llmSpan = agentsMock
			.getSpans()
			.find((span) => span.name === 'llm:anthropic/claude-sonnet-4-6');
		expect(llmSpan?.parentSpanId).toBe(subAgentRun.otelSpanId);
	});

	it('traces resumed suspendable tools without extra HITL child span spam', async () => {
		const tracing = await createInstanceAiTraceContext({
			threadId: 'thread-1',
			messageId: 'message-1',
			runId: 'run-1',
			userId: 'user-1',
			input: { message: 'Resume question flow' },
		});

		expect(tracing).toBeDefined();

		const wrappedTools = tracing!.wrapTools(
			{ 'ask-user': createAskUserTool() },
			{ agentRole: 'orchestrator', tags: ['orchestrator'] },
		);
		const wrappedAskUser = wrappedTools['ask-user'];
		expect(wrappedAskUser).toBeDefined();
		if (!isExecutableTool(wrappedAskUser)) {
			throw new Error('Wrapped ask-user tool is not executable');
		}

		const result = await tracing!.withRunTree(tracing!.orchestratorRun, async () => {
			return await executeTool(
				wrappedAskUser,
				{
					questions: [{ id: 'q1', question: 'What do you want?', type: 'text' }],
				},
				{
					agent: {
						resumeData: {
							approved: true,
							answers: [
								{
									questionId: 'q1',
									selectedOptions: [],
									customText: 'Need Slack notifications',
								},
							],
						},
						suspend: async () => {
							await Promise.resolve();
							return undefined;
						},
					},
				},
			);
		});

		expect(result).toEqual({
			answered: true,
			answers: [
				{
					questionId: 'q1',
					question: 'What do you want?',
					selectedOptions: [],
					customText: 'Need Slack notifications',
				},
			],
		});

		const spanNames = agentsMock.getSpans().map((span) => span.name);
		expect(spanNames).toContain('instance-ai.hitl.resume');
		expect(spanNames).not.toContain('instance-ai.hitl.suspend');
		expect(spanNames.some((name) => name.startsWith('instance-ai.tool.'))).toBe(false);
	});

	it('creates ad-hoc child spans under the current run tree', async () => {
		const tracing = await createInstanceAiTraceContext({
			threadId: 'thread-1',
			messageId: 'message-1',
			runId: 'run-1',
			userId: 'user-1',
			input: { message: 'hello' },
		});

		await tracing!.withRunTree(tracing!.orchestratorRun, async () => {
			const result = await withCurrentTraceSpan(
				{
					name: 'prepare_context',
					tags: ['memory'],
					inputs: { thread_id: 'thread-1' },
					processOutputs: (value: number) => ({ value }),
				},
				async () => await Promise.resolve(42),
			);

			expect(result).toBe(42);
		});

		const spanNames = agentsMock.getSpans().map((span) => span.name);
		expect(spanNames).toContain('prepare_context');
	});

	it('creates trace context when proxyConfig is provided even without env vars', async () => {
		delete process.env.LANGSMITH_API_KEY;
		delete process.env.LANGCHAIN_API_KEY;
		delete process.env.LANGSMITH_ENDPOINT;
		delete process.env.LANGCHAIN_ENDPOINT;
		delete process.env.LANGSMITH_TRACING;
		delete process.env.LANGCHAIN_TRACING_V2;

		const tracing = await createInstanceAiTraceContext({
			threadId: 'thread-proxy',
			messageId: 'message-proxy',
			runId: 'run-proxy',
			userId: 'user-proxy',
			input: { message: 'proxy test' },
			proxyConfig: {
				apiUrl: 'https://proxy.example.com/langsmith',
				// eslint-disable-next-line @typescript-eslint/require-await
				getAuthHeaders: async () => ({ Authorization: 'Bearer proxy-token' }),
			},
		});

		expect(tracing).toBeDefined();
		expect(tracing?.messageRun).toBeDefined();
		expect(tracing?.orchestratorRun).toBeDefined();
	});

	it('creates OTel product spans when proxyConfig is provided', async () => {
		const tracing = await createInstanceAiTraceContext({
			threadId: 'thread-client',
			messageId: 'message-client',
			runId: 'run-client',
			userId: 'user-client',
			input: { message: 'client test' },
			proxyConfig: {
				apiUrl: 'https://proxy.example.com/langsmith',
				// eslint-disable-next-line @typescript-eslint/require-await
				getAuthHeaders: async () => ({ Authorization: 'Bearer proxy-token' }),
			},
		});

		expect(tracing).toBeDefined();

		const rootSpan = agentsMock.getSpans().find((span) => span.name === 'instance-ai.message_turn');
		expect(rootSpan).toBeDefined();
		expect(langsmithMock.getCreatedRunTrees()).toHaveLength(0);
	});

	it('does not create RunTree spans without proxyConfig', async () => {
		// Regression: normal tracing must not mix RunTree product spans with OTel
		// native spans, because LangSmith treats those ingestion paths as separate
		// trace hierarchies.
		await createInstanceAiTraceContext({
			threadId: 'thread-no-proxy',
			messageId: 'message-no-proxy',
			runId: 'run-no-proxy',
			userId: 'user-no-proxy',
			input: { message: 'no proxy test' },
		});

		const rootSpan = agentsMock.getSpans().find((span) => span.name === 'instance-ai.message_turn');
		expect(rootSpan).toBeDefined();
		expect(langsmithMock.getCreatedRunTrees()).toHaveLength(0);
	});

	it('keeps product, native provider, and local tool spans in one foreground OTel trace', async () => {
		const tracing = await createInstanceAiTraceContext({
			threadId: 'thread-local-exporter',
			messageId: 'message-local-exporter',
			runId: 'run-local-exporter',
			userId: 'user-local-exporter',
			input: { message: 'Build a workflow' },
		});

		expect(tracing).toBeDefined();

		const wrappedTools = tracing!.wrapTools(
			{
				workspace_write_file: {
					name: 'workspace_write_file',
					description: 'Write a file in the workspace.',
					handler: jest.fn(async () => await Promise.resolve({ written: true })),
				} as never,
			},
			{ agentRole: 'workflow-builder' },
		);
		const workspaceWriteFile = wrappedTools.workspace_write_file;
		if (!isExecutableTool(workspaceWriteFile)) {
			throw new Error('Wrapped workspace_write_file tool is not executable');
		}

		await tracing!.withRunTree(tracing!.orchestratorRun, async () => {
			const telemetryOrBuilder = tracing!.getTelemetry!({
				agentRole: 'orchestrator',
				functionId: 'instance-ai.orchestrator',
			});
			if ('build' in telemetryOrBuilder) {
				throw new Error('Expected foreground tracing to reuse built OTel telemetry');
			}

			type NativeSpan = {
				end(): void;
				spanContext(): { traceId: string; spanId: string };
			};
			type NativeTracer = {
				startSpan(name: string, options?: { attributes?: Record<string, unknown> }): NativeSpan;
				startActiveSpan<T>(
					name: string,
					options: { attributes?: Record<string, unknown> },
					fn: (span: NativeSpan) => Promise<T>,
				): Promise<T>;
			};
			const tracer = telemetryOrBuilder.tracer as NativeTracer;

			const providerSpan = tracer.startSpan('ai.streamText.doStream', {
				attributes: {
					'ai.operationId': 'ai.streamText.doStream',
					'langsmith.span.kind': 'llm',
				},
			});
			providerSpan.end();

			await tracer.startActiveSpan(
				'ai.toolCall',
				{
					attributes: {
						'ai.operationId': 'ai.toolCall',
						'langsmith.span.kind': 'tool',
						'ai.toolCall.name': 'workspace_write_file',
						'ai.toolCall.id': 'toolu-write-file',
					},
				},
				async (span) => {
					await workspaceWriteFile.handler(
						{ path: 'workflow.json', content: '{}' },
						{ toolCallId: 'toolu-write-file' },
					);
					span.end();
				},
			);
		});

		await tracing!.finishRun(tracing!.orchestratorRun, { outputs: { status: 'done' } });
		await tracing!.finishRun(tracing!.rootRun, { outputs: { status: 'done' } });

		const spans = agentsMock.getSpans();
		const rootSpan = spans.find((span) => span.name === 'instance-ai.message_turn');
		const orchestratorSpan = spans.find((span) => span.name === 'instance-ai.orchestrator.stream');
		const providerSpan = spans.find((span) => span.name === 'ai.streamText.doStream');
		const localToolSpan = spans.find((span) => span.name === 'ai.toolCall');

		expect(rootSpan).toBeDefined();
		expect(orchestratorSpan).toBeDefined();
		expect(providerSpan).toBeDefined();
		expect(localToolSpan).toBeDefined();
		expect(
			new Set(
				[rootSpan, orchestratorSpan, providerSpan, localToolSpan].map((span) => span?.traceId),
			),
		).toEqual(new Set([rootSpan?.traceId]));
		expect(orchestratorSpan?.parentSpanId).toBe(rootSpan?.id);
		expect(providerSpan?.parentSpanId).toBe(orchestratorSpan?.id);
		expect(localToolSpan?.parentSpanId).toBe(orchestratorSpan?.id);
		expect(localToolSpan?.attributes['ai.toolCall.id']).toBe('toolu-write-file');
		expect(localToolSpan?.attributes['ai.toolCall.name']).toBe('workspace_write_file');
		expect(spans.some((span) => span.name.startsWith('instance-ai.tool.'))).toBe(false);
		expect(langsmithMock.getCreatedRunTrees()).toHaveLength(0);
	});

	it('returns undefined when tracing is explicitly disabled even with proxy', async () => {
		process.env.LANGCHAIN_TRACING_V2 = 'false';

		const tracing = await createInstanceAiTraceContext({
			threadId: 'thread-disabled',
			messageId: 'message-disabled',
			runId: 'run-disabled',
			userId: 'user-disabled',
			input: { message: 'disabled test' },
			proxyConfig: {
				apiUrl: 'https://proxy.example.com/langsmith',
				// eslint-disable-next-line @typescript-eslint/require-await
				getAuthHeaders: async () => ({ Authorization: 'Bearer proxy-token' }),
			},
		});

		expect(tracing).toBeUndefined();
	});
});

describe('submitLangsmithUserFeedback', () => {
	const originalLangSmithApiKey = process.env.LANGSMITH_API_KEY;
	const originalLangSmithTracing = process.env.LANGSMITH_TRACING;
	const originalLangChainTracingV2 = process.env.LANGCHAIN_TRACING_V2;

	beforeEach(() => {
		langsmithMock.reset();
		agentsMock.reset();
		process.env.LANGSMITH_API_KEY = 'test-key';
		delete process.env.LANGSMITH_TRACING;
		delete process.env.LANGCHAIN_TRACING_V2;
	});

	afterAll(() => {
		process.env.LANGSMITH_API_KEY = originalLangSmithApiKey;
		if (originalLangSmithTracing === undefined) {
			delete process.env.LANGSMITH_TRACING;
		} else {
			process.env.LANGSMITH_TRACING = originalLangSmithTracing;
		}
		if (originalLangChainTracingV2 === undefined) {
			delete process.env.LANGCHAIN_TRACING_V2;
		} else {
			process.env.LANGCHAIN_TRACING_V2 = originalLangChainTracingV2;
		}
	});

	it('calls Client.createFeedback with the full payload', async () => {
		const submitted = await submitLangsmithUserFeedback({
			langsmithRunId: 'ls-run-1',
			langsmithTraceId: 'ls-trace-1',
			key: 'user_score',
			score: 1,
			value: 'up',
			comment: 'nice',
			feedbackId: 'fb-1',
			sourceInfo: { thread_id: 'thread-1' },
		});

		expect(submitted).toBe(true);
		const calls = langsmithMock.getCreateFeedbackCalls();
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({
			runId: 'ls-run-1',
			key: 'user_score',
			options: {
				score: 1,
				value: 'up',
				comment: 'nice',
				feedbackId: 'fb-1',
				sourceInfo: { thread_id: 'thread-1' },
				feedbackSourceType: 'api',
			},
		});
	});

	it('returns false and does not hit the network when tracing is disabled', async () => {
		delete process.env.LANGSMITH_API_KEY;
		process.env.LANGCHAIN_TRACING_V2 = 'false';

		const submitted = await submitLangsmithUserFeedback({
			langsmithRunId: 'ls-run-2',
			langsmithTraceId: 'ls-trace-2',
			key: 'user_score',
			score: 0,
		});

		expect(submitted).toBe(false);
		expect(langsmithMock.getCreateFeedbackCalls()).toHaveLength(0);
	});

	it('routes through the proxy client when proxyConfig is provided', async () => {
		const getAuthHeaders = jest.fn().mockResolvedValue({ Authorization: 'Bearer token' });
		await submitLangsmithUserFeedback({
			langsmithRunId: 'ls-run-3',
			langsmithTraceId: 'ls-trace-3',
			key: 'user_score',
			score: 1,
			proxyConfig: {
				apiUrl: 'https://proxy.example.com/langsmith',
				getAuthHeaders,
			},
		});

		const calls = langsmithMock.getCreateFeedbackCalls();
		expect(calls).toHaveLength(1);
		expect(calls[0].clientApiUrl).toBe('https://proxy.example.com/langsmith');
		expect(getAuthHeaders).toHaveBeenCalled();
	});
});
