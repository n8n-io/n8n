import type { InstanceAiAgentNode, InstanceAiEvent } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import {
	InstanceAiTerminalResponseGuard,
	orchestratorAgentId,
	TerminalOutcomeStorage,
	type InstanceAiTraceContext,
	type ManagedBackgroundTask,
	type PatchableThreadMemory,
	type RunStateRegistry,
	type TerminalOutcome,
	type TerminalResponseDecision,
	type TerminalResponseStatus,
	type WorkSummary,
} from '@n8n/instance-ai';

import type { Telemetry } from '@/telemetry';

import type { InProcessEventBus } from './event-bus/in-process-event-bus';
import type { DbSnapshotStorage } from './storage/db-snapshot-storage';
import type { SuspendedThreadPersistenceService } from './suspended-thread-persistence.service';
import type {
	InstanceAiTracingService,
	MessageTraceFinalization,
} from './tracing/instance-ai-tracing.service';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function getBackgroundOutcomeResponseId(outcome: TerminalOutcome): string {
	return `background-outcome:${outcome.id}`;
}

function createTerminalOutcomeAgentTree(
	outcome: TerminalOutcome,
	responseId: string,
): InstanceAiAgentNode {
	return {
		agentId: orchestratorAgentId(outcome.runId),
		role: 'orchestrator',
		status:
			outcome.status === 'cancelled'
				? 'cancelled'
				: outcome.status === 'failed'
					? 'error'
					: 'completed',
		textContent: outcome.userFacingMessage,
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [{ type: 'text', content: outcome.userFacingMessage, responseId }],
	};
}

function appendTerminalOutcomeToAgentTree(
	tree: InstanceAiAgentNode,
	outcome: TerminalOutcome,
	responseId: string,
): { tree: InstanceAiAgentNode; appended: boolean } {
	const text = outcome.userFacingMessage.trim();
	if (!text) return { tree, appended: false };

	const alreadyInTimeline = tree.timeline.some(
		(entry) => entry.type === 'text' && entry.responseId === responseId,
	);
	if (alreadyInTimeline) {
		return { tree, appended: false };
	}

	return {
		appended: true,
		tree: {
			...tree,
			textContent: tree.textContent ? `${tree.textContent}\n\n${outcome.userFacingMessage}` : text,
			timeline: [
				...tree.timeline,
				{ type: 'text', content: outcome.userFacingMessage, responseId },
			],
		},
	};
}

// The slice of each collaborator the terminal-outcome coordinator actually
// uses. Anchored to the concrete types via `Pick` so the signatures stay in
// sync with the source.
export type InstanceAiTerminalOutcomeEventBus = Pick<
	InProcessEventBus,
	'getEventsForRun' | 'getEventsForRuns' | 'publish'
>;

export type InstanceAiTerminalOutcomeSnapshotStorage = Pick<
	DbSnapshotStorage,
	'getLatest' | 'save' | 'updateLast'
>;

export type InstanceAiTerminalOutcomeTelemetry = Pick<Telemetry, 'track'>;

export type InstanceAiTerminalOutcomeRunState = Pick<
	RunStateRegistry<User>,
	'getRunIdsForMessageGroup' | 'cancelThread'
>;

export type InstanceAiTerminalOutcomeSuspendedThreads = Pick<
	SuspendedThreadPersistenceService,
	'dropPendingConfirmationsForThread'
>;

export type InstanceAiTerminalOutcomeTracing = Pick<
	InstanceAiTracingService,
	'finalizeRunTracing' | 'buildMessageTraceMetadata'
>;

