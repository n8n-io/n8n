// ---------------------------------------------------------------------------
// In-process orchestrator run for pairwise evals.
//
// This is the orchestrator-driven sibling to `in-process-builder.ts`. Where
// the builder harness invoked the build-workflow sub-agent directly, this
// harness wires up `createInstanceAgent` (the production orchestrator) with
// a stubbed `OrchestrationContext` — real `BackgroundTaskManager`, in-memory
// stores, auto-approving HITL, and a multi-turn loop that re-enters the
// orchestrator with `<background-task-completed>` follow-ups whenever a
// detached sub-agent settles. Workflow capture still happens through the
// stub `workflowService.createFromWorkflowJSON` hook the builder's
// `submit-workflow` tool calls inside its sandbox.
//
// Compared to direct builder invocation, this measures the full graph:
// orchestrator decisions (planning, delegation, ask-user) plus whatever
// sub-agents the orchestrator spawns. The `agentId` field on each
// `ToolCallTrace` distinguishes orchestrator calls (`agent-001`) from
// builder/data-table sub-agent calls.
// ---------------------------------------------------------------------------

import type { InstanceAiEvent } from '@n8n/api-types';
import { InMemoryStore } from '@mastra/core/storage';
import { createWriteStream, type WriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';

import type { SimpleWorkflow } from '../../../ai-workflow-builder.ee/evaluations/evaluators/pairwise';

import { createInstanceAgent } from '../../src/agent/instance-agent';
import { registerWithMastra } from '../../src/agent/register-with-mastra';
import type { InstanceAiEventBus, StoredEvent } from '../../src/event-bus';
import type { Logger } from '../../src/logger';
import { createMemory } from '../../src/memory/memory-config';
import {
	BackgroundTaskManager,
	type ManagedBackgroundTask,
} from '../../src/runtime/background-task-manager';
import { executeResumableStream } from '../../src/runtime/resumable-stream-executor';
import { PlannedTaskCoordinator } from '../../src/planned-tasks/planned-task-service';
import { MastraTaskStorage } from '../../src/storage/mastra-task-storage';
import { PlannedTaskStorage } from '../../src/storage/planned-task-storage';
import { startBuildWorkflowAgentTask } from '../../src/tools/orchestration/build-workflow-agent.tool';
import { startDataTableAgentTask } from '../../src/tools/orchestration/data-table-agent.tool';
import { startResearchAgentTask } from '../../src/tools/orchestration/research-with-agent.tool';
import { startDetachedDelegateTask } from '../../src/tools/orchestration/delegate.tool';
import { createAllTools } from '../../src/tools';
import type {
	ModelConfig,
	OrchestrationContext,
	PlannedTaskGraph,
	PlannedTaskRecord,
	SpawnBackgroundTaskOptions,
	SpawnBackgroundTaskResult,
} from '../../src/types';
import { asResumable } from '../../src/utils/stream-helpers';
import type { BuilderSandboxFactory } from '../../src/workspace/builder-sandbox-factory';
import { createStubServices, defaultNodesJsonPath, type StubServiceHandle } from './stub-services';
import { normalizeWorkflow } from './normalize-workflow';

// ---------------------------------------------------------------------------
// Public API — kept identical to in-process-builder so callers can swap
// implementations by changing one import.
// ---------------------------------------------------------------------------

export type BuildErrorClass = 'build_timeout' | 'no_workflow_built' | 'agent_error';

export interface ToolCallSuspension {
	message?: string;
	questions?: unknown;
	severity?: string;
	autoApproved: boolean;
}

export interface ToolCallTrace {
	step: number;
	toolCallId: string;
	toolName: string;
	agentId: string;
	args?: unknown;
	result?: unknown;
	error?: string;
	elapsedMs?: number;
	suspension?: ToolCallSuspension;
}

export interface InProcessBuildResult {
	success: boolean;
	workflow?: SimpleWorkflow;
	extraWorkflows: SimpleWorkflow[];
	errorClass?: BuildErrorClass;
	errorMessage?: string;
	durationMs: number;
	finalText?: string;
	interactivity: {
		askUserCount: number;
		planToolCount: number;
		autoApprovedSuspensions: number;
		mockedCredentialTypes: string[];
	};
	toolCalls: ToolCallTrace[];
}

export interface BuildInProcessOptions {
	prompt: string;
	modelId?: ModelConfig;
	nodesJsonPath?: string;
	timeoutMs?: number;
	/** Max steps per orchestrator turn. Defaults to production-ish 30. */
	maxSteps?: number;
	logPath?: string;
	/** Provisions per-builder ephemeral sandboxes when the orchestrator
	 *  delegates to the build-workflow sub-agent. Required. */
	sandboxFactory: BuilderSandboxFactory;
}

const ORCHESTRATOR_AGENT_ID = 'agent-001';
/** Cap follow-up turns so a stuck orchestrator can't loop forever. */
const MAX_TURNS = 12;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export async function buildInProcess(
	options: BuildInProcessOptions,
): Promise<InProcessBuildResult> {
	const started = Date.now();
	const timeoutMs = options.timeoutMs ?? 20 * 60 * 1000;
	const modelId: ModelConfig = options.modelId ?? 'anthropic/claude-sonnet-4-6';
	const maxSteps = options.maxSteps ?? 30;

	const interactivity = {
		askUserCount: 0,
		planToolCount: 0,
		autoApprovedSuspensions: 0,
		mockedCredentialTypes: new Set<string>(),
	};

	const traceCollector = createToolTraceCollector();
	const chunkLog = options.logPath ? await openChunkLog(options.logPath) : null;
	chunkLog?.writeHeader(options.prompt, { modelId, maxSteps, timeoutMs });

	let services: StubServiceHandle;
	try {
		services = await createStubServices({
			nodesJsonPath: options.nodesJsonPath ?? defaultNodesJsonPath(),
		});
	} catch (error) {
		chunkLog?.write({ kind: 'error', stage: 'stub-services', message: String(error) });
		await chunkLog?.close();
		return failResult(
			started,
			'agent_error',
			error,
			interactivity,
			undefined,
			traceCollector.snapshot(),
		);
	}

	const userId = services.context.userId;
	const threadId = 'eval-thread-' + nanoid(6);
	const runId = 'eval-run-' + nanoid(6);
	const mastraStorage = new InMemoryStore({ id: 'eval-' + nanoid(6) });
	const memory = createMemory({ storage: mastraStorage });

	// Orchestrator memory keys conversation by threadId; the thread must exist
	// before agent.stream() is called or `getThreadById` returns null and the
	// orchestrator's history accumulator silently drops follow-up turns.
	const now = new Date();
	await memory.saveThread({
		thread: {
			id: threadId,
			resourceId: userId,
			title: '',
			createdAt: now,
			updatedAt: now,
		},
	});

	const taskStorage = new MastraTaskStorage(memory);
	const plannedTaskStorage = new PlannedTaskStorage(memory);
	const plannedTaskService = new PlannedTaskCoordinator(plannedTaskStorage);
	const backgroundTasks = new BackgroundTaskManager();

	const abortController = new AbortController();
	const timeoutHandle = setTimeout(() => abortController.abort(), timeoutMs);

	const eventBus = wrapEventBusWithObserver(createInMemoryEventBus(), (event) => {
		observeEvent(event, interactivity);
		traceCollector.observe(event);
		chunkLog?.writeEvent(event);
	});
	const logger = silentLogger();

	// Multi-turn coordination: settle promises plus a queued follow-up message
	// that re-enters the orchestrator after the last in-flight task drains.
	const settlementResolvers = new Map<string, () => void>();
	const pendingTaskPromises: Array<Promise<void>> = [];
	const followUpQueue: string[] = [];

	const queueFollowUpForTask = (task: ManagedBackgroundTask, status: 'completed' | 'failed') => {
		// Direct (non-planned) background tasks are followed up with a
		// `<background-task-completed>` shell; planned tasks settle through
		// the plannedTaskService and produce `<planned-task-follow-up>`
		// messages from `runPlannedTaskScheduler` instead. Checkpoint
		// children are skipped here because the eval harness doesn't drive
		// checkpoint re-entry.
		if (task.plannedTaskId || task.parentCheckpointId) return;
		const payload = JSON.stringify(
			{
				role: task.role,
				status,
				result: task.result ?? undefined,
				outcome: task.outcome ?? undefined,
				error: task.error ?? undefined,
			},
			null,
			2,
		);
		followUpQueue.push(
			`<background-task-completed>\n${payload}\n</background-task-completed>\n\n(continue)`,
		);
	};

	// Drive the planned-task scheduler until it returns `none`/`replan`/
	// `synthesize` — dispatching ready tasks each iteration. Replan/synthesize
	// queue an internal follow-up turn so the orchestrator can re-enter with
	// the planned-task results in scope.
	const runPlannedTaskScheduler = async (): Promise<void> => {
		while (true) {
			const action = await plannedTaskService.tick(threadId);
			if (action.type === 'none') return;
			if (action.type === 'dispatch') {
				for (const task of action.tasks) {
					await dispatchPlannedTask(task, orchestrationContextRef.current, plannedTaskService);
				}
				continue;
			}
			if (action.type === 'synthesize') {
				followUpQueue.push(buildPlannedFollowUp('synthesize', action.graph));
				return;
			}
			if (action.type === 'replan') {
				followUpQueue.push(
					buildPlannedFollowUp('replan', action.graph, { failedTask: action.failedTask }),
				);
				return;
			}
			if (action.type === 'orchestrate-checkpoint') {
				followUpQueue.push(
					buildPlannedFollowUp('checkpoint', action.graph, { checkpoint: action.tasks[0] }),
				);
				return;
			}
		}
	};

	const orchestrationContext: OrchestrationContext = {
		threadId,
		runId,
		userId,
		orchestratorAgentId: ORCHESTRATOR_AGENT_ID,
		modelId,
		storage: mastraStorage,
		subAgentMaxSteps: 80,
		eventBus,
		logger,
		domainTools: createAllTools(services.context),
		abortSignal: abortController.signal,
		taskStorage,
		plannedTaskService,
		schedulePlannedTasks: runPlannedTaskScheduler,
		waitForConfirmation: async (requestId) => {
			interactivity.autoApprovedSuspensions++;
			traceCollector.markAutoApproved(requestId);
			chunkLog?.write({ kind: 'auto-approve', requestId });
			return { approved: true };
		},
		spawnBackgroundTask: (opts) =>
			spawnBackgroundTaskAdapter(
				opts,
				backgroundTasks,
				eventBus,
				runId,
				settlementResolvers,
				pendingTaskPromises,
				queueFollowUpForTask,
				plannedTaskService,
				runPlannedTaskScheduler,
			),
		cancelBackgroundTask: async (taskId) => {
			backgroundTasks.cancelTask(threadId, taskId);
		},
		builderSandboxFactory: options.sandboxFactory,
		domainContext: services.context,
		memory,
		getRunningTaskSummaries: () =>
			backgroundTasks.getRunningTasks(threadId).map((t) => ({
				taskId: t.taskId,
				role: t.role,
			})),
	};

	// Late-bind a self-reference so schedulePlannedTasks can dispatch tasks
	// using the same OrchestrationContext the orchestrator agent received.
	const orchestrationContextRef: { current: OrchestrationContext } = {
		current: orchestrationContext,
	};

	let agent;
	try {
		agent = await createInstanceAgent({
			modelId,
			context: services.context,
			orchestrationContext,
			mcpServers: [],
			memoryConfig: { storage: mastraStorage },
			memory,
			disableDeferredTools: true,
		});
	} catch (error) {
		clearTimeout(timeoutHandle);
		chunkLog?.write({
			kind: 'error',
			stage: 'create-agent',
			message: error instanceof Error ? error.message : String(error),
		});
		await chunkLog?.close();
		return failResult(
			started,
			'agent_error',
			error,
			interactivity,
			undefined,
			traceCollector.snapshot(),
		);
	}

	registerWithMastra(ORCHESTRATOR_AGENT_ID, agent, mastraStorage);

	let finalText: string | undefined;
	let turn = 0;
	let currentInput: string = options.prompt;

	try {
		while (turn < MAX_TURNS) {
			turn += 1;
			chunkLog?.write({ kind: 'turn-start', turn, input: truncate(currentInput, 600) });

			let streamSource;
			try {
				streamSource = await agent.stream(currentInput, {
					maxSteps,
					abortSignal: abortController.signal,
					memory: { resource: userId, thread: threadId },
					providerOptions: {
						anthropic: { cacheControl: { type: 'ephemeral' as const } },
					},
				});
			} catch (error) {
				if (abortController.signal.aborted) {
					await chunkLog?.close();
					return failResult(
						started,
						'build_timeout',
						new Error(`Build exceeded ${timeoutMs}ms`),
						interactivity,
						finalText,
						traceCollector.snapshot(),
					);
				}
				chunkLog?.write({
					kind: 'error',
					stage: 'stream-init',
					turn,
					message: error instanceof Error ? error.message : String(error),
				});
				await chunkLog?.close();
				return failResult(
					started,
					'agent_error',
					error,
					interactivity,
					finalText,
					traceCollector.snapshot(),
				);
			}

			const result = await executeResumableStream({
				agent: asResumable(agent),
				stream: streamSource,
				context: {
					threadId,
					runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					eventBus,
					signal: abortController.signal,
					logger,
				},
				control: {
					mode: 'auto',
					waitForConfirmation: async (requestId): Promise<Record<string, unknown>> => {
						interactivity.autoApprovedSuspensions++;
						traceCollector.markAutoApproved(requestId);
						chunkLog?.write({ kind: 'auto-approve', requestId });
						return { approved: true };
					},
					onSuspension: (suspension) => {
						chunkLog?.write({ kind: 'suspension', ...suspension });
						if (suspension.toolName === 'ask-user') {
							interactivity.askUserCount++;
						}
					},
				},
			});

			if (result.text) finalText = await result.text;
			const usage = await safeSettle(streamSource.totalUsage ?? streamSource.usage);
			const finishReason = await safeSettle(streamSource.finishReason);
			chunkLog?.write({
				kind: 'turn-finish',
				turn,
				status: result.status,
				finishReason,
				usage,
			});

			if (abortController.signal.aborted || result.status === 'cancelled') {
				await chunkLog?.close();
				return failResult(
					started,
					'build_timeout',
					new Error(`Build exceeded ${timeoutMs}ms`),
					interactivity,
					finalText,
					traceCollector.snapshot(),
				);
			}
			if (result.status === 'errored') {
				await chunkLog?.close();
				return failResult(
					started,
					'agent_error',
					new Error('Stream errored'),
					interactivity,
					finalText,
					traceCollector.snapshot(),
				);
			}

			// Drain any in-flight background tasks the orchestrator spawned this
			// turn. New tasks may be queued while we wait, so loop until empty.
			while (pendingTaskPromises.length > 0) {
				const drained = pendingTaskPromises.splice(0);
				try {
					await Promise.all(drained);
				} catch (error) {
					chunkLog?.write({
						kind: 'error',
						stage: 'background-drain',
						turn,
						message: error instanceof Error ? error.message : String(error),
					});
				}
			}

			const next = followUpQueue.shift();
			if (!next) break;
			currentInput = next;
		}
	} finally {
		clearTimeout(timeoutHandle);
	}

	const captured = services.capturedWorkflows;
	chunkLog?.write({ kind: 'captured-workflows', count: captured.length, turns: turn });
	if (finalText) chunkLog?.write({ kind: 'final-text', text: finalText });

	if (captured.length === 0) {
		await chunkLog?.close();
		return failResult(
			started,
			'no_workflow_built',
			new Error('Orchestrator finished without producing a workflow'),
			interactivity,
			finalText,
			traceCollector.snapshot(),
		);
	}

	const [first, ...extras] = captured.map(normalizeWorkflow);
	await chunkLog?.close();

	return {
		success: true,
		workflow: first,
		extraWorkflows: extras,
		durationMs: Date.now() - started,
		finalText,
		interactivity: {
			askUserCount: interactivity.askUserCount,
			planToolCount: interactivity.planToolCount,
			autoApprovedSuspensions: interactivity.autoApprovedSuspensions,
			mockedCredentialTypes: Array.from(interactivity.mockedCredentialTypes),
		},
		toolCalls: traceCollector.snapshot(),
	};
}

// ---------------------------------------------------------------------------
// Background task adapter — bridges the OrchestrationContext spawn API to
// BackgroundTaskManager while tracking settlement promises and follow-ups.
// ---------------------------------------------------------------------------

function spawnBackgroundTaskAdapter(
	opts: SpawnBackgroundTaskOptions,
	btm: BackgroundTaskManager,
	eventBus: InstanceAiEventBus,
	runId: string,
	settlementResolvers: Map<string, () => void>,
	pendingTaskPromises: Array<Promise<void>>,
	queueFollowUpForTask: (task: ManagedBackgroundTask, status: 'completed' | 'failed') => void,
	plannedTaskService: PlannedTaskCoordinator,
	runPlannedTaskScheduler: () => Promise<void>,
): SpawnBackgroundTaskResult {
	let resolveSettled!: () => void;
	const settled = new Promise<void>((resolve) => {
		resolveSettled = resolve;
	});

	const outcome = btm.spawn({
		taskId: opts.taskId,
		threadId: opts.threadId,
		runId,
		role: opts.role,
		agentId: opts.agentId,
		messageGroupId: undefined,
		plannedTaskId: opts.plannedTaskId,
		workItemId: opts.workItemId,
		traceContext: opts.traceContext,
		dedupeKey: opts.dedupeKey,
		parentCheckpointId: opts.parentCheckpointId,
		run: opts.run,
		onLimitReached: () => {
			eventBus.publish(opts.threadId, {
				type: 'agent-completed',
				runId,
				agentId: opts.agentId,
				payload: { role: opts.role, result: '', error: 'Background task limit reached' },
			});
		},
		onCompleted: async (task) => {
			eventBus.publish(opts.threadId, {
				type: 'agent-completed',
				runId,
				agentId: opts.agentId,
				payload: { role: opts.role, result: task.result ?? '' },
			});
			if (task.plannedTaskId) {
				await plannedTaskService.markSucceeded(opts.threadId, task.plannedTaskId, {
					result: task.result,
					outcome: task.outcome,
				});
				await runPlannedTaskScheduler();
				return;
			}
			queueFollowUpForTask(task, 'completed');
		},
		onFailed: async (task) => {
			eventBus.publish(opts.threadId, {
				type: 'agent-completed',
				runId,
				agentId: opts.agentId,
				payload: { role: opts.role, result: '', error: task.error ?? 'Unknown error' },
			});
			if (task.plannedTaskId) {
				await plannedTaskService.markFailed(opts.threadId, task.plannedTaskId, {
					error: task.error,
				});
				await runPlannedTaskScheduler();
				return;
			}
			queueFollowUpForTask(task, 'failed');
		},
		onSettled: async () => {
			settlementResolvers.delete(opts.taskId);
			resolveSettled();
		},
	});

	if (outcome.status === 'started') {
		settlementResolvers.set(opts.taskId, resolveSettled);
		pendingTaskPromises.push(settled);
		return { status: 'started', taskId: outcome.task.taskId, agentId: outcome.task.agentId };
	}
	if (outcome.status === 'duplicate') {
		// Resolve immediately so we don't await a never-settling promise.
		resolveSettled();
		return {
			status: 'duplicate',
			existing: {
				taskId: outcome.existing.taskId,
				agentId: outcome.existing.agentId,
				role: outcome.existing.role,
				plannedTaskId: outcome.existing.plannedTaskId,
				workItemId: outcome.existing.workItemId,
			},
		};
	}
	resolveSettled();
	return { status: 'limit-reached' };
}

// ---------------------------------------------------------------------------
// Planned-task dispatch — mirrors the production switch in
// instance-ai.service.ts (dispatchPlannedTask) so each task kind ends up at
// the same start*AgentTask helper. Checkpoint tasks aren't dispatched as
// background tasks — production runs them inline in the orchestrator —
// so we skip them here and let the scheduler queue an
// `orchestrate-checkpoint` follow-up.
// ---------------------------------------------------------------------------

async function dispatchPlannedTask(
	task: PlannedTaskRecord,
	context: OrchestrationContext,
	plannedTaskService: PlannedTaskCoordinator,
): Promise<void> {
	let started: { taskId: string; agentId: string; result: string } | null = null;
	switch (task.kind) {
		case 'build-workflow':
			started = await startBuildWorkflowAgentTask(context, {
				task: task.spec,
				workflowId: task.workflowId,
				plannedTaskId: task.id,
			});
			break;
		case 'manage-data-tables':
			started = await startDataTableAgentTask(context, {
				task: task.spec,
				plannedTaskId: task.id,
			});
			break;
		case 'research':
			started = await startResearchAgentTask(context, {
				goal: task.title,
				constraints: task.spec,
				plannedTaskId: task.id,
			});
			break;
		case 'delegate':
			started = await startDetachedDelegateTask(context, {
				title: task.title,
				spec: task.spec,
				tools: task.tools ?? [],
				plannedTaskId: task.id,
			});
			break;
	}
	if (!started?.taskId) {
		await plannedTaskService.markFailed(context.threadId, task.id, {
			error: started?.result || `Failed to start planned task "${task.title}"`,
		});
		return;
	}
	await plannedTaskService.markRunning(context.threadId, task.id, {
		agentId: started.agentId,
		backgroundTaskId: started.taskId,
	});
}

function buildPlannedFollowUp(
	type: 'synthesize' | 'replan' | 'checkpoint',
	graph: PlannedTaskGraph,
	options: { failedTask?: PlannedTaskRecord; checkpoint?: PlannedTaskRecord } = {},
): string {
	const payload: Record<string, unknown> = {
		tasks: graph.tasks.map((t) => ({
			id: t.id,
			title: t.title,
			kind: t.kind,
			status: t.status,
			result: t.result,
			error: t.error,
			outcome: t.outcome,
		})),
	};
	if (options.failedTask) {
		payload.failedTask = {
			id: options.failedTask.id,
			title: options.failedTask.title,
			kind: options.failedTask.kind,
			error: options.failedTask.error,
			result: options.failedTask.result,
		};
	}
	if (options.checkpoint) {
		const depOutcomes = graph.tasks
			.filter((t) => options.checkpoint!.deps.includes(t.id))
			.map((t) => ({
				id: t.id,
				title: t.title,
				kind: t.kind,
				status: t.status,
				result: t.result,
				outcome: t.outcome,
			}));
		payload.checkpoint = {
			id: options.checkpoint.id,
			title: options.checkpoint.title,
			instructions: options.checkpoint.spec,
			dependsOn: depOutcomes,
		};
	}
	return `<planned-task-follow-up type="${type}">\n${JSON.stringify(payload, null, 2)}\n</planned-task-follow-up>\n\n(continue)`;
}

// ---------------------------------------------------------------------------
// Helpers (event observation, trace collection, in-memory bus, chunk log)
// — copied from in-process-builder so the two harnesses can evolve
// independently without forcing a shared utility module.
// ---------------------------------------------------------------------------

interface InteractivityState {
	askUserCount: number;
	planToolCount: number;
	autoApprovedSuspensions: number;
	mockedCredentialTypes: Set<string>;
}

function observeEvent(event: InstanceAiEvent, interactivity: InteractivityState): void {
	if (event.type === 'tool-call') {
		const payload: unknown = event.payload;
		if (!isRecord(payload)) return;
		const toolName = typeof payload.toolName === 'string' ? payload.toolName : undefined;
		if (toolName === 'plan' || toolName === 'create-tasks') interactivity.planToolCount++;
	} else if (event.type === 'tool-result') {
		const payload: unknown = event.payload;
		if (!isRecord(payload)) return;
		const result = isRecord(payload.result) ? payload.result : undefined;
		const mocked = result?.mockedCredentialTypes;
		if (Array.isArray(mocked)) {
			for (const type of mocked) {
				if (typeof type === 'string') interactivity.mockedCredentialTypes.add(type);
			}
		}
	}
}

function failResult(
	startedAt: number,
	errorClass: BuildErrorClass,
	error: unknown,
	interactivity: InteractivityState,
	finalText: string | undefined,
	toolCalls: ToolCallTrace[],
): InProcessBuildResult {
	return {
		success: false,
		extraWorkflows: [],
		errorClass,
		errorMessage: error instanceof Error ? error.message : String(error),
		durationMs: Date.now() - startedAt,
		finalText,
		interactivity: {
			askUserCount: interactivity.askUserCount,
			planToolCount: interactivity.planToolCount,
			autoApprovedSuspensions: interactivity.autoApprovedSuspensions,
			mockedCredentialTypes: Array.from(interactivity.mockedCredentialTypes),
		},
		toolCalls,
	};
}

interface ToolTraceCollector {
	observe: (event: InstanceAiEvent) => void;
	markAutoApproved: (requestId: string) => void;
	snapshot: () => ToolCallTrace[];
}

const TOOL_TRACE_TRUNC = 4000;

function createToolTraceCollector(): ToolTraceCollector {
	const traces: ToolCallTrace[] = [];
	const byToolCallId = new Map<string, ToolCallTrace>();
	const startTimes = new Map<string, number>();
	const requestIdToToolCallId = new Map<string, string>();
	let stepCounter = 0;
	return {
		observe(event) {
			if (event.type === 'tool-call') {
				stepCounter += 1;
				const trace: ToolCallTrace = {
					step: stepCounter,
					toolCallId: event.payload.toolCallId,
					toolName: event.payload.toolName,
					agentId: event.agentId,
					args: truncate(event.payload.args, TOOL_TRACE_TRUNC),
				};
				traces.push(trace);
				byToolCallId.set(trace.toolCallId, trace);
				startTimes.set(trace.toolCallId, Date.now());
			} else if (event.type === 'tool-result') {
				const trace = byToolCallId.get(event.payload.toolCallId);
				if (!trace) return;
				const start = startTimes.get(trace.toolCallId);
				if (start !== undefined) trace.elapsedMs = Date.now() - start;
				trace.result = truncate(event.payload.result, TOOL_TRACE_TRUNC);
				startTimes.delete(trace.toolCallId);
			} else if (event.type === 'tool-error') {
				const trace = byToolCallId.get(event.payload.toolCallId);
				if (!trace) return;
				const start = startTimes.get(trace.toolCallId);
				if (start !== undefined) trace.elapsedMs = Date.now() - start;
				const errStr =
					typeof event.payload.error === 'string'
						? event.payload.error
						: JSON.stringify(event.payload.error);
				trace.error = errStr.length > TOOL_TRACE_TRUNC ? errStr.slice(0, TOOL_TRACE_TRUNC) : errStr;
				startTimes.delete(trace.toolCallId);
			} else if (event.type === 'confirmation-request') {
				const trace = byToolCallId.get(event.payload.toolCallId);
				if (!trace) return;
				requestIdToToolCallId.set(event.payload.requestId, event.payload.toolCallId);
				trace.suspension = {
					message: event.payload.message,
					questions: event.payload.questions,
					severity: event.payload.severity,
					autoApproved: false,
				};
			}
		},
		markAutoApproved(requestId) {
			const toolCallId = requestIdToToolCallId.get(requestId);
			if (!toolCallId) return;
			const trace = byToolCallId.get(toolCallId);
			if (trace?.suspension) trace.suspension.autoApproved = true;
		},
		snapshot() {
			return traces.map((t) => ({ ...t }));
		},
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function silentLogger(): Logger {
	return { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
}

function createInMemoryEventBus(): InstanceAiEventBus {
	const storeByThread = new Map<string, StoredEvent[]>();
	const subscribersByThread = new Map<string, Array<(event: StoredEvent) => void>>();
	return {
		publish(threadId, event) {
			const list = storeByThread.get(threadId) ?? [];
			const stored: StoredEvent = { id: list.length + 1, event };
			list.push(stored);
			storeByThread.set(threadId, list);
			const subs = subscribersByThread.get(threadId);
			if (subs) for (const sub of subs) sub(stored);
		},
		subscribe(threadId, handler) {
			const subs = subscribersByThread.get(threadId) ?? [];
			subs.push(handler);
			subscribersByThread.set(threadId, subs);
			return () => {
				const current = subscribersByThread.get(threadId) ?? [];
				subscribersByThread.set(
					threadId,
					current.filter((h) => h !== handler),
				);
			};
		},
		getEventsAfter(threadId, afterId) {
			return (storeByThread.get(threadId) ?? []).filter((e) => e.id > afterId);
		},
		getEventsForRun(threadId, runId) {
			return (storeByThread.get(threadId) ?? [])
				.map((e) => e.event)
				.filter((e) => 'runId' in e && e.runId === runId);
		},
		getEventsForRuns(threadId, runIds) {
			const set = new Set(runIds);
			return (storeByThread.get(threadId) ?? [])
				.map((e) => e.event)
				.filter((e) => 'runId' in e && set.has(e.runId));
		},
		getNextEventId(threadId) {
			return (storeByThread.get(threadId) ?? []).length + 1;
		},
	};
}

function wrapEventBusWithObserver(
	bus: InstanceAiEventBus,
	observe: (event: InstanceAiEvent) => void,
): InstanceAiEventBus {
	return {
		...bus,
		publish(threadId, event) {
			observe(event);
			bus.publish(threadId, event);
		},
	};
}

interface ChunkLog {
	writeHeader(
		prompt: string,
		config: { modelId: ModelConfig; maxSteps: number; timeoutMs: number },
	): void;
	writeEvent(event: InstanceAiEvent): void;
	write(record: Record<string, unknown>): void;
	close(): Promise<void>;
}

async function openChunkLog(filePath: string): Promise<ChunkLog> {
	await mkdir(path.dirname(filePath), { recursive: true });
	const stream: WriteStream = createWriteStream(filePath, { flags: 'w' });
	stream.on('error', () => {});
	let closed = false;
	const emit = (obj: Record<string, unknown>): void => {
		if (closed) return;
		stream.write(JSON.stringify({ t: new Date().toISOString(), ...obj }) + '\n');
	};
	const toolCallStarts = new Map<string, { started: number; toolName: string }>();
	let textBuf = '';
	let reasoningBuf = '';
	const flushText = (): void => {
		if (textBuf.length > 0) {
			emit({ kind: 'text', length: textBuf.length, text: textBuf });
			textBuf = '';
		}
		if (reasoningBuf.length > 0) {
			emit({ kind: 'reasoning', length: reasoningBuf.length, text: reasoningBuf });
			reasoningBuf = '';
		}
	};
	let toolCallIdx = 0;
	return {
		writeHeader(prompt, config) {
			emit({
				kind: 'start',
				modelId: typeof config.modelId === 'string' ? config.modelId : '<non-string>',
				maxSteps: config.maxSteps,
				timeoutMs: config.timeoutMs,
				prompt,
			});
		},
		writeEvent(event) {
			if (event.type === 'tool-call' && isRecord(event.payload)) {
				flushText();
				toolCallIdx += 1;
				const toolCallId =
					typeof event.payload.toolCallId === 'string' ? event.payload.toolCallId : '';
				const toolName =
					typeof event.payload.toolName === 'string' ? event.payload.toolName : '<unknown>';
				if (toolCallId) toolCallStarts.set(toolCallId, { started: Date.now(), toolName });
				emit({
					kind: 'tool-call',
					step: toolCallIdx,
					runId: event.runId,
					agentId: event.agentId,
					toolName,
					toolCallId,
					args: truncate(event.payload.args, 2000),
				});
			} else if (event.type === 'tool-result' && isRecord(event.payload)) {
				const toolCallId =
					typeof event.payload.toolCallId === 'string' ? event.payload.toolCallId : '';
				const start = toolCallId ? toolCallStarts.get(toolCallId) : undefined;
				const elapsedMs = start ? Date.now() - start.started : undefined;
				if (toolCallId) toolCallStarts.delete(toolCallId);
				emit({
					kind: 'tool-result',
					runId: event.runId,
					toolCallId,
					toolName: start?.toolName,
					elapsedMs,
					result: truncate(event.payload.result, 2000),
				});
			} else if (event.type === 'tool-error' && isRecord(event.payload)) {
				const toolCallId =
					typeof event.payload.toolCallId === 'string' ? event.payload.toolCallId : '';
				const start = toolCallId ? toolCallStarts.get(toolCallId) : undefined;
				const elapsedMs = start ? Date.now() - start.started : undefined;
				if (toolCallId) toolCallStarts.delete(toolCallId);
				emit({
					kind: 'tool-error',
					runId: event.runId,
					toolCallId,
					toolName: start?.toolName,
					elapsedMs,
					error: truncate(event.payload.error, 2000),
				});
			} else if (event.type === 'text-delta' && isRecord(event.payload)) {
				if (typeof event.payload.text === 'string') textBuf += event.payload.text;
			} else if (event.type === 'reasoning-delta' && isRecord(event.payload)) {
				if (typeof event.payload.text === 'string') reasoningBuf += event.payload.text;
			} else if (event.type === 'confirmation-request') {
				flushText();
				emit({ kind: 'confirmation-request', payload: event.payload });
			} else if (event.type === 'agent-spawned' || event.type === 'run-start') {
				emit({ kind: event.type, payload: event.payload });
			} else if (event.type === 'agent-completed' || event.type === 'run-finish') {
				flushText();
				emit({ kind: event.type, payload: event.payload });
			} else if (event.type === 'error' && isRecord(event.payload)) {
				flushText();
				emit({
					kind: 'stream-error',
					content: event.payload.content,
					statusCode: event.payload.statusCode,
					provider: event.payload.provider,
					technicalDetails: truncate(event.payload.technicalDetails, 2000),
				});
			} else if (event.type === 'status' && isRecord(event.payload)) {
				emit({ kind: 'status', message: event.payload.message });
			} else if (event.type === 'tasks-update') {
				emit({ kind: 'tasks-update', payload: event.payload });
			} else {
				emit({ kind: event.type });
			}
		},
		write(record) {
			flushText();
			emit(record);
		},
		async close() {
			if (closed) return;
			flushText();
			for (const [id, info] of toolCallStarts.entries()) {
				emit({
					kind: 'tool-call-unresolved',
					toolCallId: id,
					toolName: info.toolName,
					elapsedMs: Date.now() - info.started,
				});
			}
			emit({ kind: 'log-end', totalToolCalls: toolCallIdx });
			closed = true;
			await new Promise<void>((resolve) => stream.end(() => resolve()));
		},
	};
}

function truncate(value: unknown, max: number): unknown {
	if (value === null || value === undefined) return value;
	try {
		const str = typeof value === 'string' ? value : JSON.stringify(value);
		if (str.length <= max) return value;
		return str.substring(0, max) + '... [truncated]';
	} catch {
		return '<unserializable>';
	}
}

async function safeSettle<T>(value: Promise<T> | undefined): Promise<T | undefined> {
	if (!value) return undefined;
	try {
		return await value;
	} catch {
		return undefined;
	}
}
