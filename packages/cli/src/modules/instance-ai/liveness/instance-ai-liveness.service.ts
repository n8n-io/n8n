import type { InstanceAiEvent } from '@n8n/api-types';
import { Time } from '@n8n/constants';
import type { InstanceAiLivenessPolicy, InstanceAiLivenessTimeoutReason } from '@n8n/instance-ai';

const ORCHESTRATOR_AGENT_ID = 'agent-001';

export const INSTANCE_AI_RUN_TIMEOUT_REASON = 'timeout';

const RUN_TIMEOUT_MESSAGE =
	'The run stopped making progress, so I cancelled it. You can retry or adjust the request.';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export type InstanceAiLivenessTimedOutActiveRun = {
	runId: string;
	abortController: AbortController;
};

export type InstanceAiLivenessTimedOutSuspendedRun = {
	runId: string;
	threadId: string;
	abortController: AbortController;
};

export type InstanceAiLivenessTimedOutTask = {
	threadId: string;
	taskId: string;
	role: string;
	timeoutReason?: InstanceAiLivenessTimeoutReason;
};

export type InstanceAiLivenessPendingConfirmation = {
	threadId: string;
};

export type InstanceAiLivenessSweepResult = {
	activeThreadIds: string[];
	suspendedThreadIds: string[];
	confirmationRequestIds: string[];
};

export type InstanceAiLivenessRunState<
	TSuspendedRun extends InstanceAiLivenessTimedOutSuspendedRun,
> = {
	sweepTimedOut: (policy: InstanceAiLivenessPolicy, now?: number) => InstanceAiLivenessSweepResult;
	cancelActiveRun: (threadId: string) => InstanceAiLivenessTimedOutActiveRun | undefined;
	cancelSuspendedRun: (threadId: string) => TSuspendedRun | undefined;
	getActiveRunId: (threadId: string) => string | undefined;
	getPendingConfirmation: (requestId: string) => InstanceAiLivenessPendingConfirmation | undefined;
	rejectPendingConfirmation: (requestId: string) => boolean;
};

export type InstanceAiLivenessBackgroundTasks = {
	timeoutTimedOutTasks: (
		policy: InstanceAiLivenessPolicy,
		now?: number,
	) => Promise<InstanceAiLivenessTimedOutTask[]>;
};

export type InstanceAiLivenessEventBus = {
	getEventsForRun: (threadId: string, runId: string) => Pick<InstanceAiEvent, 'responseId'>[];
	publish: (threadId: string, event: InstanceAiEvent) => void;
};

export type InstanceAiLivenessLogger = {
	debug: (message: string, metadata?: Record<string, unknown>) => void;
	warn: (message: string, metadata?: Record<string, unknown>) => void;
};

export type InstanceAiLivenessServiceOptions<
	TSuspendedRun extends InstanceAiLivenessTimedOutSuspendedRun,
> = {
	policy: InstanceAiLivenessPolicy;
	backgroundTaskIdleTimeoutMs: number;
	runState: InstanceAiLivenessRunState<TSuspendedRun>;
	backgroundTasks: InstanceAiLivenessBackgroundTasks;
	eventBus: InstanceAiLivenessEventBus;
	finalizeCancelledSuspendedRun: (suspended: TSuspendedRun, reason: string) => void;
	logger: InstanceAiLivenessLogger;
};

export class InstanceAiLivenessService<
	TSuspendedRun extends InstanceAiLivenessTimedOutSuspendedRun,
