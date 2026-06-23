import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import {
	continueInstanceAiTraceContext,
	releaseTraceClient,
	submitLangsmithUserFeedback,
	type InstanceAiTraceContext,
	type ManagedBackgroundTask,
	type ModelConfig,
	type RunStateRegistry,
	type ServiceProxyConfig,
} from '@n8n/instance-ai';
import { nanoid } from 'nanoid';
import { v5 as uuidv5 } from 'uuid';

import { N8N_VERSION, WORKFLOW_SDK_VERSION } from '@/constants';
import type { AiService } from '@/services/ai.service';
import { ProxyTokenManager } from '@/services/proxy-token-manager';

import type { InProcessEventBus } from '../event-bus/in-process-event-bus';
import {
	buildInstanceAiRunTraceMetadata,
	type InstanceAiRunTraceMetadataOptions,
} from '../run-trace-metadata';
import type { DbSnapshotStorage } from '../storage/db-snapshot-storage';
import { TraceReplayState } from '../trace-replay-state';

const ORCHESTRATOR_AGENT_ID = 'agent-001';

// Stable UUID namespace for deterministic feedback IDs. Submitting the same
// (key, responseId) pair twice produces the same feedback UUID so LangSmith
// upserts the record (thumbs-down → later text comment = one record, not two).
const INSTANCE_AI_FEEDBACK_NAMESPACE = 'c5be4c87-5b6e-49ed-afe1-9c5c1f99a5c0';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export interface MessageTraceFinalization {
	status: 'completed' | 'cancelled' | 'error' | 'suspended';
	outputText?: string;
	reason?: string;
	modelId?: ModelConfig;
	outputs?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	error?: string;
}

export type OrchestratorResumeReason =
	| 'approval'
	| 'background_task_completed'
	| 'workflow_verification'
	| 'workflow_setup'
	| 'planned_checkpoint'
	| 'replan'
	| 'synthesize';

// The slice of each collaborator the tracing service actually uses. Anchored to
// the concrete types via `Pick` so the signatures stay in sync with the source.
export type InstanceAiTracingEventBus = Pick<InProcessEventBus, 'getEventsForRun'>;

export type InstanceAiTracingRunState = Pick<RunStateRegistry<User>, 'attachTracing'>;

export type InstanceAiTracingSnapshotStorage = Pick<DbSnapshotStorage, 'findLangsmithAnchor'>;

export type InstanceAiTracingAiService = Pick<AiService, 'isProxyEnabled' | 'getClient'>;

export type InstanceAiTracingServiceOptions = {
	logger: Logger;
	eventBus: InstanceAiTracingEventBus;
	runState: InstanceAiTracingRunState;
	dbSnapshotStorage: InstanceAiTracingSnapshotStorage;
	aiService: InstanceAiTracingAiService;
};

/**
 * Owns the LangSmith trace-context lifecycle for Instance AI runs.
 *
 * Holds the in-memory registry of per-run trace contexts (keyed by the n8n run
 * ID that started an orchestration turn) and the test-only trace replay state.
 * Responsible for creating resume trace contexts, finalizing message- and
 * run-level trace roots, releasing trace clients, and submitting LangSmith user
 * feedback. Collaborators (run state, event bus, snapshot storage, AI service)
 * are supplied via the options bag because the run-context registry it manages
 * is process-local and not suitable for dependency injection.
 */
export class InstanceAiTracingService {
	/** Trace contexts keyed by the n8n run ID that started the orchestration turn. */
	private readonly traceContextsByRunId = new Map<
		string,
		{
			threadId: string;
			messageGroupId?: string;
			tracing: InstanceAiTraceContext;
			traceSlug?: string;
		}
	>();

	/** Test-only trace replay state (slugs, events, shared TraceIndex/IdRemapper). */
	private readonly traceReplay = new TraceReplayState();

	private readonly logger: Logger;

	private readonly eventBus: InstanceAiTracingEventBus;

	private readonly runState: InstanceAiTracingRunState;

	private readonly dbSnapshotStorage: InstanceAiTracingSnapshotStorage;

	private readonly aiService: InstanceAiTracingAiService;

	constructor(options: InstanceAiTracingServiceOptions) {
		this.logger = options.logger;
		this.eventBus = options.eventBus;
		this.runState = options.runState;
		this.dbSnapshotStorage = options.dbSnapshotStorage;
		this.aiService = options.aiService;
	}

