import { randomUUID } from 'node:crypto';
import { Module, createRequire } from 'node:module';

import type { DataSource } from '@n8n/typeorm';

import { WorkflowGraph } from '../graph/workflow-graph';
import type { WorkflowGraphData } from '../graph/graph.types';
import type { ExecutionContext, WebhookResponse, TriggerWorkflowConfig } from '../sdk/types';
import { StepStatus } from '../database/enums';
import type { WorkflowEntity } from '../database/entities/workflow.entity';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../database/entities/workflow-step-execution.entity';
import { StepTimeoutError } from './errors/step-timeout.error';
import { StepFunctionNotFoundError } from './errors/infrastructure.error';
import { buildErrorData, classifyError, calculateBackoff } from './errors/error-classifier';
import type { ErrorData } from './errors/error-classifier';
import type { EngineEventBus } from './event-bus.service';
import type { WorkflowTriggerService } from './workflow-trigger.service';
import type { BatchExecutorService } from './batch-executor.service';
import type { MetricsService } from './metrics.service';
import type { AgentBridgeService, AgentInvocation } from './agent-bridge.service';

type StepFunction = (ctx: ExecutionContext) => Promise<unknown>;

/** Fields that can be updated on a step execution during processing. */
interface StepUpdate {
	status?: string;
	output?: unknown;
	error?: unknown;
	attempt?: number;
	retryAfter?: Date | null;
	completedAt?: Date | null;
	durationMs?: number | null;
	approvalToken?: string;
}

/**
 * Processes individual step executions. Handles:
 * - Loading and caching compiled workflow modules
 * - Building execution contexts for step functions
 * - Running step functions with timeout enforcement
 * - Error classification and retry logic
 * - Sleep/wait via first-class sleep graph nodes
 */
/** Maximum number of compiled modules to keep in cache. */
const MODULE_CACHE_MAX_SIZE = 100;

export class StepProcessorService {
	/**
	 * LRU cache for compiled modules: key = 'workflowId:version'.
	 * Uses a Map whose insertion order tracks recency -- on access,
	 * entries are deleted and re-inserted to move them to the end.
	 * When the cache exceeds MODULE_CACHE_MAX_SIZE, the oldest
	 * (least-recently-used) entry is evicted.
	 */
	private moduleCache = new Map<string, Record<string, unknown>>();

	constructor(
		private readonly dataSource: DataSource,
		private readonly eventBus: EngineEventBus,
		private readonly workflowTrigger?: WorkflowTriggerService,
		private readonly batchExecutor?: BatchExecutorService,
		private readonly metrics?: MetricsService,
		private readonly agentBridge?: AgentBridgeService,
	) {}