> {
	private timeoutInterval?: NodeJS.Timeout;

	private readonly timedOutRunIds = new Set<string>();

	private readonly timedOutActiveRunThreads = new Set<string>();

	constructor(private readonly options: InstanceAiLivenessServiceOptions<TSuspendedRun>) {}

	get backgroundTaskIdleTimeoutMs(): number {
		return this.options.backgroundTaskIdleTimeoutMs;
	}

	start(): void {
		if (!this.options.policy.hasEnabledTimeouts()) return;

		this.timeoutInterval = setInterval(() => {
			void this.sweepTimedOutWork();
		}, Time.minutes.toMilliseconds);
	}

	shutdown(): void {
		if (this.timeoutInterval) {
			clearInterval(this.timeoutInterval);
			this.timeoutInterval = undefined;
		}
		this.timedOutRunIds.clear();
		this.timedOutActiveRunThreads.clear();
	}

	clearThreadState(threadId: string): void {
		this.timedOutActiveRunThreads.delete(threadId);
	}

	markRunTimedOut(runId: string): void {
		this.timedOutRunIds.add(runId);
	}

	consumeRunTimedOut(runId: string): boolean {
		const timedOut = this.timedOutRunIds.has(runId);
		if (timedOut) this.timedOutRunIds.delete(runId);
		return timedOut;
	}

	hasTimedOutActiveRunThread(threadId: string): boolean {
		return this.timedOutActiveRunThreads.has(threadId);
	}

	async sweepTimedOutWork(now = Date.now()): Promise<void> {
		const { activeThreadIds, suspendedThreadIds, confirmationRequestIds } =
			this.options.runState.sweepTimedOut(this.options.policy, now);

		for (const threadId of activeThreadIds) {
			this.options.logger.debug('Cancelling timed-out active run', { threadId });
			this.cancelTimedOutActiveRun(threadId);
		}

		for (const threadId of suspendedThreadIds) {
			this.options.logger.debug('Auto-rejecting timed-out suspended run', { threadId });
			this.cancelTimedOutSuspendedRun(threadId);
		}

		for (const reqId of confirmationRequestIds) {
			this.options.logger.debug('Auto-rejecting timed-out sub-agent confirmation', {
				requestId: reqId,
			});
			const pending = this.options.runState.getPendingConfirmation(reqId);
			if (pending) {
				const runId = this.options.runState.getActiveRunId(pending.threadId);
				if (runId) this.publishRunTimeoutNotice(pending.threadId, runId);
			}
			this.options.runState.rejectPendingConfirmation(reqId);
		}

		try {
			const timedOutTasks = await this.options.backgroundTasks.timeoutTimedOutTasks(
				this.options.policy,
				now,
			);
			for (const task of timedOutTasks) {
				this.options.logger.debug('Timed out background task', {
					threadId: task.threadId,
					taskId: task.taskId,
					role: task.role,
					timeoutReason: task.timeoutReason,
				});
			}
		} catch (error) {
			this.options.logger.warn('Failed to sweep timed-out background tasks', {
				error: getErrorMessage(error),
			});
		}
	}

	cancelTimedOutActiveRun(threadId: string): void {
		const active = this.options.runState.cancelActiveRun(threadId);
		if (!active) return;

		this.markRunTimedOut(active.runId);
		this.timedOutActiveRunThreads.add(threadId);
		this.publishRunTimeoutNotice(threadId, active.runId);
		active.abortController.abort();
	}

	cancelTimedOutSuspendedRun(threadId: string): void {
		const suspended = this.options.runState.cancelSuspendedRun(threadId);
		if (!suspended) return;

		this.markRunTimedOut(suspended.runId);
		suspended.abortController.abort();
		this.options.finalizeCancelledSuspendedRun(suspended, INSTANCE_AI_RUN_TIMEOUT_REASON);
	}

	publishRunTimeoutNotice(threadId: string, runId: string): void {
		const responseId = `run-timeout:${runId}`;
		const alreadyPublished = this.options.eventBus
			.getEventsForRun(threadId, runId)
			.some((event) => event.responseId === responseId);
		if (alreadyPublished) return;

		this.options.eventBus.publish(threadId, {
			type: 'text-delta',
			runId,
			agentId: ORCHESTRATOR_AGENT_ID,
			responseId,
			payload: { text: RUN_TIMEOUT_MESSAGE },
		});
	}
}
