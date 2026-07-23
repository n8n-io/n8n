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

export const AGENT_INTERRUPTED_MESSAGE = 'Interrupted by a process restart.';

/** A tool call that was in flight (no terminal fact) when the process died. */
interface InFlightToolCall {
	toolCallId: string;
	toolName: string;
	agentId: string;
	args: Record<string, unknown>;
}

/** A spawned sub-agent with no terminal fact when the process died. */
interface OrphanedSpawnedAgent {
	agentId: string;
	role: string;
}

/**
 * The narrow slice of InstanceAiService the sweeper consults. Injected at init
 * (module wiring) instead of DI to avoid a service-level dependency cycle.
 */
export interface InterruptedRunResumeHost {
	/** Whether this specific run is live (active or suspended) in this process. */
	isRunLive(threadId: string, runId: string): boolean;
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
 * 2. Spawned sub-agents with no `agent-completed` get one appended with an
 *    error — `run-finish` only settles the root, so without it a dead child
 *    would render `active` forever.
 * 3. One `run-finish { status: 'interrupted' }` is appended — the fold renders
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
 * dead), which keeps immediate post-crash sweeps instant. Two mains booting
 * together may still both mark one dead run — accepted: the duplicate
 * terminal facts are benign (the fold is last-writer-wins per run), and a
 * per-run claim would need the lease table this design deliberately avoids.
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

		const inFlightToolCalls = await this.resolveZombieRun(threadId, runId, {
			status: 'interrupted',
			reason: 'crash_interrupted',
		});
		if (inFlightToolCalls === null) return;

		this.metrics.recordSweepOutcome('interrupted', inFlightToolCalls);
		this.logger.info('Marked interrupted Instance AI run in the durable log', {
			threadId,
			runId,
			inFlightToolCalls,
		});
	}

	/**
	 * User-initiated zombie resolution: a Stop on a thread with no live run
	 * anywhere still terminalizes crashed runs whose durable facts would
	 * otherwise leave the thread rendering in-flight until the next boot's
	 * sweep. Cancel of an already-dead run emits no `run-finish` from any run
	 * body (there is no process to emit it) — this appends the terminal facts
	 * instead, so every client and every main converges through the normal
	 * replay path rather than a status poll. Same guards as the sweep; only
	 * the terminal payload differs (the user asked, so `cancelled`, not
	 * `interrupted`). Runs the sweep's multi-main activity grace, which also
	 * covers a live sibling run the broadcast cancel is about to abort.
	 *
	 * Accepted race (same class as the sweep's boot-time double-mark): a
	 * sibling run that is live but SILENT past the grace window (e.g. stuck in
	 * a slow tool, appending no facts and no checkpoint upserts) can be
	 * terminalized here while the broadcast abort makes it publish its own
	 * run-finish moments later. Both facts carry `cancelled`, the fold is
	 * idempotent on repeats, and the terminal-fact recheck below narrows the
	 * window — a per-run claim would need the lease table this design avoids.
	 */
	async cancelUnfinishedRuns(threadId: string): Promise<number> {
		if (!this.durableLogEnabled) return 0;

		let unfinished;
		try {
			unfinished = await this.eventLogRepo.findUnfinishedRuns(threadId);
		} catch (error) {
			this.logger.error('Cancel-time zombie resolution failed to query the event log', { error });
			return 0;
		}

		let resolved = 0;
		for (const run of unfinished) {
			try {
				const inFlightToolCalls = await this.resolveZombieRun(threadId, run.runId, {
					status: 'cancelled',
					reason: 'user_cancelled',
				});
				if (inFlightToolCalls === null) continue;
				resolved++;
				this.logger.info('Cancelled a dead Instance AI run in the durable log', {
					threadId,
					runId: run.runId,
					inFlightToolCalls,
				});
			} catch (error) {
				this.logger.error('Cancel-time zombie resolution failed for run', {
					threadId,
					runId: run.runId,
					error,
				});
			}
		}
		return resolved;
	}

	/**
	 * Shared zombie resolution: appends `tool-interrupted` for in-flight calls,
	 * `agent-completed { error }` for spawned sub-agents with no terminal fact,
	 * and one terminal `run-finish`, unless the run is live in this process,
	 * HITL-suspended, or (multi-main) shows recent durable activity. Returns
	 * the number of in-flight calls terminalized, or null when the run was
	 * left alone.
	 */
	private async resolveZombieRun(
		threadId: string,
		runId: string,
		finish: { status: 'interrupted' | 'cancelled'; reason: string },
	): Promise<number | null> {
		// This specific run is live in this process (e.g. a sweep re-run raced an
		// in-flight run) — not a zombie. A different run started on the same
		// thread while the sweep was running must not shield it.
		if (this.resumeHost?.isRunLive(threadId, runId)) return null;

		const checkpoints = await this.checkpointRepo.findActiveByThreadId(threadId);
		const subAgentPrefix = createSubAgentResourceIdPrefix(threadId);
		// Exact hostRunId match only: every flag-on run post-dates the column
		// (production never runs a hybrid pre/post-log state), and sub-agent or
		// legacy rows carry null, so they never match another run's sweep.
		const runCheckpoints = checkpoints.filter(
			(row) => !row.resourceId?.startsWith(subAgentPrefix) && row.hostRunId === runId,
		);

		// A run suspended at HITL is recoverable through the pending-confirmation
		// orphan path; terminalizing it would destroy that recovery. Only this
		// run's own checkpoint counts — another run suspended on the same thread
		// must not shield a crashed run.
		if (runCheckpoints.some((row) => row.state?.status === 'suspended')) return null;

		// Multi-main: durable activity is the liveness heartbeat — a sibling
		// main driving this run appends facts and upserts its checkpoint every
		// step, so recent writes mean "not a zombie, leave it alone".
		if (this.instanceSettings.isMultiMain) {
			const cutoff = Date.now() - InterruptedRunSweeper.LIVENESS_GRACE_MS;
			const lastFact = await this.eventLogRepo.lastFactAt(threadId, runId);
			const newestCheckpointAt = runCheckpoints
				.map((row) => row.updatedAt?.getTime() ?? 0)
				.reduce((a, b) => Math.max(a, b), 0);
			const lastActivity = Math.max(lastFact?.getTime() ?? 0, newestCheckpointAt);
			if (lastActivity > cutoff) return null;
		}

		const events = await this.eventLogRepo.getForRuns(threadId, [runId]);
		// Belt against drain races: a terminal fact may have landed between the
		// unfinished-run query and this read — never append a second one (a
		// later run-finish would win the fold and rewrite the run's outcome).
		if (events.some((event) => event.type === 'run-finish')) return null;
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

		// `run-finish` settles only the root, so a spawned child with no
		// terminal fact would render `active` forever. Terminalize it here —
		// at the source — so no client ever needs to walk-and-mutate a tree.
		for (const agent of collectOrphanedSpawnedAgents(events)) {
			this.eventBus.publish(threadId, {
				type: 'agent-completed',
				runId,
				agentId: agent.agentId,
				payload: {
					role: agent.role,
					result: '',
					// Matches the live cancel path's wording for spawned agents.
					error: finish.status === 'cancelled' ? 'Cancelled by user' : AGENT_INTERRUPTED_MESSAGE,
				},
			});
		}

		this.eventBus.publish(threadId, {
			type: 'run-finish',
			runId,
			agentId: orchestratorAgentId(runId),
			payload: finish,
		});
		return inFlight.length;
	}
}

/** agent-spawned facts with no matching agent-completed. */
export function collectOrphanedSpawnedAgents(events: InstanceAiEvent[]): OrphanedSpawnedAgent[] {
	const open = new Map<string, OrphanedSpawnedAgent>();
	for (const event of events) {
		if (event.type === 'agent-spawned') {
			open.set(event.agentId, { agentId: event.agentId, role: event.payload.role });
		} else if (event.type === 'agent-completed') {
			open.delete(event.agentId);
		}
	}
	return [...open.values()];
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