	async processStep(stepJob: WorkflowStepExecution): Promise<void> {
		// OUTER try/catch: if ANYTHING fails (loading workflow, parsing graph, etc.),
		// mark the step as failed so it doesn't get stuck in 'running' forever.
		try {
			// 1. Load execution record
			const execution = await this.dataSource
				.getRepository(WorkflowExecution)
				.createQueryBuilder('we')
				.where('we.id = :id', { id: stepJob.executionId })
				.getOneOrFail();

			// 2. Check cancel_requested -> mark cancelled, return
			if (execution.cancelRequested) {
				await this.updateStepAndEmit(stepJob, execution, {
					status: StepStatus.Cancelled,
					completedAt: new Date(),
				});
				return;
			}

			// 3. Fetch workflow at pinned version for step config + compiled code
			const workflow = (await this.dataSource
				.getRepository('WorkflowEntity')
				.createQueryBuilder('w')
				.where('w.id = :id AND w.version = :version', {
					id: execution.workflowId,
					version: execution.workflowVersion,
				})
				.getOneOrFail()) as WorkflowEntity;

			// 4. Build WorkflowGraph
			const graph = new WorkflowGraph(workflow.graph as WorkflowGraphData);

			// 5. Get step config from graph (handle batch child steps via metadata)
			const node = graph.getNode(stepJob.stepId);
			const stepConfig = node?.config ?? {};

			// 5b. Handle sleep steps: no function to execute
			if (node?.type === 'sleep') {
				this.eventBus.emit({
					type: 'step:started',
					executionId: execution.id,
					stepId: stepJob.stepId,
					attempt: stepJob.attempt,
				});

				// If waitUntil is set and has passed, the timer has fired — complete the step.
				// Otherwise, this is the first time we're processing it — set the timer.
				if (stepJob.waitUntil && stepJob.waitUntil <= new Date()) {
					await this.updateStepAndEmit(stepJob, execution, {
						status: StepStatus.Completed,
						output: stepJob.input,
						completedAt: new Date(),
						durationMs: stepConfig.sleepMs ?? null,
					});
				} else {
					// Compute the wake-up time from either sleepMs or waitUntilExpr
					let waitUntil: Date;
					if (stepConfig.sleepMs != null) {
						waitUntil = new Date(Date.now() + stepConfig.sleepMs);
					} else if (stepConfig.waitUntilExpr) {
						// eslint-disable-next-line @typescript-eslint/no-implied-eval
						const evalResult = new Function(`return (${stepConfig.waitUntilExpr})`)();
						waitUntil = evalResult instanceof Date ? evalResult : new Date(evalResult);
					} else {
						// No duration or expression — complete immediately
						await this.updateStepAndEmit(stepJob, execution, {
							status: StepStatus.Completed,
							output: stepJob.input,
							completedAt: new Date(),
							durationMs: 0,
						});
						return;
					}

					await this.dataSource
						.getRepository(WorkflowStepExecution)
						.createQueryBuilder()
						.update(WorkflowStepExecution)
						.set({ status: StepStatus.Waiting, waitUntil })
						.where('id = :id', { id: stepJob.id })
						.execute();

					this.eventBus.emit({
						type: 'step:waiting',
						executionId: execution.id,
						stepId: stepJob.stepId,
					});
				}
				return;
			}

			// 5b2. Handle approval steps: execute function, then pause for human approval
			if (node?.type === 'approval') {
				this.eventBus.emit({
					type: 'step:started',
					executionId: execution.id,
					stepId: stepJob.stepId,
					attempt: stepJob.attempt,
				});

				// Load and execute the step function to get approval context
				const stepFn = this.loadStepFunction(
					execution.workflowId,
					execution.workflowVersion,
					workflow.compiledCode,
					graph,
					stepJob.stepId,
					stepJob.metadata,
				);
				const ctx = this.buildStepContext(stepJob, execution);
				const approvalContext = await stepFn(ctx);

				// Generate approval token and transition to waiting_approval
				const approvalToken = randomUUID();
				await this.updateStepAndEmit(stepJob, execution, {
					status: StepStatus.WaitingApproval,
					output: approvalContext,
					approvalToken,
				});

				return;
			}

			// 5c. Handle batch steps: execute the step function to get items, then process batch
			if (node?.type === 'batch' && this.batchExecutor) {
				this.eventBus.emit({
					type: 'step:started',
					executionId: execution.id,
					stepId: stepJob.stepId,
					attempt: stepJob.attempt,
				});

				// Load and execute the step function to get the items array
				const stepFn = this.loadStepFunction(
					execution.workflowId,
					execution.workflowVersion,
					workflow.compiledCode,
					graph,
					stepJob.stepId,
					stepJob.metadata,
				);
				const ctx = this.buildStepContext(stepJob, execution);
				const items = (await stepFn(ctx)) as unknown[];

				// Fan out child steps -- the batch executor handles parent completion
				const onItemFailure = stepConfig.onItemFailure ?? 'continue';
				await this.batchExecutor.processBatch(stepJob, items, graph, onItemFailure);
				return;
			}

			// 5d. Handle agent steps: execute function to get agent + input, then invoke bridge
			if (node?.type === 'agent' && this.agentBridge) {
				this.eventBus.emit({
					type: 'step:started',
					executionId: execution.id,
					stepId: stepJob.stepId,
					attempt: stepJob.attempt,
				});

				// Load and execute the step function — it returns { agent, input }
				const stepFn = this.loadStepFunction(
					execution.workflowId,
					execution.workflowVersion,
					workflow.compiledCode,
					graph,
					stepJob.stepId,
					stepJob.metadata,
				);
				const ctx = this.buildStepContext(stepJob, execution);
				const { agent, input } = (await stepFn(ctx)) as {
					agent: unknown;
					input: string | unknown[];
				};

				const startTime = Date.now();
				const metadata = (stepJob.metadata ?? {}) as Record<string, unknown>;
				const timeout = stepConfig.agentConfig?.timeout ?? 600_000;

				const result = await Promise.race([
					this.agentBridge.invoke({
						executionId: execution.id,
						stepId: stepJob.stepId,
						agent: agent as AgentInvocation['agent'],
						input,
						resumeState: metadata.agentSnapshot as unknown,
						resumeData: metadata.agentResumeData as unknown,
					}),
					new Promise<never>((_, reject) =>
						setTimeout(() => reject(new StepTimeoutError(stepJob.stepId, timeout)), timeout),
					),
				]);

				if (result.status === 'suspended') {
					// Mark step as suspended, persist metadata for resume
					await this.dataSource
						.getRepository(WorkflowStepExecution)
						.createQueryBuilder()
						.update(WorkflowStepExecution)
						.set({
							status: StepStatus.Suspended,
							output: {
								suspendPayload: result.suspendPayload,
								resumeCondition: result.resumeCondition,
								usage: result.usage,
								toolCalls: result.toolCalls,
							},
							metadata: {
								...metadata,
								agentSnapshot: result.snapshot,
								agentResumeCondition: result.resumeCondition,
							},
						} as Record<string, unknown>)
						.where('id = :id', { id: stepJob.id })
						.execute();

					this.eventBus.emit({
						type: 'step:agent_suspended',
						executionId: execution.id,
						stepId: stepJob.stepId,
						suspendPayload: result.suspendPayload,
						toolName: '',
					});
				} else {
					// Agent completed — store as AgentStepResult so downstream
					// steps can access answer.output, answer.usage, etc.
					await this.updateStepAndEmit(stepJob, execution, {
						status: StepStatus.Completed,
						output: {
							status: 'completed',
							output: result.output,
							usage: result.usage,
							toolCalls: result.toolCalls,
						},
						completedAt: new Date(),
						durationMs: Date.now() - startTime,
					});
				}
				return;
			}

			// 6. Load step function from compiled code
			const stepFn = this.loadStepFunction(
				execution.workflowId,
				execution.workflowVersion,
				workflow.compiledCode,
				graph,
				stepJob.stepId,
				stepJob.metadata,
			);

			// 7. Build execution context
			const ctx = this.buildStepContext(stepJob, execution);

			// 8. Emit step:started
			this.eventBus.emit({
				type: 'step:started',
				executionId: execution.id,
				stepId: stepJob.stepId,
				attempt: stepJob.attempt,
			});

			const startTime = Date.now();

			try {
				// 9. Execute with timeout (Promise.race)
				const timeout = stepConfig.timeout ?? 300_000;
				const result = await Promise.race([
					stepFn(ctx),
					new Promise<never>((_, reject) =>
						setTimeout(() => reject(new StepTimeoutError(stepJob.stepId, timeout)), timeout),
					),
				]);

				const durationMs = Date.now() - startTime;

				// 10. On success -> updateStepAndEmit(completed)
				await this.updateStepAndEmit(stepJob, execution, {
					status: StepStatus.Completed,
					output: result,
					completedAt: new Date(),
					durationMs,
				});

				this.metrics?.stepExecutionTotal.inc({
					status: 'completed',
					step_type: node?.type ?? 'unknown',
				});
				this.metrics?.stepExecutionDuration.observe(durationMs);
			} catch (error) {
				// 11. Handle step errors (retriable or not)
				const durationMs = Date.now() - startTime;
				const errorData = buildErrorData(error, workflow.sourceMap ?? undefined);

				// Compute original source line for the error using the pre-computed
				// line map stored in workflow.sourceMap. The transpiler builds a mapping
				// from compiled code line numbers to original source line numbers.
				if (error instanceof Error && error.stack && workflow.sourceMap) {
					const originalLine = resolveOriginalLine(error.stack, workflow.sourceMap);
					if (originalLine !== undefined) {
						errorData.originalLine = originalLine;
					}
				}

				// Fallback: if no line map or no match, point to the step definition
				if (errorData.originalLine === undefined && workflow.code) {
					const stepNode = graph.getNode(stepJob.stepId);
					if (stepNode) {
						const stepName = stepNode.name;
						const patterns = [
							`name: '${stepName}'`,
							`name: "${stepName}"`,
							`ctx.step('${stepName}'`,
							`ctx.step("${stepName}"`,
							`ctx.batch('${stepName}'`,
							`ctx.batch("${stepName}"`,
						];
						let pos = -1;
						for (const pattern of patterns) {
							const idx = workflow.code.indexOf(pattern);
							if (idx >= 0) {
								pos = idx;
								break;
							}
						}
						if (pos >= 0) {
							errorData.originalLine = workflow.code.substring(0, pos).split('\n').length;
						}
					}
				}

				const maxAttempts = stepConfig.retryConfig?.maxAttempts ?? 1;
				const isRetriable = classifyError(error, stepConfig);
				const hasRetriesLeft = stepJob.attempt < maxAttempts;

				if (isRetriable && hasRetriesLeft) {
					const retryConfig = stepConfig.retryConfig ?? {
						baseDelay: 1000,
						maxDelay: 60_000,
						jitter: true,
					};
					const delay = calculateBackoff(stepJob.attempt, retryConfig);

					await this.updateStepAndEmit(stepJob, execution, {
						status: StepStatus.RetryPending,
						attempt: stepJob.attempt + 1,
						retryAfter: new Date(Date.now() + delay),
						error: errorData,
					});

					this.metrics?.stepRetriesTotal.inc();
					this.metrics?.errorsTotal.inc({ classification: 'retriable' });
				} else {
					await this.updateStepAndEmit(stepJob, execution, {
						status: StepStatus.Failed,
						error: {
							...errorData,
							timedOut: error instanceof StepTimeoutError,
						},
						completedAt: new Date(),
						durationMs,
					});

					this.metrics?.stepExecutionTotal.inc({
						status: 'failed',
						step_type: node?.type ?? 'unknown',
					});
					this.metrics?.errorsTotal.inc({ classification: 'non_retriable' });
				}
			}
		} catch (infrastructureError) {
			// Infrastructure failure: can't load workflow, can't parse graph, DB error, etc.
			// MUST emit event so checkExecutionComplete and metrics are triggered.
			const errorData = buildErrorData(infrastructureError);

			try {
				// Persist the failure directly since we may not have a full execution object
				await this.dataSource
					.getRepository(WorkflowStepExecution)
					.createQueryBuilder()
					.update(WorkflowStepExecution)
					.set({
						status: StepStatus.Failed,
						error: errorData,
						completedAt: new Date(),
					})
					.where('id = :id', { id: stepJob.id })
					.execute();

				// Emit the event manually since we may not have execution in scope
				this.eventBus.emit({
					type: 'step:failed',
					executionId: stepJob.executionId,
					stepId: stepJob.stepId,
					parentStepExecutionId: stepJob.parentStepExecutionId ?? undefined,
					error: errorData,
				});
			} catch (_doubleFailure) {
				// DB is completely unreachable. Step stays 'running'.
				// Stale recovery will pick it up after timeout + buffer.
			}
		}
	}

