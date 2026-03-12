import { Module, createRequire } from 'node:module';

import type { DataSource } from '@n8n/typeorm';

import { WorkflowGraph } from '../graph/workflow-graph';
import type { WorkflowGraphData } from '../graph/graph.types';
import type { ExecutionContext, StepDefinition, WebhookResponse } from '../sdk/types';
import { StepStatus } from '../database/enums';
import type { WorkflowEntity } from '../database/entities/workflow.entity';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../database/entities/workflow-step-execution.entity';
import { StepTimeoutError } from './errors/step-timeout.error';
import { StepFunctionNotFoundError } from './errors/infrastructure.error';
import { buildErrorData, classifyError, calculateBackoff } from './errors/error-classifier';
import type { ErrorData } from './errors/error-classifier';
import type { EngineEventBus } from './event-bus.service';

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
}

/**
 * Processes individual step executions. Handles:
 * - Loading and caching compiled workflow modules
 * - Building execution contexts for step functions
 * - Running step functions with timeout enforcement
 * - Error classification and retry logic
 * - Sleep/wait via first-class sleep graph nodes
 */
export class StepProcessorService {
	/** Cache compiled modules: key = 'workflowId:version' */
	private moduleCache = new Map<string, Record<string, unknown>>();

	constructor(
		private readonly dataSource: DataSource,
		private readonly eventBus: EngineEventBus,
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

			// 5. Get step config from graph (handle fan-out child steps via metadata)
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
			} catch (error) {
				// 11. Handle step errors (retriable or not)
				const durationMs = Date.now() - startTime;
				const errorData = buildErrorData(error, workflow.sourceMap ?? undefined);

				// Compute original source line for the error.
				// Strategy: extract the error line content from the compiled code,
				// then search for that text in the original source. This handles
				// comments, blank lines, and other source transformations correctly.
				const stepNode = graph.getNode(stepJob.stepId);
				if (stepNode && workflow.code) {
					let originalLine: number | undefined;

					// Try to find exact error line by matching compiled code content
					if (error instanceof Error && error.stack && workflow.compiledCode) {
						const stackMatch = error.stack.match(/workflow-[^)]+\.js:(\d+):\d+/);
						if (stackMatch) {
							const compiledLine = parseInt(stackMatch[1], 10);
							const compiledLines = workflow.compiledCode.split('\n');
							if (compiledLine > 0 && compiledLine <= compiledLines.length) {
								const errorLineContent = compiledLines[compiledLine - 1].trim();
								if (errorLineContent.length > 5) {
									// Normalize: esbuild transforms (e.g., void 0 for undefined)
									const normalize = (s: string) =>
										s
											.replace(/\(void 0\)/g, 'undefined')
											.replace(/\bas\s+\w+/g, '') // strip TS type casts
											.replace(/\s+/g, ' ')
											.trim();

									const normalizedCompiled = normalize(errorLineContent);

									// Extract key tokens: variable names, property accesses, function calls
									const tokens = normalizedCompiled
										.replace(/[^a-zA-Z0-9_.]/g, ' ')
										.split(/\s+/)
										.filter((t) => t.length > 2);

									const sourceLines = workflow.code.split('\n');

									// Strategy 1: normalized full-line match
									for (let i = 0; i < sourceLines.length; i++) {
										const normalizedSrc = normalize(sourceLines[i]);
										if (normalizedSrc.length > 3 && normalizedCompiled.includes(normalizedSrc)) {
											originalLine = i + 1;
											break;
										}
										if (normalizedSrc.length > 3 && normalizedSrc.includes(normalizedCompiled)) {
											originalLine = i + 1;
											break;
										}
									}

									// Strategy 2: token matching — find the source line with most matching tokens
									if (!originalLine && tokens.length > 0) {
										let bestScore = 0;
										let bestLine = -1;
										// Only search within the step's range in the source
										const stepName = stepNode.name;
										const nameIdx =
											workflow.code.indexOf(`'${stepName}'`) ??
											workflow.code.indexOf(`"${stepName}"`);
										const searchStart =
											nameIdx >= 0 ? workflow.code.substring(0, nameIdx).split('\n').length - 1 : 0;

										for (
											let i = searchStart;
											i < Math.min(searchStart + 30, sourceLines.length);
											i++
										) {
											const srcNorm = normalize(sourceLines[i]);
											if (srcNorm.length < 3) continue;
											const score = tokens.filter((t) => srcNorm.includes(t)).length;
											if (score > bestScore) {
												bestScore = score;
												bestLine = i + 1;
											}
										}
										if (bestScore >= 2) {
											originalLine = bestLine;
										}
									}
								}
							}
						}
					}

					// Fallback: point to the step definition line
					if (!originalLine) {
						const stepName = stepNode.name;
						// Search for the step name in the new format (object literal) or legacy format
						const patterns = [
							`name: '${stepName}'`,
							`name: "${stepName}"`,
							`ctx.step('${stepName}'`,
							`ctx.step("${stepName}"`,
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
							originalLine = workflow.code.substring(0, pos).split('\n').length;
						}
					}

					if (originalLine) {
						errorData.originalLine = originalLine;
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
		if (!moduleExports) {
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
		}

		// For regular steps: look up function ref from graph node
		// For fan-out child steps (not in graph): look up from step metadata
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

		return {
			// Data -- injected from predecessor outputs at queue time
			input: inputRecord,

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

			// Sub-step execution (PoC: simple pass-through)
			step: async <T>(_definition: StepDefinition, fn: () => Promise<T>): Promise<T> => {
				return await fn();
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
		default:
			return `step:${status}`;
	}
}