export interface InstanceAiTerminalOutcomeServiceOptions {
	eventBus: InstanceAiTerminalOutcomeEventBus;
	dbSnapshotStorage: InstanceAiTerminalOutcomeSnapshotStorage;
	agentMemory: PatchableThreadMemory;
	telemetry: InstanceAiTerminalOutcomeTelemetry;
	logger: Logger;
	runState: InstanceAiTerminalOutcomeRunState;
	suspendedThreads: InstanceAiTerminalOutcomeSuspendedThreads;
	tracing: InstanceAiTerminalOutcomeTracing;
	/**
	 * Publishes the run-finish event plus the success heartbeat. Owned by the
	 * run loop (`InstanceAiService`), which also emits it on the foreground path.
	 */
	publishRunFinish: (
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		reason?: string,
	) => void;
	/**
	 * Persists the orchestrator agent-tree snapshot. Owned by the run loop until
	 * snapshot persistence is extracted into its own collaborator.
	 */
	saveAgentTreeSnapshot: (
		threadId: string,
		runId: string,
		snapshotStorage: DbSnapshotStorage,
	) => Promise<void>;
}

/**
 * Owns the terminal-response guard and the durable replay of background task
 * outcomes for Instance AI conversations.
 *
 * Two responsibilities live here:
 *
 *  1. **Terminal-response guard.** Whenever a run reaches a terminal state
 *     (completed / cancelled / errored) or starts waiting on a confirmation,
 *     it consults {@link InstanceAiTerminalResponseGuard} against the run's
 *     emitted events and publishes a fallback line when the agent went silent,
 *     suppresses duplicate completions, and flags malformed confirmations.
 *
 *  2. **Terminal-outcome durability.** Background tasks finish out of band from
 *     the foreground run, so their user-facing summary is persisted to
 *     {@link TerminalOutcomeStorage} and the conversation snapshot, then
 *     replayed on reconnect so a closed SSE stream never drops the result.
 */
export class InstanceAiTerminalOutcomeService {
	private readonly pendingTerminalOutcomes = new Map<string, TerminalOutcome>();

	private terminalOutcomeStorage?: TerminalOutcomeStorage;

	private readonly eventBus: InstanceAiTerminalOutcomeEventBus;

	private readonly dbSnapshotStorage: InstanceAiTerminalOutcomeSnapshotStorage;

	private readonly agentMemory: PatchableThreadMemory;

	private readonly telemetry: InstanceAiTerminalOutcomeTelemetry;

	private readonly logger: Logger;

	private readonly runState: InstanceAiTerminalOutcomeRunState;

	private readonly suspendedThreads: InstanceAiTerminalOutcomeSuspendedThreads;

	private readonly tracing: InstanceAiTerminalOutcomeTracing;

	private readonly publishRunFinish: InstanceAiTerminalOutcomeServiceOptions['publishRunFinish'];

	private readonly saveAgentTreeSnapshot: InstanceAiTerminalOutcomeServiceOptions['saveAgentTreeSnapshot'];

	constructor(options: InstanceAiTerminalOutcomeServiceOptions) {
		this.eventBus = options.eventBus;
		this.dbSnapshotStorage = options.dbSnapshotStorage;
		this.agentMemory = options.agentMemory;
		this.telemetry = options.telemetry;
		this.logger = options.logger;
		this.runState = options.runState;
		this.suspendedThreads = options.suspendedThreads;
		this.tracing = options.tracing;
		this.publishRunFinish = options.publishRunFinish;
		this.saveAgentTreeSnapshot = options.saveAgentTreeSnapshot;
	}

	evaluateTerminalResponse(
		threadId: string,
		runId: string,
		status: Exclude<TerminalResponseStatus, 'waiting'>,
		options: {
			messageGroupId?: string;
			correlationId?: string;
			workSummary?: WorkSummary;
			errorMessage?: string;
			suppressCompletedFallback?: boolean;
		} = {},
	): TerminalResponseDecision | undefined {
		const guard = new InstanceAiTerminalResponseGuard({
			runId,
			rootAgentId: orchestratorAgentId(runId),
			messageGroupId: options.messageGroupId,
			correlationId: options.correlationId,
		});
		const decision = guard.evaluateTerminal(
			this.getTerminalGuardEvents(threadId, runId, options.messageGroupId),
			status,
			{
				workSummary: options.workSummary,
				errorMessage: options.errorMessage,
				suppressCompletedFallback: options.suppressCompletedFallback,
			},
		);
		this.handleTerminalResponseDecision(threadId, runId, decision, options.messageGroupId);
		return decision;
	}

