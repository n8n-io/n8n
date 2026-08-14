/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable import-x/extensions */

import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig, MemoryGuardConfig } from '@n8n/config';
import { OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { MemoryPressureExecutionCancelledError, WorkflowOperationError } from 'n8n-workflow';
import { getHeapStatistics, setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

import { ExecutionMemoryTracker } from './execution-memory-tracker';
import { ShedRegistry } from './shed-registry';

import { ActiveExecutions } from '@/active-executions';
import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { PrometheusMemoryGuardMetricsService } from '@/metrics/prometheus/memory-guard-metrics.service';

/** Consecutive over-threshold samples required before acting. */
const SAMPLES_TO_TRIGGER = 2;

/** Sampling interval while memory is elevated. */
const ELEVATED_INTERVAL_MS = 250;

/** Pause after a kill before considering the next, to let cancellation and GC settle. */
const KILL_COOLDOWN_MS = 2_000;

/** Margin below the hold threshold that memory must recover to before admission resumes. */
const RESUME_MARGIN = 0.05;

/**
 * When less heap than this remains, the guard kills on a single sample instead
 * of waiting for two consecutive ones.
 */
const CRITICAL_HEADROOM_BYTES = 128 * 1024 * 1024;

/** Utilization at which a single sample counts as critical. */
const CRITICAL_UTILIZATION = 0.95;

const MB = 1024 * 1024;

interface MemorySample {
	/** Highest utilization ratio across heap and container RSS. */
	utilization: number;
	/** True when a single sample warrants immediate shedding. */
	critical: boolean;
	usedMb: number;
	availableMb: number;
}

/**
 * Keeps the instance alive when memory runs low, by shedding load instead of
 * letting the kernel or V8 kill the whole process.
 *
 * Watches memory on a timer and escalates through two levels:
 * 1. Memory high (hold threshold): Do not start new production executions.
 *    They wait in the concurrency queue until memory recovers.
 * 2. Memory nearly exhausted (kill threshold): Cancel the running execution
 *    that retains the most data. It fails with an error explaining why, its
 *    data is released, and everything else keeps running.
 *
 * New executions are admitted again only when a fresh sample shows memory has
 * actually dropped, never simply because a kill happened.
 */
@Service()
export class MemoryGuardService {
	private timer: NodeJS.Timeout | undefined;

	private stopped = false;

	private forceGc: (() => void) | undefined;

	private overHoldStreak = 0;

	private overKillStreak = 0;

	private paused = false;

	private lastKillAt = 0;

	private noVictimLogged = false;

	private readonly killsByWorkflow = new Map<string, number>();

	constructor(
		private readonly logger: Logger,
		private readonly config: MemoryGuardConfig,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly activeExecutions: ActiveExecutions,
		private readonly concurrencyControl: ConcurrencyControlService,
		private readonly tracker: ExecutionMemoryTracker,
		private readonly shedRegistry: ShedRegistry,
		private readonly metrics: PrometheusMemoryGuardMetricsService,
	) {
		this.logger = this.logger.scoped('memory-guard');
	}

	init() {
		if (!this.config.enabled) return;

		if (this.executionsConfig.mode === 'queue') {
			this.logger.warn('Memory guard is only supported in regular mode, not starting');
			return;
		}

		try {
			setFlagsFromString('--expose-gc');
			this.forceGc = runInNewContext('gc');
			setFlagsFromString('--no-expose-gc');
		} catch {
			this.forceGc = undefined;
		}

		this.logger.info(
			`Memory guard enabled (hold at ${this.config.holdThreshold * 100}%, kill at ${this.config.killThreshold * 100}%`,
		);
		this.scheduleNext(this.config.intervalMs);
	}

	@OnShutdown()
	stop() {
		this.stopped = true;
		if (this.timer) clearTimeout(this.timer);
		this.timer = undefined;
		if (this.paused) this.resumeAdmission();
	}

	private scheduleNext(delayMs: number) {
		if (this.stopped) return;
		this.timer = setTimeout(() => this.check(), delayMs);
		this.timer.unref();
	}

	private check() {
		const sample = this.sample();

		if (sample.utilization >= this.config.killThreshold) {
			this.overHoldStreak++;
			this.overKillStreak++;
		} else if (sample.utilization >= this.config.holdThreshold) {
			this.overHoldStreak++;
			this.overKillStreak = 0;
		} else {
			this.overHoldStreak = 0;
			this.overKillStreak = 0;
		}

		if (!this.paused && (this.overHoldStreak >= SAMPLES_TO_TRIGGER || sample.critical)) {
			this.pauseAdmission(sample);
		} else if (
			this.paused &&
			!sample.critical &&
			sample.utilization < this.config.holdThreshold - RESUME_MARGIN
		) {
			this.resumeAdmission();
		}

		const coolingDown = Date.now() - this.lastKillAt < KILL_COOLDOWN_MS;
		if (sample.critical || (this.overKillStreak >= SAMPLES_TO_TRIGGER && !coolingDown)) {
			this.shed(sample);
		}

		const elevated =
			sample.utilization >= this.config.holdThreshold - 0.1 || this.tracker.hasActiveExecutions();
		this.scheduleNext(elevated ? ELEVATED_INTERVAL_MS : this.config.intervalMs);
	}

	private sample(): MemorySample {
		const heap = getHeapStatistics();
		const heapRatio = heap.total_heap_size / heap.heap_size_limit;
		const heapHeadroom = heap.heap_size_limit - heap.total_heap_size;

		// On containers whose V8 heap limit sits above the container limit
		// (as on cloud), RSS against the cgroup ceiling is the binding signal.
		const constrained = process.constrainedMemory();
		let rssRatio = 0;
		let rss = 0;
		if (constrained > 0) {
			rss = process.memoryUsage.rss();
			rssRatio = rss / constrained;
		}

		const utilization = Math.max(heapRatio, rssRatio);
		const critical = heapHeadroom < CRITICAL_HEADROOM_BYTES || utilization >= CRITICAL_UTILIZATION;

		if (rssRatio >= heapRatio && constrained > 0) {
			return { utilization, critical, usedMb: rss / MB, availableMb: constrained / MB };
		}

		return {
			utilization,
			critical,
			usedMb: heap.total_heap_size / MB,
			availableMb: heap.heap_size_limit / MB,
		};
	}

	private pauseAdmission(sample: MemorySample) {
		this.paused = true;
		this.concurrencyControl.pauseProductionAdmission();
		this.metrics.recordHold();
		this.logger.warn(
			`Memory at ${Math.round(sample.utilization * 100)}% (${Math.round(sample.usedMb)} of ${Math.round(sample.availableMb)} MB), holding new production executions`,
		);
	}

	private resumeAdmission() {
		this.paused = false;
		this.concurrencyControl.resumeProductionAdmission();
		this.metrics.recordResume();
		this.logger.info('Memory recovered, resuming production executions');
	}

	private shed(sample: MemorySample) {
		const victim = this.pickVictim();

		if (!victim) {
			if (!this.noVictimLogged) {
				this.logger.warn('Memory critical but no running execution found to shed');
				this.noVictimLogged = true;
			}
			this.overKillStreak = 0;
			return;
		}
		this.noVictimLogged = false;

		const usedMb = Math.round(sample.usedMb);
		const availableMb = Math.round(sample.availableMb);
		const estimatedMb = Math.round(victim.estimatedBytes / MB);

		const storedError = new WorkflowOperationError(
			'Execution stopped to prevent the instance from running out of memory',
			undefined,
			`Memory was at ${usedMb} of ${availableMb} MB. This execution was retaining the most data (an estimated ${estimatedMb} MB), so it was stopped to keep the instance and other executions alive. Reduce how much data this workflow holds at once, for example by processing items in smaller batches.`,
		);

		this.shedRegistry.markShed(victim.executionId, storedError);
		this.activeExecutions.stopExecution(
			victim.executionId,
			new MemoryPressureExecutionCancelledError(victim.executionId),
		);

		const released = this.tracker.releaseRunData(victim.executionId);
		this.tracker.discard(victim.executionId);
		this.logger.debug(`Run data of shed execution ${victim.executionId} released: ${released}`);

		this.lastKillAt = Date.now();
		this.overKillStreak = 0;
		this.metrics.recordKill(sample.critical ? 'critical' : 'threshold');

		this.logger.warn(
			`Memory at ${usedMb} of ${availableMb} MB, cancelled execution ${victim.executionId} (~${estimatedMb} MB of run data) of workflow ${victim.workflowId ?? 'unknown'}`,
		);

		// With admission paused there may be no allocation pressure left, and
		// V8 can sit on the released data for tens of seconds, wedging the
		// pause. Collecting now makes recovery immediate and the next sample
		// truthful. Runs only on this rare path, never in normal operation.
		if (this.forceGc) {
			this.forceGc();
			const after = this.sample();
			this.logger.info(
				`Forced GC after shed: ${usedMb} MB -> ${Math.round(after.usedMb)} MB of ${Math.round(after.availableMb)} MB`,
			);
		}

		if (victim.workflowId) void this.recordKill(victim.workflowId);
	}

	private pickVictim() {
		const running = new Set(
			this.activeExecutions
				.getActiveExecutions()
				.filter(({ status }) => status === 'running')
				.map(({ id }) => id),
		);

		const candidates = this.tracker.reports().filter((c) => running.has(c.executionId));
		if (candidates.length === 0) return undefined;

		// Most retained data first. Among equals, prefer the one stuck inside a
		// node the longest: the classic offender (one giant fetch) has a
		// near-zero counter because its node never finished.
		candidates.sort((a, b) => b.estimatedBytes - a.estimatedBytes || b.inNodeMs - a.inNodeMs);
		return candidates[0];
	}

	private async recordKill(workflowId: string) {
		const { deactivateAfterKills } = this.config;
		if (deactivateAfterKills <= 0) return;

		const kills = (this.killsByWorkflow.get(workflowId) ?? 0) + 1;
		this.killsByWorkflow.set(workflowId, kills);
		if (kills < deactivateAfterKills) return;

		this.killsByWorkflow.delete(workflowId);
		try {
			// Lazy import to break the DI cycle, same as ExecutionRecoveryService.
			const { WorkflowService } = await import('@/workflows/workflow.service.js');
			await Container.get(WorkflowService).deactivateWorkflowAsSystem(workflowId);
			this.metrics.recordDeactivation();
			this.logger.warn(
				`Deactivated workflow ${workflowId} after ${kills} executions were cancelled under memory pressure`,
			);
		} catch (error) {
			this.logger.error(`Failed to deactivate workflow ${workflowId}`, { error });
		}
	}
}