	storeTraceContext(
		runId: string,
		threadId: string,
		tracing: InstanceAiTraceContext,
		messageGroupId?: string,
	): void {
		const existing = this.traceContextsByRunId.get(runId);
		if (
			existing?.tracing.traceWriter &&
			existing.traceSlug &&
			existing.tracing.traceWriter !== tracing.traceWriter
		) {
			this.traceReplay.preserveWriterEvents(
				existing.traceSlug,
				existing.tracing.traceWriter.getEvents(),
			);
		}

		this.traceContextsByRunId.set(runId, {
			threadId,
			messageGroupId,
			tracing,
			traceSlug: this.traceReplay.getActiveSlug(),
		});
	}

	getTraceContext(runId: string): InstanceAiTraceContext | undefined {
		return this.traceContextsByRunId.get(runId)?.tracing;
	}

	getMessageGroupId(runId: string): string | undefined {
		return this.traceContextsByRunId.get(runId)?.messageGroupId;
	}

	getTrackedThreadIds(): string[] {
		return [...this.traceContextsByRunId.values()].map((entry) => entry.threadId);
	}

	clear(): void {
		this.traceContextsByRunId.clear();
	}

	getTraceContextForContinuation(
		threadId: string,
		messageGroupId?: string,
	): InstanceAiTraceContext | undefined {
		const entries = [...this.traceContextsByRunId.values()].reverse();
		const sameGroup =
			messageGroupId === undefined
				? undefined
				: entries.find(
						(entry) => entry.threadId === threadId && entry.messageGroupId === messageGroupId,
					)?.tracing;
		return sameGroup ?? entries.find((entry) => entry.threadId === threadId)?.tracing;
	}

	async createOrchestratorResumeTraceContext(options: {
		baseTracing?: InstanceAiTraceContext;
		threadId: string;
		messageId: string;
		messageGroupId?: string;
		runId: string;
		userId: string;
		modelId?: ModelConfig;
		input: Record<string, unknown>;
		proxyConfig?: ServiceProxyConfig;
		resumeReason: OrchestratorResumeReason;
		metadata?: Record<string, unknown>;
	}): Promise<InstanceAiTraceContext | undefined> {
		const baseTracing =
			options.baseTracing ??
			this.getTraceContextForContinuation(options.threadId, options.messageGroupId);
		if (!baseTracing) return undefined;

		const tracing = await continueInstanceAiTraceContext(baseTracing, {
			threadId: options.threadId,
			messageId: options.messageId,
			messageGroupId: options.messageGroupId,
			runId: options.runId,
			userId: options.userId,
			modelId: options.modelId,
			input: options.input,
			proxyConfig: options.proxyConfig ?? baseTracing?.proxyConfig,
			metadata: {
				resume_reason: options.resumeReason,
				agent_id: ORCHESTRATOR_AGENT_ID,
				...options.metadata,
			},
			n8nVersion: N8N_VERSION,
			workflowSdkVersion: WORKFLOW_SDK_VERSION,
		});

		if (tracing) {
			await this.configureTraceReplayMode(tracing);
			this.storeTraceContext(options.runId, options.threadId, tracing, options.messageGroupId);
			this.runState.attachTracing(options.threadId, tracing);
		}

		return tracing;
	}

	async configureTraceReplayMode(tracing: InstanceAiTraceContext): Promise<void> {
		await this.traceReplay.configureReplayMode(tracing);
	}

	async finalizeMessageTraceRoot(
		runId: string,
		tracing: InstanceAiTraceContext,
		options: MessageTraceFinalization,
	): Promise<void> {
		if (tracing.rootRun.endTime) return;

		const outputs = options.outputs ?? {
			status: options.status,
			runId,
			...(options.outputText ? { response: options.outputText } : {}),
			...(options.reason ? { reason: options.reason } : {}),
		};
		const metadata = {
			final_status: options.status,
			...(options.modelId !== undefined ? { model_id: options.modelId } : {}),
			...options.metadata,
		};

		try {
			await tracing.finishRun(tracing.rootRun, {
				outputs,
				metadata,
				...(options.error
					? { error: options.error }
					: options.status === 'error' && options.reason
						? { error: options.reason }
						: {}),
			});
		} catch (error) {
			this.logger.warn('Failed to finalize Instance AI message trace root', {
				runId,
				threadId: tracing.rootRun.metadata?.thread_id,
				error: getErrorMessage(error),
			});
		} finally {
			releaseTraceClient(tracing.rootRun.traceId);
		}
	}

