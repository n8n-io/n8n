import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils';
import { UnexpectedError } from 'n8n-workflow';

import type { AgentRunTelemetryType, IAgentConfigurationTelemetryProperties } from '@/interfaces';
import { Telemetry } from '@/telemetry';

import {
	AgentExecutionLogPersistence,
	type AgentExecutionLogTarget,
} from './agent-execution-log-persistence';
import type { AgentExecutionLogPayload } from './agent-execution-log/types';
import { AgentExecutionThread } from './entities/agent-execution-thread.entity';
import { AgentExecution } from './entities/agent-execution.entity';
import type { MessageRecord } from './execution-recorder';
import { N8nMemory } from './integrations/n8n-memory';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import type { AgentExecutionThreadMetadata } from './repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';

export interface RecordMessageParams {
	threadId: string;
	agentId: string;
	agentName: string;
	projectId: string;
	userMessage: string;
	record: MessageRecord;
	/** Set to 'suspended' or 'resumed' for HITL tool call flows. */
	hitlStatus?: 'suspended' | 'resumed';
	/** Where the message originated from, e.g. 'chat', 'slack', 'task'. */
	source?: string;
	/** Optional metadata persisted on the thread when it is first created. */
	threadMetadata?: AgentExecutionThreadMetadata;
	/** When the run was triggered by a scheduled task, the task's id (stamped on the session). */
	taskId?: string;
	/** Published agent_history version that supplied the scheduled task snapshot. */
	taskVersionId?: string;
	/** Backend heartbeat telemetry context for this recorded run. */
	telemetry?: {
		runType: AgentRunTelemetryType;
		configuration: IAgentConfigurationTelemetryProperties;
	};
}

export interface ThreadDetail {
	thread: AgentExecutionThread;
	executions: HydratedAgentExecution[];
}

export interface ThreadListItem extends AgentExecutionThread {
	firstMessage: string | null;
}

export type HydratedAgentExecution = AgentExecution & AgentExecutionLogPayload;

const RECORD_MESSAGE_RETRY_ATTEMPTS = 3;

@Service()
export class AgentExecutionService {
	constructor(
		private readonly logger: Logger,
		private readonly agentExecutionRepository: AgentExecutionRepository,
		private readonly agentExecutionThreadRepository: AgentExecutionThreadRepository,
		private readonly agentExecutionLogPersistence: AgentExecutionLogPersistence,
		private readonly n8nMemory: N8nMemory,
		private readonly telemetry: Telemetry,
	) {}

