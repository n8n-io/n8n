import type { Logger } from '@n8n/backend-common';
import {
	releaseTraceClient,
	type InstanceAiTraceContext,
	type ManagedBackgroundTask,
	type ModelConfig,
} from '@n8n/instance-ai';

import { TraceReplayState } from '../trace-replay-state';

export interface MessageTraceFinalization {
	status: 'completed' | 'cancelled' | 'error';
	outputText?: string;
	reason?: string;
	modelId?: ModelConfig;
	outputs?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	error?: string;
}

type TraceContextEntry = {
	threadId: string;
	messageGroupId?: string;
	tracing: InstanceAiTraceContext;
	traceSlug?: string;
};

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export class InstanceAiTraceService {
	private readonly traceContextsByRunId = new Map<string, TraceContextEntry>();

	private readonly traceReplay = new TraceReplayState();

	constructor(private readonly logger: Pick<Logger, 'warn'>) {}

	storeTraceContext(
		runId: string,
		threadId: string,
		tracing: InstanceAiTraceContext,
		messageGroupId?: string,
	): void {
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

	getLangsmithAnchor(
		runId: string,
	): { langsmithRunId: string | undefined; langsmithTraceId: string | undefined } | undefined {
		const tracing = this.traceContextsByRunId.get(runId)?.tracing;
		if (!tracing) return undefined;
		return {
			langsmithRunId: tracing.rootRun.id,
			langsmithTraceId: tracing.rootRun.traceId,
		};
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

		const outputs = {
			status: options.status,
			runId,
			...(options.outputText ? { response: options.outputText } : {}),
			...(options.reason ? { reason: options.reason } : {}),
		};

		const metadata = {
			final_status: options.status,
			...(options.modelId !== undefined ? { model_id: options.modelId } : {}),
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
		this.traceReplay.clearEvents(slug);
	}

	getThreadIdsWithTraces(): Set<string> {
		return new Set([...this.traceContextsByRunId.values()].map((entry) => entry.threadId));
	}

	clear(): void {
		this.traceContextsByRunId.clear();
	}
}