	loadStepFunction(
		workflowId: string,
		workflowVersion: number,
		compiledCode: string,
		graph: WorkflowGraph,
		stepId: string,
		stepMetadata?: Record<string, unknown>,
	): StepFunction {
		const cacheKey = `${workflowId}:${workflowVersion}`;

		// Check cache first -- compiled code is immutable per version
		let moduleExports = this.moduleCache.get(cacheKey);
		if (moduleExports) {
			// LRU: move to end of Map iteration order (most recently used)
			this.moduleCache.delete(cacheKey);
			this.moduleCache.set(cacheKey, moduleExports);
		} else {
			const m = new (Module as unknown as { new (id: string): NodeModule })(cacheKey);
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			m.require = createRequire(__filename);
			// Module._compile is available on Module instances
			(m as unknown as { _compile: (code: string, filename: string) => void })._compile(
				compiledCode,
				`workflow-${cacheKey}.js`,
			);
			moduleExports = m.exports as Record<string, unknown>;
			this.moduleCache.set(cacheKey, moduleExports);

			// Evict least-recently-used entries when cache exceeds size limit
			while (this.moduleCache.size > MODULE_CACHE_MAX_SIZE) {
				// Map.keys().next() returns the oldest (first-inserted) key
				const oldestKey = this.moduleCache.keys().next().value;
				if (oldestKey !== undefined) {
					this.moduleCache.delete(oldestKey);
				}
			}
		}

		// For regular steps: look up function ref from graph node
		// For batch child steps (not in graph): look up from step metadata
		const graphNode = graph.getNode(stepId);
		const functionRef =
			graphNode?.stepFunctionRef ?? (stepMetadata?.functionRef as string | undefined);

		if (!functionRef) {
			throw new StepFunctionNotFoundError(stepId);
		}

		const stepFn = moduleExports[functionRef];
		if (typeof stepFn !== 'function') {
			throw new StepFunctionNotFoundError(functionRef, stepId);
		}

		return stepFn as StepFunction;
	}

