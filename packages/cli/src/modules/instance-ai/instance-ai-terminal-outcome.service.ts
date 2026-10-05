import type { InstanceAiErrorEvent, InstanceAiEvent } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import {
	InstanceAiTerminalResponseGuard,
	orchestratorAgentId,
	type RunStateRegistry,
	type TerminalResponseDecision,
	type TerminalResponseStatus,
	type WorkSummary,
} from '@n8n/instance-ai';
import { OperationalError } from 'n8n-workflow';

import type { Telemetry } from '@/telemetry';

import type { InProcessEventBus } from './event-bus/in-process-event-bus';
import type { InstanceAiErrorReporterService } from './instance-ai-error-reporter.service';

type InstanceAiErrorCode = NonNullable<InstanceAiErrorEvent['payload']['code']>;

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

export type InstanceAiTerminalOutcomeRunState = Pick<RunStateRegistry, 'getRunIdsForMessageGroup'>;

export interface InstanceAiTerminalOutcomeServiceOptions {
	eventBus: InstanceAiTerminalOutcomeEventBus;
	telemetry: InstanceAiTerminalOutcomeTelemetry;
	errorReporter: InstanceAiTerminalOutcomeErrorReporter;
	logger: Logger;
	runState: InstanceAiTerminalOutcomeRunState;
}

/**
 * Owns the terminal-response guard for Instance AI conversations.
 *
 * Whenever a run reaches a terminal state (completed / cancelled / errored) or
 * starts waiting on a confirmation, it consults
 * {@link InstanceAiTerminalResponseGuard} against the run's emitted events and
 * publishes a fallback line when the agent went silent, suppresses duplicate
 * completions, and flags malformed confirmations.
 */
export class InstanceAiTerminalOutcomeService {
	private readonly eventBus: InstanceAiTerminalOutcomeEventBus;

	private readonly telemetry: InstanceAiTerminalOutcomeTelemetry;

	private readonly errorReporter: InstanceAiTerminalOutcomeErrorReporter;

	private readonly logger: Logger;

	private readonly runState: InstanceAiTerminalOutcomeRunState;

	constructor(options: InstanceAiTerminalOutcomeServiceOptions) {
		this.eventBus = options.eventBus;
		this.telemetry = options.telemetry;
		this.errorReporter = options.errorReporter;
		this.logger = options.logger;
		this.runState = options.runState;
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
}
