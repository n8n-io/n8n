jest.mock('langsmith', () => {
	let runCounter = 0;
	const createdRunTrees: Array<{
		id: string;
		dotted_order: string;
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
			this.execution_order = config.execution_order ?? 1;
			this.child_execution_order = config.child_execution_order ?? this.execution_order;
			this.trace_id = config.trace_id ?? this.parent_run?.trace_id ?? this.id;
			this.dotted_order =
				config.dotted_order ??
				(this.parent_run ? `${this.parent_run.dotted_order}.${this.id}` : this.id);

			createdRunTrees.push({
				id: this.id,
				dotted_order: this.dotted_order,
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

jest.mock('langsmith/traceable', () => ({
	traceable: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
	withRunTree: async <T>(_: unknown, fn: () => Promise<T>): Promise<T> => await fn(),
}));

type LangSmithMockModule = {
	__mock: {
		reset: () => void;
		getCreatedRunTrees: () => Array<{
			id: string;
			dotted_order: string;
			parent_run_id?: string;
		}>;
	};
};

const { createInstanceAiTraceContext, continueInstanceAiTraceContext } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../langsmith-tracing') as typeof import('../langsmith-tracing');
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
});
