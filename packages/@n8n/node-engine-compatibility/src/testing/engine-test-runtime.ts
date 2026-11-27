import type {
	EngineLogger,
	EngineRuntime,
	ExecutionSnapshot,
	StartExecutionRequest,
	StartExecutionResult,
	StepDetail,
} from '@n8n/engine';
import {
	AllowAllAdmittance,
	createDataSource,
	createEngineRuntime,
	createInMemoryWorkQueues,
	mintIdentityToken,
	noopExecutionResponseSender,
	SharedSecretIdentityVerifier,
} from '@n8n/engine';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { v7 as uuidv7 } from 'uuid';

import { createEngineStepDataLoader } from '../engine-step-data-loader';
import type { SubWorkflowResolver, V1StepExecutorDeps } from '../types';
import { V1StepExecutor } from '../v1-step-executor';

const AUTH_SECRET = 'a'.repeat(32);
const CALLER = { cpId: 'cp-test', tenantId: 'tenant-test' };

type EngineDataSource = ReturnType<typeof createDataSource>;

export interface EngineTestRuntimeOptions {
	nodeTypes: V1StepExecutorDeps['nodeTypes'];
	additionalDataFactory: V1StepExecutorDeps['additionalDataFactory'];
	/** Defaults to the console. */
	logger?: EngineLogger;
}

export type TestExecutionRequest = Omit<StartExecutionRequest, 'executionId' | 'workflow'> & {
	workflow?: StartExecutionRequest['workflow'];
	/** Resolves the sub-workflows that this execution calls, as the control plane would. */
	resolveSubWorkflow?: SubWorkflowResolver;
};

export type TestExecutionStart =
	| { started: true; executionId: string }
	| { started: false; status: number; body: unknown };

export class ExecutionStalledError extends Error {
	constructor(
		readonly executionId: string,
		readonly steps: StepDetail[],
	) {
		const states = steps.map(({ nodeId, status, error }) =>
			[nodeId, status, error?.message].filter(Boolean).join(':'),
		);
		super(`Execution ${executionId} did not finish. Steps: ${states.join(', ')}`);
	}
}

const noSubWorkflows: SubWorkflowResolver = async () =>
	await Promise.reject(new Error('This execution resolves no sub-workflows'));

/**
 * Engine v2 with the v1 step executor, for tests: one runtime on a migrated
 * Postgres database, reused for all executions. Tests reach it over HTTP,
 * because the API is the only boundary of the engine. Run one execution at a
 * time: sub-workflows resolve with the resolver of the last started execution.
 */
export class EngineTestRuntime {
	private db?: EngineDataSource;

	private runtime?: EngineRuntime;

	private server?: Server;

	/** The API listens on 127.0.0.1 only, so no other local service can take the requests. */
	private baseUrl = '';

	private readonly finished = new Set<string>();

	private readonly waiters = new Map<string, () => void>();

	private resolveSubWorkflow: SubWorkflowResolver = noSubWorkflows;

	constructor(private readonly options: EngineTestRuntimeOptions) {}

	/** The engine database, to read the rows that the API does not show. */
	get dataSource(): EngineDataSource {
		if (!this.db) throw new Error('Start the engine test runtime first');
		return this.db;
	}

	async start(postgresConnectionUri: string): Promise<void> {
		try {
			await this.startRuntime(postgresConnectionUri);
		} catch (error) {
			// A failed start must not leave the pool or the server open.
			await this.stop();
			throw error;
		}
	}