	evaluateWaitingResponse(
		threadId: string,
		runId: string,
		confirmationEvent: Extract<InstanceAiEvent, { type: 'confirmation-request' }> | undefined,
		options: { messageGroupId?: string; correlationId?: string } = {},
	): TerminalResponseDecision | undefined {
		const guard = new InstanceAiTerminalResponseGuard({
			runId,
			rootAgentId: orchestratorAgentId(runId),
			messageGroupId: options.messageGroupId,
			correlationId: options.correlationId,
		});
		const decision = guard.evaluateWaiting(
			this.getTerminalGuardEvents(threadId, runId, options.messageGroupId),
			confirmationEvent,
		);
		this.handleTerminalResponseDecision(threadId, runId, decision, options.messageGroupId);
		return decision;
	}

	private getTerminalGuardEvents(
		threadId: string,
		runId: string,
		messageGroupId?: string,
	): InstanceAiEvent[] {
		if (!messageGroupId) return this.eventBus.getEventsForRun(threadId, runId);

		const groupRunIds = this.runState.getRunIdsForMessageGroup(messageGroupId);
		return groupRunIds.length > 0
			? this.eventBus.getEventsForRuns(threadId, groupRunIds)
			: this.eventBus.getEventsForRun(threadId, runId);
	}

	private handleTerminalResponseDecision(
		threadId: string,
		runId: string,
		decision: TerminalResponseDecision,
		messageGroupId?: string,
	): void {
		this.telemetry.track('instance_ai_terminal_response_decision', {
			thread_id: threadId,
			run_id: runId,
			message_group_id: messageGroupId,
			source: 'terminal_guard',
			status: decision.status,
			action: decision.action,
			reason: decision.reason,
			visibility_source: decision.visibilitySource,
		});

		if (decision.reason === 'completed-after-error') {
			this.logger.warn('completed_after_error_event', {
				threadId,
				runId,
				messageGroupId,
			});
		}

		if (decision.reason === 'confirmation-invalid') {
			this.logger.warn('invalid_confirmation_payload', {
				threadId,
				runId,
				messageGroupId,
			});
		}

		if (decision.action === 'emit' && decision.event) {
			this.eventBus.publish(threadId, decision.event);
		}
	}

	private createTerminalOutcomeStorage(): TerminalOutcomeStorage {
		this.terminalOutcomeStorage ??= new TerminalOutcomeStorage(this.agentMemory);
		return this.terminalOutcomeStorage;
	}

	async finishInvalidConfirmationRun(args: {
		threadId: string;
		runId: string;
		abortController: AbortController;
		snapshotStorage: DbSnapshotStorage;
		tracing?: InstanceAiTraceContext;
	}): Promise<MessageTraceFinalization> {
		this.runState.cancelThread(args.threadId);
		void this.suspendedThreads.dropPendingConfirmationsForThread(args.threadId);
		args.abortController.abort();
		await this.tracing.finalizeRunTracing(args.runId, args.tracing, {
			status: 'error',
			reason: 'invalid_confirmation_payload',
		});
		this.publishRunFinish(
			args.threadId,
			args.runId,
			'errored',
			'I need your input to continue, but I could not display the prompt. Please try again.',
		);
		await this.saveAgentTreeSnapshot(args.threadId, args.runId, args.snapshotStorage);
		return {
			status: 'error',
			reason: 'invalid_confirmation_payload',
			metadata: this.tracing.buildMessageTraceMetadata(args.threadId, args.runId, {
				status: 'error',
			}),
		};
	}