	buildStepContext(stepJob: WorkflowStepExecution, execution: WorkflowExecution): ExecutionContext {
		const inputRecord = (stepJob.input as Record<string, unknown>) ?? {};
		const eventBus = this.eventBus;

		// For batch child steps, extract the batch item from input
		const batchItem =
			(stepJob.metadata as Record<string, unknown>)?.batchIndex !== undefined
				? (inputRecord as Record<string, unknown>).item
				: undefined;

		// For catch handler steps, extract the error from input metadata
		const errorData = (inputRecord as Record<string, unknown>).__error__ as unknown;

		return {
			// Data -- injected from predecessor outputs at queue time
			input: inputRecord,

			// Error -- set for catch handler steps (try/catch error edge)
			error: errorData,

			// Batch item -- set for batch child step invocations
			batchItem,

			// Convenience getter -- trigger data is available as the first input value.
			// In the common case (linear workflow), the trigger step's output is
			// the only predecessor output. For steps further down the chain,
			// trigger data propagates through predecessor outputs.
			get triggerData() {
				const keys = Object.keys(inputRecord);
				if (keys.length === 0) return {} as Record<string, unknown>;
				// Return the first predecessor's output as trigger data
				return (inputRecord[keys[0]] ?? {}) as Record<string, unknown>;
			},

			// Metadata
			executionId: execution.id,
			stepId: stepJob.stepId,
			attempt: stepJob.attempt,

			// Sub-step execution (PoC: simple pass-through for single steps)
			step: async (_definition, fn) => {
				return await fn();
			},

			// Approval — handled at compile time by the transpiler.
			// This stub exists only to satisfy the interface; it should never be called at runtime.
			approval: async (_definition, fn) => {
				return { ...(await fn()), approved: false } as Awaited<ReturnType<typeof fn>> & {
					approved: boolean;
				};
			},

			// Batch processing — handled at compile time by the transpiler.
			// This stub exists only to satisfy the interface; it should never be called at runtime.
			batch: async () => {
				throw new Error('ctx.batch() is handled at compile time by the transpiler');
			},

			// Streaming -- sends chunk event via broadcaster
			sendChunk: async (data: unknown) => {
				eventBus.emit({
					type: 'step:chunk',
					executionId: execution.id,
					stepId: stepJob.stepId,
					data,
					timestamp: Date.now(),
				});
			},

			// Webhook response -- stores response for the webhook handler to pick up
			respondToWebhook: async (response: WebhookResponse) => {
				eventBus.emit({
					type: 'webhook:respond',
					executionId: execution.id,
					statusCode: response.statusCode ?? 200,
					body: response.body,
					headers: response.headers,
				});
			},

			// Sleep/waitUntil — transpiler converts these to graph nodes at compile time.
			// These stubs exist only to satisfy the interface; they should never be called.
			sleep: async () => {
				throw new Error('ctx.sleep() should be handled by the transpiler, not called at runtime.');
			},
			waitUntil: async () => {
				throw new Error(
					'ctx.waitUntil() should be handled by the transpiler, not called at runtime.',
				);
			},

			// Cross-workflow trigger — starts a child workflow execution and waits for its result.
			triggerWorkflow: async (config: TriggerWorkflowConfig) => {
				if (!this.workflowTrigger) {
					throw new Error('WorkflowTriggerService is not configured');
				}
				return await this.workflowTrigger.triggerAndAwait(stepJob, config);
			},

			// Agent — handled at compile time by the transpiler.
			// This stub exists only to satisfy the interface; it should never be called at runtime.
			agent: async () => {
				throw new Error('ctx.agent() is handled at compile time by the transpiler');
			},

			// Secrets -- reads from environment variables (PoC)
			getSecret: (name: string) => process.env[name],
		};
	}

