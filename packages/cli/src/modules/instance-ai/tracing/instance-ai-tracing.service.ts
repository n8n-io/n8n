import type { InstanceAiEvent } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import {
	continueInstanceAiTraceContext,
	orchestratorAgentId,
	releaseTraceClient,
	type BrowserExtensionTraceContext,
	type InstanceAiTraceContext,
	type ModelConfig,
	type ServiceProxyConfig,
} from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';

import { N8N_VERSION, WORKFLOW_SDK_VERSION } from '@/constants';

import {
	buildInstanceAiRunTraceMetadata,
	type InstanceAiRunTraceMetadataOptions,
} from '../run-trace-metadata';
import { TraceReplayState } from '../trace-replay-state';

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
/**
 * Run-event read from the durable log. Async because it flushes the thread's
 * open coalesce buffers and then queries — which is what makes the streamed
 * text of a run visible to `first_visible_state` at all.
 */
export type InstanceAiTracingEventReader = {
	getEventsForRun: (threadId: string, runId: string) => Promise<InstanceAiEvent[]>;
};

export type InstanceAiTracingServiceOptions = {
	logger: Logger;
	eventReader: InstanceAiTracingEventReader;
};

/**
 * Owns the LangSmith trace-context lifecycle for Instance AI runs.
 *
 * Holds the in-memory registry of per-run trace contexts (keyed by the n8n run
 * ID that started an orchestration turn) and the test-only trace replay state.
 * Responsible for creating resume trace contexts, finalizing message- and
 * run-level trace roots, releasing trace clients, and submitting LangSmith user
 * feedback. Collaborators (event reader, event log, AI service)
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

	private readonly eventReader: InstanceAiTracingEventReader;



	constructor(options: InstanceAiTracingServiceOptions) {
		this.logger = options.logger;
		this.eventReader = options.eventReader;
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

	registerTraceContext(
		runId: string,
		threadId: string,
		tracing: InstanceAiTraceContext,
		messageGroupId?: string,
	): void {
		this.storeTraceContext(runId, threadId, tracing, messageGroupId);
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
		browserExtension?: BrowserExtensionTraceContext;
		/** Defer process-local registration until the durable resume claim succeeds. */
		register?: boolean;
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
				agent_id: orchestratorAgentId(options.runId),
				...options.metadata,
			},
			n8nVersion: N8N_VERSION,
			workflowSdkVersion: WORKFLOW_SDK_VERSION,
			browserExtension: options.browserExtension,
		});

		if (tracing) {
			await this.configureTraceReplayMode(tracing);
			if (options.register !== false) {
				this.registerTraceContext(options.runId, options.threadId, tracing, options.messageGroupId);
			}
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

	async buildMessageTraceMetadata(
		threadId: string,
		runId: string,
		options: InstanceAiRunTraceMetadataOptions,
	): Promise<Record<string, unknown>> {
		const traceOptions = {
			status: options.status,
			...(options.cancellationReason !== undefined
				? { cancellationReason: options.cancellationReason }
				: {}),
		};

		// The events read hits the DB under the durable log, and most callers run
		// inside a run's terminal catch block — throwing there would skip
		// run-finish and leave the client spinning until the liveness sweep. This
		// is a trace annotation, not a correctness input, so degrade instead.
		let events: InstanceAiEvent[] = [];
		let eventsUnavailable = false;
		try {
			events = await this.eventReader.getEventsForRun(threadId, runId);
		} catch (error) {
			eventsUnavailable = true;
			this.logger.warn('Failed to read run events for Instance AI trace metadata', {
				runId,
				threadId,
				error: getErrorMessage(error),
			});
		}

		return {
			completion_source: 'orchestrator',
			...buildInstanceAiRunTraceMetadata(events, traceOptions),
			// Without this, a failed read is indistinguishable from a run that
			// genuinely produced nothing — both report `first_visible_state: empty`.
			...(eventsUnavailable ? { first_visible_state_unavailable: true } : {}),
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