	/**
	 * Record a single agent run within a thread.
	 * Creates or updates the thread, then inserts one row into agent_execution.
	 */
	async recordMessage(params: RecordMessageParams): Promise<string> {
		const {
			threadId,
			agentId,
			agentName,
			projectId,
			record,
			source,
			hitlStatus,
			threadMetadata,
			taskId,
			taskVersionId,
		} = params;

		// Replace platform mentions (e.g. Slack's <@U0ANB4K6611> or plain @U0ANB4K6611)
		const cleanedMessage = params.userMessage
			.replace(/<@[A-Z0-9]+>/gi, `@${agentName}`)
			.replace(/@[A-Z0-9]{8,}/gi, `@${agentName}`)
			.trim();

		const status: AgentExecution['status'] = record.error ? 'error' : 'success';
		const startedAt = new Date(record.startTime);
		const stoppedAt = new Date(record.startTime + record.duration);
		const executionId = generateNanoId();
		const logRef = { agentId, threadId, executionId };
		const logPayload: AgentExecutionLogPayload = {
			userMessage: cleanedMessage,
			assistantResponse: record.assistantResponse,
			toolCalls: record.toolCalls.length > 0 ? record.toolCalls : null,
			timeline: record.timeline.length > 0 ? record.timeline : null,
			error: record.error,
		};

		const { sizeBytes: logSizeBytes, storedAt: writtenStoredAt } =
			await this.agentExecutionLogPersistence.write(logRef, logPayload);
		const writtenLogTarget: AgentExecutionLogTarget = { ...logRef, storedAt: writtenStoredAt };

		const { thread, created, insertedId } = await (async () => {
			try {
				return await this.runSerializableRecordTransaction(async (tx) => {
					const threadResult = await this.agentExecutionThreadRepository.findOrCreateWithManager(
						tx,
						threadId,
						agentId,
						agentName,
						projectId,
						threadMetadata,
						taskId,
						taskVersionId,
					);

					if (!threadResult.created) {
						await tx.update(AgentExecutionThread, { id: threadId }, { updatedAt: new Date() });
					}

					await tx.insert(AgentExecution, {
						id: executionId,
						threadId,
						status,
						startedAt,
						stoppedAt,
						duration: record.duration,
						model: record.model,
						promptTokens: record.usage?.promptTokens ?? null,
						completionTokens: record.usage?.completionTokens ?? null,
						totalTokens: record.usage?.totalTokens ?? null,
						cost: record.totalCost,
						hitlStatus: hitlStatus ?? null,
						source: source ?? null,
						logStoredAt: writtenStoredAt,
						logSizeBytes,
					});

					if (!threadResult.thread.firstMessage && cleanedMessage) {
						await tx
							.createQueryBuilder()
							.update(AgentExecutionThread)
							.set({ firstMessage: cleanedMessage })
							.where('id = :threadId', { threadId })
							.andWhere('"firstMessage" IS NULL')
							.execute();
					}

					if (record.usage) {
						await this.incrementUsageWithManager(tx, threadId, {
							promptTokens: record.usage.promptTokens,
							completionTokens: record.usage.completionTokens,
							cost: record.totalCost ?? 0,
							duration: record.duration,
						});
					}

					return {
						thread: threadResult.thread,
						created: threadResult.created,
						insertedId: executionId,
					};
				});
			} catch (error) {
				await this.agentExecutionLogPersistence.delete(writtenLogTarget).catch((deleteError) => {
					this.logger.warn('Failed to clean up agent execution log after record failure', {
						agentId,
						threadId,
						executionId,
						error: deleteError instanceof Error ? deleteError.message : String(deleteError),
					});
				});
				throw error;
			}
		})();

		// When a resumed execution completes with usage data, backfill any
		// preceding suspended executions in the same thread that are missing it.
		if (hitlStatus === 'resumed' && record.model) {
			await this.backfillSuspendedExecutions(threadId, record.model);
		}

		if (params.telemetry) {
			try {
				this.telemetry.trackAgentTurnFinished({
					agent_id: agentId,
					thread_id: threadId,
					run_type: params.telemetry.runType,
					turn_status:
						record.error !== null || record.finishReason === 'error' ? 'failed' : 'succeeded',
					configuration: params.telemetry.configuration,
					latency_ms: record.duration,
					cost: record.totalCost ?? 0,
					tool_call_count: record.toolCalls.length,
				});
			} catch (error) {
				this.logger.warn('Failed to track agent execution telemetry', {
					agentId,
					threadId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		this.logger.debug('Recorded agent execution', {
			executionId: insertedId,
			threadId,
			agentId,
			status,
			duration: record.duration,
		});

		if (created || !thread.title) {
			await this.syncTitleFromMemory(threadId, agentId);
		}

		return insertedId;
	}

	private async runSerializableRecordTransaction<T>(
		operation: (tx: EntityManager) => Promise<T>,
	): Promise<T> {
		for (let attempt = 0; ; attempt++) {
			try {
				return await this.agentExecutionRepository.manager.transaction('SERIALIZABLE', operation);
			} catch (error) {
				if (attempt >= RECORD_MESSAGE_RETRY_ATTEMPTS - 1 || !isRetriableRecordWriteError(error)) {
					throw error;
				}
			}
		}
	}

	private async incrementUsageWithManager(
		tx: EntityManager,
		threadId: string,
		usage: { promptTokens: number; completionTokens: number; cost: number; duration: number },
	): Promise<void> {
		const set: Record<string, () => string> = {
			totalPromptTokens: () => '"totalPromptTokens" + :promptTokens',
			totalCompletionTokens: () => '"totalCompletionTokens" + :completionTokens',
		};
		if (usage.cost > 0) {
			set.totalCost = () => '"totalCost" + :cost';
		}
		if (usage.duration > 0) {
			set.totalDuration = () => '"totalDuration" + :duration';
		}

		await tx
			.createQueryBuilder()
			.update(AgentExecutionThread)
			.set(set)
			.where('id = :threadId', { threadId })
			.setParameters(usage)
			.execute();
	}

	/**
	 * Backfill `model` on suspended runs in a thread that don't yet have it.
	 * Called when the resumed run finishes — the model applies to the whole
	 * suspend/resume cycle but only arrives once the resume completes.
	 */
	private async backfillSuspendedExecutions(threadId: string, model: string): Promise<void> {
		const candidates = await this.agentExecutionRepository.findSuspendedWithoutModel(threadId);
		if (candidates.length === 0) return;
		await this.agentExecutionRepository.backfillModel(
			candidates.map((c) => c.id),
			model,
		);
	}

	/**
	 * Try to read the title from the SDK memory thread and sync it to our execution thread.
	 * The SDK's titleGeneration runs fire-and-forget after the first message,
	 * so the title is typically available by the second message.
	 */
	private async syncTitleFromMemory(threadId: string, agentId: string): Promise<void> {
		try {
			const memoryThread = await this.n8nMemory.getImplementation(agentId).getThread(threadId);
			if (memoryThread?.title) {
				const emoji =
					memoryThread.metadata && typeof memoryThread.metadata.emoji === 'string'
						? memoryThread.metadata.emoji
						: null;
				await this.agentExecutionThreadRepository.update(threadId, {
					title: memoryThread.title,
					...(emoji && { emoji }),
				});
			}
		} catch {
			// Memory thread may not exist (agent without memory configured) — ignore
		}
	}

	/**
	 * Delete a thread and all its associated runs. The FK on agent_execution
	 * cascades, so deleting the thread removes the runs in one statement.
	 */
	async deleteThread(projectId: string, agentId: string, threadId: string): Promise<boolean> {
		// Verify ownership before deleting anything
		const thread = await this.agentExecutionThreadRepository.findOneBy({
			id: threadId,
			projectId,
			agentId,
		});
		if (!thread) return false;

		const logTargets = await this.agentExecutionRepository.findLogTargetsByThreadId(threadId);
		await this.agentExecutionThreadRepository.delete({ id: threadId });

		try {
			await this.n8nMemory.getImplementation(agentId).deleteThread(threadId);
		} catch (error) {
			this.logger.warn('Failed to delete SDK memory thread on execution thread delete', {
				agentId,
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		try {
			await this.agentExecutionLogPersistence.delete(
				logTargets.map((target) => ({
					agentId,
					threadId: target.threadId,
					executionId: target.id,
					storedAt: target.logStoredAt,
				})),
			);
		} catch (error) {
			this.logger.warn('Failed to delete agent execution logs on execution thread delete', {
				agentId,
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		return true;
	}

	/**
	 * Get paginated execution threads for an agent.
	 * Each thread is annotated with the first non-empty user message for preview.
	 */
	async getThreads(
		projectId: string,
		agentId: string,
		limit: number,
		cursor?: string,
	): Promise<{ threads: ThreadListItem[]; nextCursor: string | null }> {
		const page = await this.agentExecutionThreadRepository.findByProjectIdPaginated(
			projectId,
			agentId,
			limit,
			cursor,
		);

		if (page.threads.length === 0) {
			return { threads: [], nextCursor: page.nextCursor };
		}

		return {
			...page,
			threads: page.threads.map((t) => ({
				...t,
				firstMessage: t.firstMessage ?? null,
			})),
		};
	}

	/**
	 * Get a thread with all its executions.
	 * Validates projectId and agentId ownership.
	 */
	async getThreadDetail(
		threadId: string,
		projectId: string,
		agentId: string,
	): Promise<ThreadDetail | null> {
		const thread = await this.agentExecutionThreadRepository.findOneBy({ id: threadId });
		if (!thread || !threadBelongsTo(thread, projectId, agentId)) return null;

		const executions = await this.agentExecutionRepository.findByThreadIdOrdered(threadId);
		const hydratedExecutions = await this.hydrateExecutions(agentId, executions);
		return { thread, executions: hydratedExecutions };
	}

	private async hydrateExecutions(
		agentId: string,
		executions: AgentExecution[],
	): Promise<HydratedAgentExecution[]> {
		const targets = executions.map((execution) => ({
			agentId,
			threadId: execution.threadId,
			executionId: execution.id,
			storedAt: execution.logStoredAt,
		}));
		const bundles = await this.agentExecutionLogPersistence.readMany(targets);

		return executions.map((execution) => {
			const bundle = bundles.get(execution.id);
			if (!bundle) {
				this.logger.error('Missing agent execution log payload', {
					agentId,
					threadId: execution.threadId,
					executionId: execution.id,
					storedAt: execution.logStoredAt,
				});
				throw new UnexpectedError('Agent execution log payload is missing');
			}

			return Object.assign(execution, {
				userMessage: bundle.userMessage,
				assistantResponse: bundle.assistantResponse,
				toolCalls: bundle.toolCalls,
				timeline: bundle.timeline,
				error: bundle.error,
			});
		});
	}

	/**
	 * Fetch a thread by id without scoping. Callers accepting a client-supplied
	 * threadId MUST verify ownership with {@link threadBelongsTo} before use to
	 * prevent IDOR.
	 */
	async findThreadById(threadId: string): Promise<AgentExecutionThread | null> {
		return await this.agentExecutionThreadRepository.findOneBy({ id: threadId });
	}
}

/**
 * True if `thread` belongs to the given project and agent.
 * Returns false for threads from a different project/agent so the caller can
 * reject the request instead of leaking/modifying unrelated thread data.
 */
export function threadBelongsTo(
	thread: AgentExecutionThread,
	projectId: string,
	agentId: string,
): boolean {
	if (thread.projectId !== projectId) return false;
	if (thread.agentId !== agentId) return false;
	return true;
}

function isRetriableRecordWriteError(error: unknown): boolean {
	if (!(error instanceof Error) || !('driverError' in error)) return false;
	const { driverError } = error;
	if (typeof driverError !== 'object' || driverError === null || !('code' in driverError)) {
		return false;
	}

	const { code } = driverError;
	return (
		typeof code === 'string' &&
		(code === '40001' || code === '40P01' || code === 'SQLITE_BUSY' || code === 'SQLITE_LOCKED')
	);
}