	async maybeFinalizeRunTraceRoot(runId: string, options: MessageTraceFinalization): Promise<void> {
		const tracing = this.getTraceContext(runId);
		if (!tracing) return;
		await this.finalizeMessageTraceRoot(runId, tracing, options);
	}

	buildMessageTraceMetadata(
		threadId: string,
		runId: string,
		options: InstanceAiRunTraceMetadataOptions,
	): Record<string, unknown> {
		const traceOptions = {
			status: options.status,
			...(options.cancellationReason !== undefined
				? { cancellationReason: options.cancellationReason }
				: {}),
			...(options.runTimeout !== undefined ? { runTimeout: options.runTimeout } : {}),
		};

		return {
			completion_source: 'orchestrator',
			...buildInstanceAiRunTraceMetadata(
				this.eventBus.getEventsForRun(threadId, runId),
				traceOptions,
			),
		};
	}

	async finalizeRemainingMessageTraceRoots(
		threadId: string,
		options: MessageTraceFinalization,
	): Promise<void> {
		const finalizedMessageRuns = new Set<string>();

		for (const [runId, entry] of this.traceContextsByRunId) {
			if (entry.threadId !== threadId) continue;
			if (finalizedMessageRuns.has(entry.tracing.rootRun.id)) continue;

			finalizedMessageRuns.add(entry.tracing.rootRun.id);
			await this.finalizeMessageTraceRoot(runId, entry.tracing, options);
		}
	}

	deleteTraceContextsForThread(threadId: string): void {
		for (const [runId, entry] of this.traceContextsByRunId) {
			if (entry.threadId === threadId) {
				releaseTraceClient(entry.tracing.rootRun.traceId);
				// Preserve recorded trace events in the slug-scoped store
				// so the test fixture teardown can still retrieve them via GET.
				if (entry.tracing.traceWriter && entry.traceSlug) {
					this.traceReplay.preserveWriterEvents(
						entry.traceSlug,
						entry.tracing.traceWriter.getEvents(),
					);
				}
				this.traceContextsByRunId.delete(runId);
			}
		}
	}

	private deleteTraceContextsForSlug(slug: string): void {
		for (const [runId, entry] of this.traceContextsByRunId) {
			if (entry.traceSlug === slug) {
				releaseTraceClient(entry.tracing.rootRun.traceId);
				this.traceContextsByRunId.delete(runId);
			}
		}
	}

	clearTraceContextsForTest(): void {
		for (const entry of this.traceContextsByRunId.values()) {
			releaseTraceClient(entry.tracing.rootRun.traceId);
		}
		this.traceContextsByRunId.clear();
	}

	async finalizeDetachedTraceRun(
		taskId: string,
		traceContext: InstanceAiTraceContext | undefined,
		options: {
			status: 'completed' | 'failed' | 'cancelled';
			outputs?: Record<string, unknown>;
			error?: string;
			metadata?: Record<string, unknown>;
		},
	): Promise<void> {
		if (!traceContext) return;

		try {
			if (
				traceContext.actorRun.id !== traceContext.rootRun.id &&
				traceContext.actorRun.endTime === undefined
			) {
				await traceContext.finishRun(traceContext.actorRun, {
					outputs: {
						status: options.status,
						...options.outputs,
					},
					metadata: {
						final_status: options.status,
						...options.metadata,
					},
					...(options.error ? { error: options.error } : {}),
				});
			}
			await traceContext.finishRun(traceContext.rootRun, {
				outputs: {
					status: options.status,
					...options.outputs,
				},
				metadata: {
					final_status: options.status,
					...options.metadata,
				},
				...(options.error ? { error: options.error } : {}),
			});
		} catch (error) {
			this.logger.warn('Failed to finalize Instance AI detached trace run', {
				taskId,
				traceRunId: traceContext.rootRun.id,
				error: getErrorMessage(error),
			});
		} finally {
			releaseTraceClient(traceContext.rootRun.traceId);
		}
	}

