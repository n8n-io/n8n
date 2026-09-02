import type { InstanceAiErrorEvent, InstanceAiEvent } from '@n8n/api-types';
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

import { OperationalError } from 'n8n-workflow';

import type { Telemetry } from '@/telemetry';

import type { InProcessEventBus } from './event-bus/in-process-event-bus';
import type { InstanceAiErrorReporterService } from './instance-ai-error-reporter.service';
import type { SuspendedThreadPersistenceService } from './suspended-thread-persistence.service';
import type {
	InstanceAiTracingService,
	MessageTraceFinalization,
} from './tracing/instance-ai-tracing.service';

type InstanceAiErrorCode = NonNullable<InstanceAiErrorEvent['payload']['code']>;

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function getBackgroundOutcomeResponseId(outcome: TerminalOutcome): string {
	return `background-outcome:${outcome.id}`;
}

// The slice of each collaborator the terminal-outcome coordinator actually
// uses. Anchored to the concrete types via `Pick` so the signatures stay in
// sync with the source.
// Reads are async: the host injects an adapter that flushes the thread's drain
// and then queries the durable log.
export type InstanceAiTerminalOutcomeEventBus = Pick<InProcessEventBus, 'publish'> & {
	getEventsForRun(threadId: string, runId: string): InstanceAiEvent[] | Promise<InstanceAiEvent[]>;
	getEventsForRuns(
		threadId: string,
		runIds: string[],
	): InstanceAiEvent[] | Promise<InstanceAiEvent[]>;
};

export type InstanceAiTerminalOutcomeTelemetry = Pick<Telemetry, 'track'>;

export type InstanceAiTerminalOutcomeErrorReporter = Pick<InstanceAiErrorReporterService, 'report'>;

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
	agentMemory: PatchableThreadMemory;
	telemetry: InstanceAiTerminalOutcomeTelemetry;
	errorReporter: InstanceAiTerminalOutcomeErrorReporter;
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
 *     {@link TerminalOutcomeStorage} and published as a durable text-block, then
 *     replayed on reconnect so a closed SSE stream never drops the result.
 */
export class InstanceAiTerminalOutcomeService {
	private readonly pendingTerminalOutcomes = new Map<string, TerminalOutcome>();

	private terminalOutcomeStorage?: TerminalOutcomeStorage;

	private readonly eventBus: InstanceAiTerminalOutcomeEventBus;

	private readonly agentMemory: PatchableThreadMemory;

	private readonly telemetry: InstanceAiTerminalOutcomeTelemetry;

	private readonly errorReporter: InstanceAiTerminalOutcomeErrorReporter;

	private readonly logger: Logger;

	private readonly runState: InstanceAiTerminalOutcomeRunState;

	private readonly suspendedThreads: InstanceAiTerminalOutcomeSuspendedThreads;

	private readonly tracing: InstanceAiTerminalOutcomeTracing;

	private readonly publishRunFinish: InstanceAiTerminalOutcomeServiceOptions['publishRunFinish'];

	constructor(options: InstanceAiTerminalOutcomeServiceOptions) {
		this.eventBus = options.eventBus;
		this.agentMemory = options.agentMemory;
		this.telemetry = options.telemetry;
		this.errorReporter = options.errorReporter;
		this.logger = options.logger;
		this.runState = options.runState;
		this.suspendedThreads = options.suspendedThreads;
		this.tracing = options.tracing;
		this.publishRunFinish = options.publishRunFinish;
	}

	async evaluateTerminalResponse(
		threadId: string,
		runId: string,
		status: Exclude<TerminalResponseStatus, 'waiting'>,
		options: {
			messageGroupId?: string;
			correlationId?: string;
			workSummary?: WorkSummary;
			errorMessage?: string;
			errorCode?: InstanceAiErrorCode;
			suppressCompletedFallback?: boolean;
		} = {},
	): Promise<TerminalResponseDecision | undefined> {
		const guard = new InstanceAiTerminalResponseGuard({
			runId,
			rootAgentId: orchestratorAgentId(runId),
			messageGroupId: options.messageGroupId,
			correlationId: options.correlationId,
		});
		const decision = guard.evaluateTerminal(
			await this.getTerminalGuardEvents(threadId, runId, options.messageGroupId),
			status,
			{
				workSummary: options.workSummary,
				errorMessage: options.errorMessage,
				errorCode: options.errorCode,
				suppressCompletedFallback: options.suppressCompletedFallback,
			},
		);
		this.handleTerminalResponseDecision(threadId, runId, decision, options.messageGroupId);
		return decision;
	}