	async updateStepAndEmit(
		stepJob: WorkflowStepExecution,
		execution: WorkflowExecution,
		update: StepUpdate,
	): Promise<void> {
		// 1. Persist the status change to DB
		// Cast needed: TypeORM's _QueryDeepPartialEntity is overly strict for
		// dynamic partial updates with jsonb columns (output, error)
		await this.dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder()
			.update(WorkflowStepExecution)
			.set(update as Record<string, unknown>)
			.where('id = :id', { id: stepJob.id })
			.execute();

		// 2. Emit the corresponding event
		const eventType = mapStatusToEvent(update.status as string);
		this.emitStepEvent(eventType, stepJob, execution, update);
	}

	private emitStepEvent(
		eventType: string,
		stepJob: WorkflowStepExecution,
		execution: WorkflowExecution,
		update: StepUpdate,
	): void {
		switch (eventType) {
			case 'step:completed':
				this.eventBus.emit({
					type: 'step:completed',
					executionId: execution.id,
					stepId: stepJob.stepId,
					output: update.output,
					durationMs: (update.durationMs as number) ?? 0,
					parentStepExecutionId: stepJob.parentStepExecutionId ?? undefined,
				});
				break;
			case 'step:failed':
				this.eventBus.emit({
					type: 'step:failed',
					executionId: execution.id,
					stepId: stepJob.stepId,
					error: update.error as ErrorData,
					parentStepExecutionId: stepJob.parentStepExecutionId ?? undefined,
				});
				break;
			case 'step:cancelled':
				this.eventBus.emit({
					type: 'step:cancelled',
					executionId: execution.id,
					stepId: stepJob.stepId,
				});
				break;
			case 'step:retrying':
				this.eventBus.emit({
					type: 'step:retrying',
					executionId: execution.id,
					stepId: stepJob.stepId,
					attempt: (update.attempt as number) ?? stepJob.attempt,
					retryAfter: update.retryAfter?.toISOString() ?? '',
					error: update.error as ErrorData,
				});
				break;
			case 'step:waiting':
				this.eventBus.emit({
					type: 'step:waiting',
					executionId: execution.id,
					stepId: stepJob.stepId,
				});
				break;
			case 'step:waiting_approval':
				this.eventBus.emit({
					type: 'step:waiting_approval',
					executionId: execution.id,
					stepId: stepJob.stepId,
					stepExecutionId: stepJob.id,
					approvalToken: update.approvalToken ?? '',
					context: update.output,
				});
				break;
			default:
				// For any unmapped status, emit as step:waiting (safe fallback)
				this.eventBus.emit({
					type: 'step:waiting',
					executionId: execution.id,
					stepId: stepJob.stepId,
				});
				break;
		}
	}

