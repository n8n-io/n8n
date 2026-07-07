import type { InstanceAiEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { createSubAgentResourceIdPrefix, orchestratorAgentId } from '@n8n/instance-ai';

import { DurableLogMetrics } from './durable-log-metrics';
import { InProcessEventBus } from './in-process-event-bus';
import { InstanceAiCheckpointRepository } from '../repositories/instance-ai-checkpoint.repository';
import { InstanceAiEventLogRepository } from '../repositories/instance-ai-event-log.repository';

export const TOOL_INTERRUPTED_MESSAGE =
	'Interrupted by a process restart — effect unverified; verify before retrying.';

/** A tool call that was in flight (no terminal fact) when the process died. */
interface InFlightToolCall {
	toolCallId: string;
	toolName: string;
	agentId: string;
	args: Record<string, unknown>;
}

/** A steering correction recorded in the log (task-control correct-task call). */
interface LoggedCorrection {
	toolCallId: string;
	correction: string;
}

/**
 * The narrow slice of InstanceAiService the sweeper drives. Injected at init
 * (module wiring) instead of DI to avoid a service-level dependency cycle.
 */
export interface InterruptedRunResumeHost {
	hasActiveRun(threadId: string): boolean;
	crashResumeInterruptedRun(request: {
		threadId: string;
		runId: string;
		userId: string;
		checkpointKey: string;
		messageGroupId?: string;
		contextNotes?: string[];
	}): Promise<boolean>;
}

/**
 * Durable-log RFC (resilience phase): no zombie runs.
 *
 * Invariant: every run reaches a terminal state recorded in the log. A mid-run
 * crash leaves a `run-start` with no `run-finish` — detection is a log query,
 * resolution is appended facts:
 *
 * 1. In-flight tool calls (tool-call with no terminal fact) become durable
 *    `tool-interrupted` facts — effect unverified, never re-executed blindly.
 * 2. If a `running`-status step checkpoint exists, the run is re-driven from
 *    it via the crash-resume path (the run publishes its own terminal event);
 *    steering corrections present in the log but absent from the checkpoint
 *    are re-queued into the resumed context.
 * 3. Otherwise one `run-finish { status: 'interrupted' }` is appended — the
 *    fold renders every in-flight item as terminated; no walk-and-mutate.
 *
 * Runs whose checkpoint is HITL-`suspended` are skipped: the pending
 * confirmation orphan path (SuspendedRunRestorer) owns their recovery.
 *
 * ponytail: startup-only sweep, no lease/heartbeat — a sibling main actively
 * driving a run would appear "unfinished" here, so multi-main needs the lease
 * before this runs anywhere but single-main. Startup-only covers the measured
 * crash scenarios.
 */
@Service()
export class InterruptedRunSweeper {
	private resumeHost: InterruptedRunResumeHost | undefined;

	private readonly durableLogEnabled: boolean;

	constructor(
		private readonly logger: Logger,
		private readonly eventLogRepo: InstanceAiEventLogRepository,
		private readonly checkpointRepo: InstanceAiCheckpointRepository,
		private readonly eventBus: InProcessEventBus,
		private readonly metrics: DurableLogMetrics,
		globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped('instance-ai');
		this.durableLogEnabled = globalConfig.instanceAi.durableLog;
	}

	setResumeHost(host: InterruptedRunResumeHost): void {
		this.resumeHost = host;
	}

	/** Called from module init (startup). */
	async sweep(): Promise<void> {
		if (!this.durableLogEnabled) return;

		let unfinished;
		try {
			unfinished = await this.eventLogRepo.findUnfinishedRuns();
		} catch (error) {
			this.logger.error('Interrupted-run sweep failed to query the event log', { error });
			return;
		}

		for (const { threadId, runId } of unfinished) {
			try {
				await this.sweepRun(threadId, runId);
			} catch (error) {
				this.logger.error('Interrupted-run sweep failed for run', { threadId, runId, error });
			}
		}
	}

	private async sweepRun(threadId: string, runId: string): Promise<void> {
		this.metrics.sweep.runsExamined++;

		// Live in this process (e.g. sweep re-ran after startup) — not a zombie.
		if (this.resumeHost?.hasActiveRun(threadId)) return;

		const checkpoints = await this.checkpointRepo.findActiveByThreadId(threadId);
		const subAgentPrefix = createSubAgentResourceIdPrefix(threadId);
		const orchestratorCheckpoints = checkpoints.filter(
			(row) => !row.resourceId?.startsWith(subAgentPrefix),
		);

		// HITL-suspended runs are recoverable through the pending-confirmation
		// orphan path; marking them interrupted would destroy that recovery.
		if (orchestratorCheckpoints.some((row) => row.state?.status === 'suspended')) return;

		const events = await this.eventLogRepo.getForRuns(threadId, [runId]);
		const inFlight = collectInFlightToolCalls(events);

		for (const call of inFlight) {
			this.eventBus.publish(threadId, {
				type: 'tool-interrupted',
				runId,
				agentId: call.agentId,
				payload: { toolCallId: call.toolCallId, error: TOOL_INTERRUPTED_MESSAGE },
			});
			this.metrics.sweep.toolInterruptedFacts++;
		}

		// ponytail: newest running orchestrator checkpoint for the thread is
		// assumed to belong to this run (one orchestrator run per thread); a
		// runId column on checkpoints would make this exact.
		const runningCheckpoint = orchestratorCheckpoints.find(
			(row) => row.state?.status === 'running',
		);
		if (runningCheckpoint?.state && this.resumeHost) {
			const userId = findRunUserId(events);
			const messageGroupId = findRunMessageGroupId(events);
			if (userId) {
				const contextNotes = this.buildContextNotes(inFlight, events, runningCheckpoint.state);
				const resumed = await this.resumeHost.crashResumeInterruptedRun({
					threadId,
					runId,
					userId,
					checkpointKey: runningCheckpoint.key,
					messageGroupId,
					contextNotes,
				});
				if (resumed) {
					this.metrics.sweep.runsCrashResumed++;
					this.logger.info('Crash-resumed interrupted Instance AI run from step checkpoint', {
						threadId,
						runId,
						checkpointKey: runningCheckpoint.key,
					});
					return;
				}
			}
		}

		this.eventBus.publish(threadId, {
			type: 'run-finish',
			runId,
			agentId: orchestratorAgentId(runId),
			payload: { status: 'interrupted', reason: 'crash_interrupted' },
		});
		this.metrics.sweep.runsMarkedInterrupted++;
		this.logger.info('Marked interrupted Instance AI run in the durable log', {
			threadId,
			runId,
			inFlightToolCalls: inFlight.length,
		});
	}

	/**
	 * Notes appended to the crash-resumed model context: interrupted tool calls
	 * (verify-before-retry, never blind re-execution) and steering corrections
	 * recorded in the log but absent from the checkpoint's message list
	 * (queued-but-undrained at crash time).
	 */
	private buildContextNotes(
		inFlight: InFlightToolCall[],
		events: InstanceAiEvent[],
		checkpointState: { messageList?: unknown },
	): string[] {
		const notes: string[] = [];
		for (const call of inFlight) {
			notes.push(
				`Your previous "${call.toolName}" tool call (arguments: ${JSON.stringify(call.args)}) was interrupted by a restart before its result was recorded. Its effect is unverified — check whether it took effect before retrying it, and re-request confirmation for anything destructive.`,
			);
		}

		// Serialized message lists embed tool call ids verbatim, so a substring
		// check is a reliable containment test without decoding the SDK format.
		const checkpointJson = JSON.stringify(checkpointState.messageList ?? '');
		for (const correction of collectLoggedCorrections(events)) {
			if (checkpointJson.includes(correction.toolCallId)) continue;
			this.metrics.sweep.correctionsRequeued++;
			notes.push(
				`Before the restart the user sent this steering correction, which was recorded but may not have been applied yet: "${correction.correction}". Make sure it is applied.`,
			);
		}
		return notes;
	}
}

/** tool-call facts with no matching terminal fact (result/error/interrupted). */
export function collectInFlightToolCalls(events: InstanceAiEvent[]): InFlightToolCall[] {
	const open = new Map<string, InFlightToolCall>();
	for (const event of events) {
		if (event.type === 'tool-call') {
			open.set(event.payload.toolCallId, {
				toolCallId: event.payload.toolCallId,
				toolName: event.payload.toolName,
				agentId: event.agentId,
				args: event.payload.args,
			});
		} else if (
			event.type === 'tool-result' ||
			event.type === 'tool-error' ||
			event.type === 'tool-interrupted'
		) {
			open.delete(event.payload.toolCallId);
		}
	}
	return [...open.values()];
}

/** Steering corrections recorded as task-control `correct-task` calls. */
export function collectLoggedCorrections(events: InstanceAiEvent[]): LoggedCorrection[] {
	const corrections: LoggedCorrection[] = [];
	for (const event of events) {
		if (event.type !== 'tool-call') continue;
		const { action, correction } = event.payload.args;
		if (action === 'correct-task' && typeof correction === 'string') {
			corrections.push({ toolCallId: event.payload.toolCallId, correction });
		}
	}
	return corrections;
}

function findRunUserId(events: InstanceAiEvent[]): string | undefined {
	return events.find((e) => e.type === 'run-start')?.userId;
}

function findRunMessageGroupId(events: InstanceAiEvent[]): string | undefined {
	const runStart = events.find((e) => e.type === 'run-start');
	return runStart?.type === 'run-start' ? runStart.payload.messageGroupId : undefined;
}
