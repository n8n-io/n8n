import type { InstanceAiEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { createSubAgentResourceIdPrefix, orchestratorAgentId } from '@n8n/instance-ai';
import { InstanceSettings } from 'n8n-core';

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
 * The narrow slice of InstanceAiService the sweeper consults and drives.
 * Injected at init (module wiring) instead of DI to avoid a service-level
 * dependency cycle.
 */
export interface InterruptedRunResumeHost {
	/** Whether this specific run is live (active or suspended) in this process. */
	isRunLive(threadId: string, runId: string): boolean;
	/** Re-drive a crash-interrupted run from its step checkpoint. */
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
 * 2. If a `running`-status step checkpoint exists for the run, the run is
 *    re-driven from it via the crash-resume path (the resumed run publishes
 *    its own terminal event); steering corrections present in the log but
 *    absent from the checkpoint are re-queued into the resumed context.
 * 3. Otherwise one `run-finish { status: 'interrupted' }` is appended — the
 *    fold renders every in-flight item as terminated; no walk-and-mutate.
 *
 * Runs whose own checkpoint (matched by `hostRunId`) is HITL-`suspended` are
 * skipped: the pending confirmation orphan path (SuspendedRunRestorer) owns
 * their recovery.
 *
 * Multi-main safety, without a dedicated lease table: durable activity is the
 * heartbeat. Step checkpoints upsert per step and log facts append per step,
 * so a run whose newest fact or checkpoint write is younger than the grace
 * window is treated as live on a sibling main and skipped. Single-main skips
 * the grace window (no siblings; an unfinished run with no local live run is
 * dead), which keeps immediate post-crash sweeps instant. Before a
 * crash-resume the checkpoint is claimed with an atomic compare-and-swap, so
 * two sweeping mains can never double-drive one run. Two mains booting
 * together may still both MARK one checkpoint-less dead run — accepted: the
 * duplicate terminal facts are benign (the fold is last-writer-wins per run),
 * and a per-run claim would need the lease table this design deliberately
 * avoids.
 */
@Service()
export class InterruptedRunSweeper {
	/** Multi-main only: durable activity younger than this means "still driven". */
	static readonly LIVENESS_GRACE_MS = 2 * 60 * 1000;

	private resumeHost: InterruptedRunResumeHost | undefined;

	private readonly durableLogEnabled: boolean;

	constructor(
		private readonly logger: Logger,
		private readonly eventLogRepo: InstanceAiEventLogRepository,
		private readonly checkpointRepo: InstanceAiCheckpointRepository,
		private readonly eventBus: InProcessEventBus,
		private readonly metrics: DurableLogMetrics,
		globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
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
		this.metrics.recordSweepRunExamined();

		// This specific run is live in this process (e.g. a sweep re-run raced an
		// in-flight run) — not a zombie. A different run started on the same
		// thread while the sweep was running must not shield it.
		if (this.resumeHost?.isRunLive(threadId, runId)) return;

		const checkpoints = await this.checkpointRepo.findActiveByThreadId(threadId);
		const subAgentPrefix = createSubAgentResourceIdPrefix(threadId);
		// Exact hostRunId match only: every flag-on run post-dates the column
		// (production never runs a hybrid pre/post-log state), and sub-agent or
		// legacy rows carry null, so they never match another run's sweep.
		const runCheckpoints = checkpoints.filter(
			(row) => !row.resourceId?.startsWith(subAgentPrefix) && row.hostRunId === runId,
		);

		// A run suspended at HITL is recoverable through the pending-confirmation
		// orphan path; marking it interrupted would destroy that recovery. Only
		// this run's own checkpoint counts — another run suspended on the same
		// thread must not shield a crashed run from being swept.
		if (runCheckpoints.some((row) => row.state?.status === 'suspended')) return;

		// Multi-main: durable activity is the liveness heartbeat — a sibling
		// main driving this run appends facts and upserts its checkpoint every
		// step, so recent writes mean "not a zombie, skip this round".
		if (this.instanceSettings.isMultiMain) {
			const cutoff = Date.now() - InterruptedRunSweeper.LIVENESS_GRACE_MS;
			const lastFact = await this.eventLogRepo.lastFactAt(threadId, runId);
			const newestCheckpointAt = runCheckpoints
				.map((row) => row.updatedAt?.getTime() ?? 0)
				.reduce((a, b) => Math.max(a, b), 0);
			const lastActivity = Math.max(lastFact?.getTime() ?? 0, newestCheckpointAt);
			if (lastActivity > cutoff) return;
		}

		const events = await this.eventLogRepo.getForRuns(threadId, [runId]);
		const inFlight = collectInFlightToolCalls(events);

		for (const call of inFlight) {
			this.eventBus.publish(threadId, {
				type: 'tool-interrupted',
				runId,
				agentId: call.agentId,
				payload: { toolCallId: call.toolCallId, error: TOOL_INTERRUPTED_MESSAGE },
			});
			this.metrics.recordSweepToolInterruptedFact();
		}

		// Exact hostRunId match only (runCheckpoints is pre-filtered): a run
		// with a `running` step checkpoint is re-driven instead of terminated.
		const runningCheckpoint = runCheckpoints.find((row) => row.state?.status === 'running');
		if (runningCheckpoint?.state && this.resumeHost) {
			const userId = findRunUserId(events);
			if (userId) {
				// Atomic claim: exactly one sweeping main may re-drive this run.
				const claimed = await this.checkpointRepo.claimForCrashResume(
					runningCheckpoint.key,
					runningCheckpoint.updatedAt,
				);
				if (!claimed) {
					this.logger.info('Crash-resume claim lost to a concurrent sweeper, skipping run', {
						threadId,
						runId,
					});
					return;
				}
				const { notes, correctionsRequeued } = this.buildContextNotes(
					inFlight,
					events,
					runningCheckpoint.state,
				);
				const resumed = await this.resumeHost.crashResumeInterruptedRun({
					threadId,
					runId,
					userId,
					checkpointKey: runningCheckpoint.key,
					messageGroupId: findRunMessageGroupId(events),
					contextNotes: notes,
				});
				if (resumed) {
					this.metrics.recordSweepOutcome('crash-resumed', inFlight.length, correctionsRequeued);
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
		this.metrics.recordSweepOutcome('interrupted', inFlight.length);
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
	): { notes: string[]; correctionsRequeued: number } {
		const notes: string[] = [];
		for (const call of inFlight) {
			notes.push(
				`Your previous "${call.toolName}" tool call (arguments: ${JSON.stringify(call.args)}) was interrupted by a restart before its result was recorded. Its effect is unverified — check whether it took effect before retrying it, and re-request confirmation for anything destructive.`,
			);
		}

		// Serialized message lists embed tool call ids verbatim, so a substring
		// check is a reliable containment test without decoding the SDK format.
		const checkpointJson = JSON.stringify(checkpointState.messageList ?? '');
		let correctionsRequeued = 0;
		for (const correction of collectLoggedCorrections(events)) {
			if (checkpointJson.includes(correction.toolCallId)) continue;
			correctionsRequeued++;
			notes.push(
				`Before the restart the user sent this steering correction, which was recorded but may not have been applied yet: "${correction.correction}". Make sure it is applied.`,
			);
		}
		return { notes, correctionsRequeued };
	}
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
	for (const event of events) {
		if (event.type === 'run-start') return event.payload.messageGroupId;
	}
	return undefined;
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