	/** Clears the compiled module cache (useful for tests). */
	clearModuleCache(): void {
		this.moduleCache.clear();
	}
}

function mapStatusToEvent(status: string): string {
	switch (status) {
		case StepStatus.Completed:
			return 'step:completed';
		case StepStatus.Failed:
			return 'step:failed';
		case StepStatus.Cancelled:
			return 'step:cancelled';
		case StepStatus.RetryPending:
			return 'step:retrying';
		case StepStatus.WaitingApproval:
			return 'step:waiting_approval';
		case StepStatus.Waiting:
			return 'step:waiting';
		case StepStatus.Suspended:
			return 'step:waiting';
		default:
			return `step:${status}`;
	}
}

/**
 * Resolves the original source line from an error stack trace using the
 * pre-computed line map stored during compilation.
 *
 * The line map is a JSON object mapping compiled code line numbers (as string
 * keys) to original source line numbers. The compiled line is extracted from
 * the error stack trace by matching the workflow filename pattern.
 */
function resolveOriginalLine(stack: string, sourceMapJson: string): number | undefined {
	// Extract the compiled line number from the stack trace
	const stackMatch = stack.match(/workflow-[^)]+\.js:(\d+):\d+/);
	if (!stackMatch) return undefined;

	const compiledLine = stackMatch[1];

	try {
		const lineMap = JSON.parse(sourceMapJson) as Record<string, number>;
		const originalLine = lineMap[compiledLine];
		return typeof originalLine === 'number' ? originalLine : undefined;
	} catch {
		return undefined;
	}
}