	async finalizeRunTracing(
		runId: string,
		tracing: InstanceAiTraceContext | undefined,
		options: MessageTraceFinalization,
	): Promise<void> {
		if (!tracing) return;
		if (tracing.actorRun.endTime) return;

		const outputs = options.outputs ?? {
			status: options.status,
			runId,
			...(options.outputText ? { response: options.outputText } : {}),
			...(options.reason ? { reason: options.reason } : {}),
		};

		const metadata = {
			final_status: options.status,
			...(options.modelId !== undefined ? { model_id: options.modelId } : {}),
			...options.metadata,
		};

		try {
			await tracing.finishRun(tracing.actorRun, {
				outputs,
				metadata,
				...(options.status === 'error' && options.reason ? { error: options.reason } : {}),
			});
		} catch (error) {
			this.logger.warn('Failed to finalize Instance AI run tracing', {
				runId,
				threadId: tracing.actorRun.metadata?.thread_id,
				error: getErrorMessage(error),
			});
		}
	}

	async finalizeBackgroundTaskTracing(
		task: ManagedBackgroundTask,
		status: 'completed' | 'failed' | 'cancelled',
	): Promise<void> {
		await this.finalizeDetachedTraceRun(task.taskId, task.traceContext, {
			status,
			outputs: {
				taskId: task.taskId,
				agentId: task.agentId,
				role: task.role,
				...(task.result ? { result: task.result } : {}),
			},
			...(status === 'failed' && task.error ? { error: task.error } : {}),
			metadata: {
				...(task.plannedTaskId ? { planned_task_id: task.plannedTaskId } : {}),
				...(task.workItemId ? { work_item_id: task.workItemId } : {}),
			},
		});
	}

	async submitLangsmithFeedback(
		user: User,
		threadId: string,
		responseId: string,
		payload: { rating: 'up' | 'down'; comment?: string },
	): Promise<void> {
		const anchor = await this.dbSnapshotStorage.findLangsmithAnchor(threadId, responseId);
		if (!anchor) {
			this.logger.debug('No LangSmith anchor for feedback; skipping annotation', {
				threadId,
				responseId,
			});
			return;
		}

		let tracingProxyConfig: ServiceProxyConfig | undefined;
		if (this.aiService.isProxyEnabled()) {
			try {
				const client = await this.aiService.getClient();
				const baseUrl = client.getApiProxyBaseUrl();
				const manager = new ProxyTokenManager(
					async () =>
						await client.getBuilderApiProxyToken({ id: user.id }, { userMessageId: nanoid() }),
				);
				tracingProxyConfig = {
					apiUrl: baseUrl + '/langsmith',
					getAuthHeaders: async () => await manager.getAuthHeaders(),
				};
			} catch (error) {
				this.logger.warn('Failed to build LangSmith proxy config for feedback', {
					threadId,
					responseId,
					error: getErrorMessage(error),
				});
				return;
			}
		}

		const key = 'user_score';
		const feedbackId = uuidv5(`${key}:${responseId}`, INSTANCE_AI_FEEDBACK_NAMESPACE);

		try {
			await submitLangsmithUserFeedback({
				langsmithRunId: anchor.langsmithRunId,
				langsmithTraceId: anchor.langsmithTraceId,
				key,
				score: payload.rating === 'up' ? 1 : 0,
				value: payload.rating,
				comment: payload.comment,
				feedbackId,
				sourceInfo: {
					thread_id: threadId,
					response_id: responseId,
					user_id: user.id,
					rating: payload.rating,
				},
				proxyConfig: tracingProxyConfig,
			});
		} catch (error) {
			this.logger.warn('Failed to submit LangSmith feedback', {
				threadId,
				responseId,
				error: getErrorMessage(error),
			});
		}
	}

	// ── Test-only trace replay API ───────────────────────────────────────────

	loadTraceEvents(slug: string, events: unknown[]): void {
		this.traceReplay.loadEvents(slug, events);
	}

	getTraceEvents(slug: string): unknown[] {
		return this.traceReplay.getEventsWithWriterFallback(slug, this.traceContextsByRunId.values());
	}

	activateTraceSlug(slug: string): void {
		this.traceReplay.activateSlug(slug);
	}

	clearTraceEvents(slug: string): void {
		this.deleteTraceContextsForSlug(slug);
		this.traceReplay.clearEvents(slug);
	}
}