	async evaluateWaitingResponse(
		threadId: string,
		runId: string,
		confirmationEvent: Extract<InstanceAiEvent, { type: 'confirmation-request' }> | undefined,
		options: { messageGroupId?: string; correlationId?: string } = {},
	): Promise<TerminalResponseDecision | undefined> {
		const guard = new InstanceAiTerminalResponseGuard({
			runId,
			rootAgentId: orchestratorAgentId(runId),
			messageGroupId: options.messageGroupId,
			correlationId: options.correlationId,
		});
		const decision = guard.evaluateWaiting(
			await this.getTerminalGuardEvents(threadId, runId, options.messageGroupId),
			confirmationEvent,
		);
		this.handleTerminalResponseDecision(threadId, runId, decision, options.messageGroupId);
		return decision;
	}

	private async getTerminalGuardEvents(
		threadId: string,
		runId: string,
		messageGroupId?: string,
	): Promise<InstanceAiEvent[]> {
		if (!messageGroupId) return await this.eventBus.getEventsForRun(threadId, runId);

		const groupRunIds = this.runState.getRunIdsForMessageGroup(messageGroupId);
		return groupRunIds.length > 0
			? await this.eventBus.getEventsForRuns(threadId, groupRunIds)
			: await this.eventBus.getEventsForRun(threadId, runId);
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

		// The run reported success while answering nothing, so no error path fires
		// and the fallback line is all the user gets. Alert on it: a stall that only
		// shows up as a generic placeholder is otherwise invisible to us.
		if (decision.reason === 'completed-silent') {
			this.errorReporter.report(
				new OperationalError('Instance AI run completed without a final response'),
				{
					component: 'instance-ai-terminal-guard',
					severity: 'warning',
					threadId,
					runId,
					messageGroupId,
				},
			);
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
		return {
			status: 'error',
			reason: 'invalid_confirmation_payload',
			metadata: await this.tracing.buildMessageTraceMetadata(args.threadId, args.runId, {
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

	async replayUndeliveredTerminalOutcomes(threadId: string): Promise<void> {
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

		for (const outcome of outcomes.values()) {
			const responseId = getBackgroundOutcomeResponseId(outcome);
			let delivery: 'published' | 'already-emitted' | 'dropped' = 'dropped';
			try {
				delivery = await this.publishTerminalOutcomeLine(outcome, responseId);
			} catch (error) {
				this.logger.warn('Failed to replay Instance AI terminal outcome', {
					threadId,
					runId: outcome.runId,
					taskId: outcome.taskId,
					error: getErrorMessage(error),
				});
			}
			// Left undelivered on purpose: the next replay retries it.
			if (delivery === 'dropped') continue;

			const action = delivery === 'published' ? 'replay_event' : 'already-emitted';

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

	/**
	 * Publish the outcome line as a durable text-block and read it back.
	 * `publish` only enqueues — the drain persists asynchronously and settles
	 * flush waiters even when it had to drop a batch — so only the read-back
	 * makes the line trustworthy as a delivery record. 'dropped' means it never
	 * reached the log; the caller must leave the outcome undelivered so a later
	 * replay retries it.
	 */
	private async publishTerminalOutcomeLine(
		outcome: TerminalOutcome,
		responseId: string,
	): Promise<'published' | 'already-emitted' | 'dropped'> {
		const isOutcomeLine = (event: InstanceAiEvent) => event.responseId === responseId;
		const alreadyPublished = (
			await this.eventBus.getEventsForRun(outcome.threadId, outcome.runId)
		).some(isOutcomeLine);
		if (alreadyPublished) return 'already-emitted';

		this.eventBus.publish(outcome.threadId, {
			type: 'text-block',
			runId: outcome.runId,
			agentId: orchestratorAgentId(outcome.runId),
			responseId,
			payload: { text: outcome.userFacingMessage },
		});
		// The adapter's read settles the thread's drain before querying, so the
		// block is either in the log by now or was dropped.
		const durable = (await this.eventBus.getEventsForRun(outcome.threadId, outcome.runId)).some(
			isOutcomeLine,
		);
		return durable ? 'published' : 'dropped';
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
		let delivery: 'published' | 'already-emitted' | 'dropped' = 'dropped';
		try {
			delivery = await this.publishTerminalOutcomeLine(outcome, responseId);
		} catch (error) {
			this.logger.warn('Failed to publish Instance AI terminal outcome line', {
				threadId: task.threadId,
				runId: task.runId,
				taskId: task.taskId,
				error: getErrorMessage(error),
			});
		}
		if (delivery === 'dropped') {
			// Leave the outcome undelivered — the metadata row (or the pending-map
			// entry when the upsert failed too) makes the next replay retry it.
			this.telemetry.track('instance_ai_terminal_outcome_persistence_failure', {
				thread_id: task.threadId,
				run_id: task.runId,
				task_id: task.taskId,
				status: outcome.status,
				phase: 'event',
			});
			return;
		}

		this.telemetry.track('instance_ai_terminal_response_decision', {
			thread_id: task.threadId,
			run_id: task.runId,
			message_group_id: task.messageGroupId,
			task_id: task.taskId,
			source: 'background_outcome',
			status: outcome.status,
			action: delivery === 'published' ? 'emit' : 'already-emitted',
			visibility_source: 'background-outcome',
		});

		if (!persisted) return;

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