	private buildBackgroundTerminalOutcome(task: ManagedBackgroundTask): TerminalOutcome {
		const status =
			task.status === 'failed' ? 'failed' : task.status === 'cancelled' ? 'cancelled' : 'completed';
		const userFacingMessage =
			status === 'completed'
				? `The background ${task.role} task finished.`
				: status === 'cancelled'
					? `The background ${task.role} task was cancelled.`
					: `The background ${task.role} task failed before I could complete that part.`;

		return {
			id: `${task.messageGroupId ?? task.runId}:${task.taskId}:${status}`,
			threadId: task.threadId,
			runId: task.runId,
			messageGroupId: task.messageGroupId,
			correlationId: task.messageGroupId,
			taskId: task.taskId,
			agentId: task.agentId,
			status,
			userFacingMessage,
			createdAt: new Date().toISOString(),
		};
	}

	async replayUndeliveredTerminalOutcomes(
		threadId: string,
		options: { delivery?: 'snapshot' | 'event' } = {},
	): Promise<void> {
		const storage = this.createTerminalOutcomeStorage();
		const noOutcomes: TerminalOutcome[] = [];
		const persistedOutcomes = await storage.getUndelivered(threadId).catch((error) => {
			this.logger.warn('Failed to load undelivered Instance AI terminal outcomes', {
				threadId,
				error: getErrorMessage(error),
			});
			return noOutcomes;
		});
		const inMemoryOutcomes = [...this.pendingTerminalOutcomes.values()].filter(
			(outcome) => outcome.threadId === threadId,
		);
		const outcomes = new Map<string, TerminalOutcome>();
		for (const outcome of [...persistedOutcomes, ...inMemoryOutcomes]) {
			outcomes.set(outcome.id, outcome);
		}
		const persistedOutcomeIds = new Set(persistedOutcomes.map((outcome) => outcome.id));
		const delivery = options.delivery ?? 'snapshot';

		for (const outcome of outcomes.values()) {
			const responseId = getBackgroundOutcomeResponseId(outcome);
			let snapshotDelivered = false;
			try {
				snapshotDelivered = await this.persistTerminalOutcomeLineToSnapshot(outcome, responseId);
			} catch (error) {
				this.logger.warn('Failed to replay Instance AI terminal outcome', {
					threadId,
					runId: outcome.runId,
					taskId: outcome.taskId,
					error: getErrorMessage(error),
				});
				if (delivery === 'event') {
					const published = this.publishTerminalOutcomeLine(outcome, responseId);
					this.telemetry.track('instance_ai_terminal_response_decision', {
						thread_id: threadId,
						run_id: outcome.runId,
						message_group_id: outcome.messageGroupId,
						task_id: outcome.taskId,
						source: 'terminal_outcome_replay',
						status: outcome.status,
						action: published ? 'replay_event' : 'already-emitted',
						visibility_source: 'background-outcome',
					});
				}
				continue;
			}

			if (!snapshotDelivered) continue;

			let action = 'replay_snapshot';
			if (delivery === 'event') {
				const published = this.publishTerminalOutcomeLine(outcome, responseId);
				action = published ? 'replay_event' : 'already-emitted';
			}

			if (persistedOutcomeIds.has(outcome.id)) {
				await storage
					.markDelivered(threadId, outcome.id, new Date().toISOString())
					.catch((error) => {
						this.logger.warn('Failed to mark Instance AI terminal outcome as delivered', {
							threadId,
							runId: outcome.runId,
							taskId: outcome.taskId,
							error: getErrorMessage(error),
						});
					});
			}
			this.pendingTerminalOutcomes.delete(outcome.id);
			this.telemetry.track('instance_ai_terminal_response_decision', {
				thread_id: threadId,
				run_id: outcome.runId,
				message_group_id: outcome.messageGroupId,
				task_id: outcome.taskId,
				source: 'terminal_outcome_replay',
				status: outcome.status,
				action,
				visibility_source: 'background-outcome',
			});
		}
	}

