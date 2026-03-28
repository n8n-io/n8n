jest.mock('langsmith', () => {
	let runCounter = 0;
	const createdRunTrees: Array<{
		id: string;
		dotted_order: string;
		name: string;
		run_type: string;
		parent_run_id?: string;
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

			createdRunTrees.push({
				id: this.id,
				dotted_order: this.dotted_order,
				name: this.name,
				run_type: this.run_type,
				...(this.parent_run_id ? { parent_run_id: this.parent_run_id } : {}),
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

	return {
		RunTree: MockRunTree,
		__mock: {
			reset: () => {
				runCounter = 0;
				createdRunTrees.length = 0;
			},
			getCreatedRunTrees: () => createdRunTrees,
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
		}>;
	};
};

interface ExecutableTool {
	execute: (input: unknown, context: unknown) => Promise<unknown>;
}

function isExecutableTool(value: unknown): value is ExecutableTool {
	return (
		typeof value === 'object' &&
		value !== null &&
		'execute' in value &&
		typeof value.execute === 'function'
	);
}

const {
	createDetachedSubAgentTraceContext,
	createInstanceAiTraceContext,
	continueInstanceAiTraceContext,
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

describe('createInstanceAiTraceContext', () => {
	const originalLangSmithApiKey = process.env.LANGSMITH_API_KEY;
	const originalLangSmithTracing = process.env.LANGSMITH_TRACING;
	const originalLangChainTracingV2 = process.env.LANGCHAIN_TRACING_V2;

	beforeEach(() => {
		langsmithMock.reset();
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

	it('rehydrates child runs with their parent linkage before patching', async () => {
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

		const patchTarget = langsmithMock.getCreatedRunTrees().at(-1);
		expect(patchTarget?.id).toBe(tracing?.orchestratorRun.id);
		expect(patchTarget?.parent_run_id).toBe(tracing?.messageRun.id);
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
			spawnedByRunId: 'run-parent-1',
			spawnedByAgentId: 'agent-001',
			input: { task: 'Build a workflow' },
		});

		expect(tracing).toBeDefined();
		expect(tracing?.traceKind).toBe('detached_subagent');
		expect(tracing?.rootRun.id).toBe(tracing?.actorRun.id);
		expect(tracing?.rootRun.parentRunId).toBeUndefined();
		expect(tracing?.rootRun.name).toBe('subagent:workflow-builder');
		expect(tracing?.rootRun.metadata).toEqual(
			expect.objectContaining({
				thread_id: 'thread-1',
				message_group_id: 'group-1',
				task_id: 'build-1',
				task_kind: 'builder',
				agent_id: 'agent-builder-1',
				spawned_by_trace_id: 'trace-parent-1',
				spawned_by_run_id: 'run-parent-1',
				spawned_by_agent_id: 'agent-001',
			}),
		);
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
			await wrappedAskUser.execute(
				{
					questions: [{ id: 'q1', question: 'What do you want?', type: 'text' }],
				},
				{
					agent: {
						suspend: async () => {
							await Promise.resolve();
							return undefined;
						},
					},
				},
			);
		});

		const createdRunNames = langsmithMock.getCreatedRunTrees().map((run) => run.name);
		expect(createdRunNames).toContain('tool:ask-user');
		expect(createdRunNames).toContain('hitl:suspend');
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
			name: 'subagent:workflow-builder',
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

		const llmRun = langsmithMock
			.getCreatedRunTrees()
			.find((run) => run.name === 'llm:anthropic/claude-sonnet-4-6');
		expect(llmRun?.parent_run_id).toBe(subAgentRun.id);
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
			return await wrappedAskUser.execute(
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

		const createdRunNames = langsmithMock.getCreatedRunTrees().map((run) => run.name);
		expect(createdRunNames).toContain('tool:ask-user:resume');
		expect(createdRunNames).not.toContain('hitl:resume');
		expect(createdRunNames).not.toContain('hitl:approval');
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

		const createdRunNames = langsmithMock.getCreatedRunTrees().map((run) => run.name);
		expect(createdRunNames).toContain('prepare_context');
	});
});