	private async startRuntime(postgresConnectionUri: string): Promise<void> {
		const dataSource = createDataSource(postgresConnectionUri);
		this.db = dataSource;
		await dataSource.initialize();
		await dataSource.runMigrations();

		this.runtime = createEngineRuntime({
			dataSource,
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(AUTH_SECRET),
			responseSender: noopExecutionResponseSender,
			queues: createInMemoryWorkQueues(),
			logger: this.options.logger,
			externalDependencies: ({ executionStore, stepStore }) => {
				const finishExecution = executionStore.finishExecution.bind(executionStore);
				executionStore.finishExecution = async (id, status) => {
					const recorded = await finishExecution(id, status);
					if (recorded) this.markFinished(id);
					return recorded;
				};
				// A failed parent cancels its live sub-executions, so a cancel is an end too.
				const cancelExecution = executionStore.cancelExecution.bind(executionStore);
				executionStore.cancelExecution = async (id) => {
					const recorded = await cancelExecution(id);
					if (recorded) this.markFinished(id);
					return recorded;
				};
				return {
					v1StepExecutor: new V1StepExecutor({
						nodeTypes: this.options.nodeTypes,
						additionalDataFactory: this.options.additionalDataFactory,
						loadStepData: createEngineStepDataLoader(executionStore, stepStore),
						resolveSubWorkflow: async (request) => await this.resolveSubWorkflow(request),
					}),
				};
			},
		});
		this.runtime.start();

		const server = createServer(this.runtime.app);
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		this.server = server;
		const address = server.address();
		if (address === null || typeof address === 'string') {
			throw new Error('The engine API has no port');
		}
		this.baseUrl = `http://127.0.0.1:${address.port}`;
	}

	async stop(): Promise<void> {
		await new Promise<void>((resolve) =>
			this.server ? this.server.close(() => resolve()) : resolve(),
		);
		await this.runtime?.stop();
		if (this.db?.isInitialized) await this.db.destroy();
	}

	/** Starts an execution. A refusal is a result, not an error: the parity tests record it. */
	async startExecution({
		resolveSubWorkflow = noSubWorkflows,
		workflow = {},
		...request
	}: TestExecutionRequest): Promise<TestExecutionStart> {
		this.resolveSubWorkflow = resolveSubWorkflow;
		// The caller mints the execution ID. The engine never mints one.
		const body: StartExecutionRequest = { ...request, workflow, executionId: uuidv7() };
		const response = await this.request('POST', '/api/workflow-executions', body);
		const responseBody: unknown = await response.json();
		if (response.status !== 201) {
			return { started: false, status: response.status, body: responseBody };
		}
		const { executionId } = responseBody as StartExecutionResult;
		return { started: true, executionId };
	}

	/**
	 * Waits until the engine records the outcome of the execution. It also
	 * returns at once for an execution that finished before the call.
	 */
	async waitForFinish(executionId: string, timeoutMs = 10_000): Promise<void> {
		let timer: NodeJS.Timeout | undefined;
		const finished = await Promise.race([
			new Promise<boolean>((resolve) => {
				if (this.finished.delete(executionId)) return resolve(true);
				this.waiters.set(executionId, () => resolve(true));
			}),
			new Promise<boolean>((resolve) => {
				timer = setTimeout(() => resolve(false), timeoutMs);
				timer.unref();
			}),
		]);
		clearTimeout(timer);
		if (finished) return;

		this.waiters.delete(executionId);
		// The steps tell where the execution stalled.
		const { steps = [] } = await this.getExecution(executionId);
		throw new ExecutionStalledError(executionId, steps);
	}

	/**
	 * Cancels an execution, so it does not run on beside the next one. An
	 * execution that ended before the cancel is not an error.
	 */
	async cancelExecution(executionId: string): Promise<void> {
		const response = await this.request('POST', `/api/workflow-executions/${executionId}/cancel`);
		if (response.status !== 200 && response.status !== 409) {
			throw new Error(`Cannot cancel execution ${executionId}: ${response.status}`);
		}
		// Nobody waits for this execution any more.
		this.finished.delete(executionId);
	}

	async getExecution(executionId: string): Promise<ExecutionSnapshot> {
		const response = await this.request(
			'GET',
			`/api/workflow-executions/${executionId}?includeSteps=true`,
		);
		if (response.status !== 200) {
			throw new Error(`Cannot read execution ${executionId}: ${response.status}`);
		}
		return (await response.json()) as ExecutionSnapshot;
	}

	private async request(method: 'GET' | 'POST', path: string, body?: unknown): Promise<Response> {
		if (!this.baseUrl) throw new Error('Start the engine test runtime first');
		return await fetch(`${this.baseUrl}${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${mintIdentityToken(AUTH_SECRET, CALLER)}`,
				'Content-Type': 'application/json',
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		});
	}

	private markFinished(executionId: string): void {
		const waiter = this.waiters.get(executionId);
		if (waiter) {
			this.waiters.delete(executionId);
			waiter();
		} else {
			// A sub-execution, or an execution that finished before the test waits for it.
			this.finished.add(executionId);
		}
	}
}
