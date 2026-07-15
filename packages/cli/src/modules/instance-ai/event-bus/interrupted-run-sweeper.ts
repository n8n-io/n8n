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

/**
 * The narrow slice of InstanceAiService the sweeper consults. Injected at init
 * (module wiring) instead of DI to avoid a service-level dependency cycle.
 */
export interface InterruptedRunResumeHost {
	hasActiveRun(threadId: string): boolean;
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
 * 2. One `run-finish { status: 'interrupted' }` is appended — the fold renders
 *    every in-flight item as terminated; no walk-and-mutate. (A later phase of
 *    the RFC re-drives runs with a `running` step checkpoint from that
 *    checkpoint instead; until then every swept run is marked interrupted.)
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
 * dead), which keeps immediate post-crash sweeps instant.
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

		// Live in this process (e.g. sweep re-ran after startup) — not a zombie.
		if (this.resumeHost?.hasActiveRun(threadId)) return;

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