	private async persistTerminalOutcomeLineToSnapshot(
		outcome: TerminalOutcome,
		responseId: string,
	): Promise<boolean> {
		const snapshot = await this.dbSnapshotStorage.getLatest(outcome.threadId, {
			messageGroupId: outcome.messageGroupId,
			runId: outcome.runId,
		});
		if (!snapshot) {
			await this.dbSnapshotStorage.save(
				outcome.threadId,
				createTerminalOutcomeAgentTree(outcome, responseId),
				outcome.runId,
				{
					messageGroupId: outcome.messageGroupId,
					runIds: [outcome.runId],
				},
			);
			return true;
		}

		const { tree } = appendTerminalOutcomeToAgentTree(snapshot.tree, outcome, responseId);
		const runIds = new Set(snapshot.runIds ?? [snapshot.runId]);
		runIds.add(outcome.runId);
		await this.dbSnapshotStorage.updateLast(outcome.threadId, tree, snapshot.runId, {
			messageGroupId: snapshot.messageGroupId ?? outcome.messageGroupId,
			runIds: [...runIds],
			langsmithRunId: snapshot.langsmithRunId,
			langsmithTraceId: snapshot.langsmithTraceId,
		});
		return true;
	}

	private publishTerminalOutcomeLine(outcome: TerminalOutcome, responseId: string): boolean {
		const alreadyPublished = this.eventBus
			.getEventsForRun(outcome.threadId, outcome.runId)
			.some((event) => event.responseId === responseId);
		if (alreadyPublished) return false;

		this.eventBus.publish(outcome.threadId, {
			type: 'text-delta',
			runId: outcome.runId,
			agentId: orchestratorAgentId(outcome.runId),
			responseId,
			payload: { text: outcome.userFacingMessage },
		});
		return true;
	}

	async recordBackgroundTerminalOutcome(task: ManagedBackgroundTask): Promise<void> {
		const outcome = this.buildBackgroundTerminalOutcome(task);
		let persisted = false;
		try {
			await this.createTerminalOutcomeStorage().upsert(task.threadId, outcome);
			persisted = true;
		} catch (error) {
			this.pendingTerminalOutcomes.set(outcome.id, outcome);
			this.logger.warn('Failed to persist Instance AI terminal outcome', {
				threadId: task.threadId,
				runId: task.runId,
				taskId: task.taskId,
				error: getErrorMessage(error),
			});
			this.telemetry.track('instance_ai_terminal_outcome_persistence_failure', {
				thread_id: task.threadId,
				run_id: task.runId,
				task_id: task.taskId,
				status: outcome.status,
				phase: 'metadata',
			});
		}

		const responseId = getBackgroundOutcomeResponseId(outcome);
		const published = this.publishTerminalOutcomeLine(outcome, responseId);

		this.telemetry.track('instance_ai_terminal_response_decision', {
			thread_id: task.threadId,
			run_id: task.runId,
			message_group_id: task.messageGroupId,
			task_id: task.taskId,
			source: 'background_outcome',
			status: outcome.status,
			action: published ? 'emit' : 'already-emitted',
			visibility_source: 'background-outcome',
		});

		let snapshotDelivered = false;
		try {
			snapshotDelivered = await this.persistTerminalOutcomeLineToSnapshot(outcome, responseId);
		} catch (error) {
			this.logger.warn('Failed to persist Instance AI terminal outcome line to snapshot', {
				threadId: task.threadId,
				runId: task.runId,
				taskId: task.taskId,
				error: getErrorMessage(error),
			});
			this.telemetry.track('instance_ai_terminal_outcome_persistence_failure', {
				thread_id: task.threadId,
				run_id: task.runId,
				task_id: task.taskId,
				status: outcome.status,
				phase: 'snapshot',
			});
		}

		if (!persisted || !snapshotDelivered) return;

		try {
			await this.createTerminalOutcomeStorage().markDelivered(
				task.threadId,
				outcome.id,
				new Date().toISOString(),
			);
			this.pendingTerminalOutcomes.delete(outcome.id);
		} catch (error) {
			this.logger.warn('Failed to mark Instance AI terminal outcome as delivered', {
				threadId: task.threadId,
				runId: task.runId,
				taskId: task.taskId,
				error: getErrorMessage(error),
			});
		}
	}
}
