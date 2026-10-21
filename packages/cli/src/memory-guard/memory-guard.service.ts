import { Logger } from '@n8n/backend-common';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { formatBytes } from '@n8n/utils/number/bytes';
import { sleep } from '@n8n/utils/sleep';
import { MemoryPressureExecutionCancelledError } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';

import {
	ADMIT_INTERVAL_MS,
	CRITICAL_LEVEL,
	FAST_INTERVAL_MS,
	FAST_SAMPLING_AFTER_HOLD_MS,
	FAST_SAMPLING_LEVEL,
	FREED_SHARE,
	HOLD_LEVEL,
	HOLD_LIMIT_MS,
	RELEASE_TIMEOUT_MS,
	REMEASURE_INTERVAL_MS,
	REMEASURE_TIMEOUT_MS,
	RESUME_LEVEL,
	SAMPLES_TO_ACT,
	SLOW_INTERVAL_MS,
	STARVATION_ADMIT_INTERVAL_MS,
	STOP_LEVEL,
} from './memory-guard.constants';
import type { StopTarget, StopTrigger } from './memory-guard.types';
import { buildStopError, exposeGc, settleWithin } from './memory-guard.utils';
import { getContainerLimit, type MemoryUsage, readMemoryUsage } from './memory-usage';
import { RunDataTracker } from './run-data-tracker';
import { StoppedExecutions } from './stopped-executions';

/**
 * Keeps the instance from running out of memory. When memory is high, new production
 * executions wait. When memory stays high or a held execution waits too long, the
 * guard stops the execution that holds the most run data, so that only that execution
 * fails instead of the whole instance.
 *
 * Import this file only when the memory guard is enabled.
 */
@Service()
export class MemoryGuardService {
	private timer: NodeJS.Timeout | undefined;

	private isShutDown = false;

	private containerLimit: number | undefined;

	private forceGc: (() => void) | undefined;

	private lastUtilization = 0;

	private holdStreak = 0;

	private stopStreak = 0;

	private holdStartedAt: number | undefined;

	private fastSamplingUntil = 0;

	/** How many held executions to let start in the next batch after a hold. */
	private admitBatch = 1;

	private lastAdmitAt = 0;

	private utilizationAtLastAdmit = 0;

	private lastStarvationAdmitAt = 0;

	private lastStopEndedAt = 0;

	private pendingStop: Promise<void> | undefined;

	/**
	 * Set when a stop frees no memory, until memory falls below the resume level. The guard
	 * then still holds, but stops only at the critical level.
	 */
	private isStandingDown = false;

	/**
	 * Set when a held execution waits too long and the guard cannot stop an execution, until
	 * memory falls below the resume level.
	 */
	private isHoldSuspended = false;

	constructor(
		private readonly logger: Logger,
		private readonly activeExecutions: ActiveExecutions,
		private readonly concurrencyControl: ConcurrencyControlService,
		private readonly tracker: RunDataTracker,
		private readonly stoppedExecutions: StoppedExecutions,
	) {
		this.logger = this.logger.scoped('memory-guard');
	}

	init() {
		this.containerLimit = getContainerLimit();
		this.forceGc = exposeGc();
		this.stoppedExecutions.enabled = true;
		this.scheduleNext(SLOW_INTERVAL_MS);
	}

	@OnShutdown()
	shutdown() {
		// Held executions stay held, so that they stay `new` and run again after a restart.
		this.isShutDown = true;
		clearTimeout(this.timer);
	}

	private scheduleNext(delayMs: number) {
		if (this.isShutDown) return;
		this.timer = setTimeout(() => this.check(), delayMs);
		this.timer.unref();
	}

	private check() {
		try {
			this.stoppedExecutions.pruneFinishing((id) => this.activeExecutions.has(id));
			this.evaluate(readMemoryUsage(this.containerLimit));
		} catch (error) {
			this.logger.error('Memory guard check failed', { error: ensureError(error) });
		}

		const isUnderPressure =
			this.lastUtilization >= FAST_SAMPLING_LEVEL ||
			this.isHolding ||
			this.concurrencyControl.heldCount > 0 ||
			this.pendingStop !== undefined ||
			this.isStandingDown ||
			Date.now() < this.fastSamplingUntil;
		this.scheduleNext(isUnderPressure ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS);
	}

	private get isHolding() {
		return this.holdStartedAt !== undefined;
	}

	private evaluate(usage: MemoryUsage) {
		const { utilization } = usage;
		this.lastUtilization = utilization;
		this.holdStreak = utilization >= HOLD_LEVEL ? this.holdStreak + 1 : 0;
		this.stopStreak = utilization >= STOP_LEVEL ? this.stopStreak + 1 : 0;
		const isCritical = utilization >= CRITICAL_LEVEL;

		if (this.isStandingDown && utilization < RESUME_LEVEL) {
			this.isStandingDown = false;
			this.logger.info('Memory recovered, the memory guard acts again');
		}

		if (this.isHoldSuspended && utilization < RESUME_LEVEL) this.isHoldSuspended = false;

		const shouldHold = this.holdStreak >= SAMPLES_TO_ACT || isCritical;
		if (!this.isHolding && !this.isHoldSuspended && shouldHold) {
			this.startHold(usage);
		} else if (this.isHolding && utilization < RESUME_LEVEL) {
			const heldMs = this.endHold();
			this.logger.info(`Memory recovered after ${heldMs}ms, letting held executions start`);
		}

		if (this.isHolding) {
			this.admitBatch = 1;
			// With nothing running, no stop can free memory, so let one held execution start.
			// Wait for a pending stop, because its engine runs after it leaves the active list.
			if (!this.pendingStop && !this.hasRunningExecution()) this.admitOneHeld();
		} else {
			this.admitHeldGradually(utilization);
		}

		if (this.pendingStop) return;

		if (this.isStandingDown) {
			if (isCritical) this.stop(usage, 'critical');
			else if (this.hasHoldLimitPassed()) this.suspendHold('The last stop freed no memory');
			return;
		}

		const trigger = this.getStopTrigger(isCritical);
		if (!trigger) return;

		const isStopped = this.stop(usage, trigger);
		if (!isStopped && this.hasHoldLimitPassed()) {
			this.suspendHold('No execution can be stopped to end the hold');
		}
	}

	private suspendHold(reason: string) {
		this.isHoldSuspended = true;
		this.endHold();
		this.logger.warn(`${reason}, so the memory guard stops holding until memory falls`);
	}

	private hasRunningExecution() {
		return this.activeExecutions.getActiveExecutions().some((e) => e.status === 'running');
	}

	private admitOneHeld() {
		const now = Date.now();
		if (now - this.lastStarvationAdmitAt < STARVATION_ADMIT_INTERVAL_MS) return;
		if (this.concurrencyControl.admitHeld(1) > 0) this.lastStarvationAdmitAt = now;
	}

	private getStopTrigger(isCritical: boolean): StopTrigger | undefined {
		if (isCritical) return 'critical';
		if (this.stopStreak >= SAMPLES_TO_ACT && this.isAboveStopLevelAfterGc()) return 'threshold';
		if (this.hasHoldLimitPassed()) return 'hold-limit';
		return undefined;
	}

	/**
	 * Freed memory shows only after a garbage collection, so collect before a threshold stop.
	 * If memory falls below the stop level, the streak starts again, to limit collections.
	 */
	private isAboveStopLevelAfterGc() {
		if (!this.forceGc) return true;
		this.forceGc();
		if (readMemoryUsage(this.containerLimit).utilization >= STOP_LEVEL) return true;
		this.stopStreak = 0;
		return false;
	}

	private hasHoldLimitPassed() {
		const { oldestHeldAt } = this.concurrencyControl;
		if (!this.isHolding || oldestHeldAt === undefined) return false;
		return Date.now() - Math.max(oldestHeldAt, this.lastStopEndedAt) >= HOLD_LIMIT_MS;
	}

	/**
	 * Let held executions start in batches, so that memory can rise slowly. A batch doubles
	 * only when memory did not rise since the batch before it.
	 */
	private admitHeldGradually(utilization: number) {
		if (this.concurrencyControl.heldCount === 0) {
			this.admitBatch = 1;
			return;
		}

		const now = Date.now();
		if (now - this.lastAdmitAt < ADMIT_INTERVAL_MS) return;

		if (utilization >= RESUME_LEVEL || utilization > this.utilizationAtLastAdmit) {
			this.admitBatch = 1;
		}
		this.concurrencyControl.admitHeld(this.admitBatch);
		this.admitBatch *= 2;
		this.lastAdmitAt = now;
		this.utilizationAtLastAdmit = utilization;
	}

	private startHold(usage: MemoryUsage) {
		this.holdStartedAt = Date.now();
		this.concurrencyControl.startProductionHold();
		this.logger.warn(
			`Memory at ${formatBytes(usage.usedBytes)} of ${formatBytes(usage.limitBytes)}, holding new production executions`,
		);
	}

	private endHold() {
		if (this.holdStartedAt === undefined) return;

		const heldMs = Date.now() - this.holdStartedAt;
		this.holdStartedAt = undefined;
		this.fastSamplingUntil = Date.now() + FAST_SAMPLING_AFTER_HOLD_MS;
		this.concurrencyControl.endProductionHold();
		return heldMs;
	}

	/** Stop the execution tree that holds the most run data. Returns whether it stopped one. */
	private stop(usage: MemoryUsage, trigger: StopTrigger) {
		const target = this.findStopTarget();
		if (!target) return false;

		const engines: Array<Promise<void>> = [];
		for (const executionId of target.memberIds) {
			const execution = this.activeExecutions.getExecutionOrFail(executionId);
			const estimate = this.tracker.getEstimate(executionId);
			this.stoppedExecutions.markStopped(executionId, {
				error: buildStopError(execution.executionData.workflowData, estimate, usage),
				runningNode: estimate?.runningNode,
			});

			// A node that ignores the stop can fire events until the engine ends, so the
			// execution stays marked as stopped until then. Do not keep the engine result,
			// because it holds the full run data.
			const forget = () => this.stoppedExecutions.forget(executionId);
			engines.push(Promise.resolve(execution.workflowExecution).then(forget, forget));
		}

		// Stops do not cascade, so stop the root first and then every running child.
		for (const executionId of target.memberIds) {
			this.activeExecutions.stopExecution(
				executionId,
				new MemoryPressureExecutionCancelledError(executionId),
			);
		}

		this.stopStreak = 0;
		this.pendingStop = this.finishStop(target, engines, usage, trigger)
			.catch((error: unknown) => {
				this.logger.error('Failed to finish a memory guard stop', { error: ensureError(error) });
			})
			.finally(() => {
				this.pendingStop = undefined;
				this.lastStopEndedAt = Date.now();
			});

		return true;
	}

	/**
	 * Wait until the stopped engines end, then check whether the stop freed memory. If it
	 * did not, executions do not hold the memory, so the guard stops only at the critical
	 * level until memory falls.
	 */
	private async finishStop(
		target: StopTarget,
		engines: Array<Promise<void>>,
		before: MemoryUsage,
		trigger: StopTrigger,
	) {
		await settleWithin(engines, RELEASE_TIMEOUT_MS);
		const { after, freedMemory } = await this.measureAfterStop(before, target.estimatedBytes);

		this.logger.warn(
			`Stopped execution ${target.rootId} of workflow ${target.workflow.id} at ${formatBytes(before.usedBytes)} of ${formatBytes(before.limitBytes)} (${trigger}). It held an estimated ${formatBytes(target.estimatedBytes)} of run data. Memory after the stop: ${formatBytes(after.usedBytes)}`,
			{ executionId: target.rootId, workflowId: target.workflow.id },
		);

		if (!freedMemory) {
			this.isStandingDown = true;
			this.logger.warn(
				'The stop freed no memory, so the memory guard stops only at the critical level until memory falls',
			);
		}
	}

	private async measureAfterStop(before: MemoryUsage, estimatedBytes: number) {
		const deadline = Date.now() + REMEASURE_TIMEOUT_MS;
		for (;;) {
			this.forceGc?.();
			const after = readMemoryUsage(this.containerLimit);
			const freedMemory = before.usedBytes - after.usedBytes >= estimatedBytes * FREED_SHARE;
			if (freedMemory || Date.now() >= deadline) return { after, freedMemory };
			await sleep(REMEASURE_INTERVAL_MS);
		}
	}

	/**
	 * A sub-workflow runs as its own execution, and a stop of one execution does not
	 * stop the others, so the guard sizes and stops each tree of executions together.
	 */
	private findStopTarget(): StopTarget | undefined {
		const trees = new Map<string, Array<{ executionId: string; depth: number }>>();
		for (const { id, status } of this.activeExecutions.getActiveExecutions()) {
			// A finishing execution is saving its result, and a stop then would save it twice.
			if (status !== 'running') continue;
			if (this.stoppedExecutions.isStopped(id) || this.stoppedExecutions.isFinishing(id)) continue;
			// Before the engine is attached, a stop would leave the engine running.
			if (!this.activeExecutions.getExecutionOrFail(id).workflowExecution) continue;

			const { rootId, depth } = this.findRoot(id);
			const members = trees.get(rootId) ?? [];
			members.push({ executionId: id, depth });
			trees.set(rootId, members);
		}

		let target: StopTarget | undefined;
		for (const [rootId, members] of trees) {
			let estimatedBytes = 0;
			for (const { executionId } of members) {
				estimatedBytes += this.tracker.getEstimate(executionId)?.totalBytes ?? 0;
			}
			if (estimatedBytes === 0 || (target && estimatedBytes <= target.estimatedBytes)) continue;

			target = {
				rootId,
				workflow: this.activeExecutions.getExecutionOrFail(rootId).executionData.workflowData,
				memberIds: members.sort((a, b) => a.depth - b.depth).map((m) => m.executionId),
				estimatedBytes,
			};
		}

		return target;
	}

	/** Follow the parent links of an execution to the oldest ancestor that is still active. */
	private findRoot(executionId: string) {
		let rootId = executionId;
		let depth = 0;
		const visited = new Set([executionId]);
		for (;;) {
			const { executionData } = this.activeExecutions.getExecutionOrFail(rootId).executionData;
			const parentId = executionData?.parentExecution?.executionId;
			if (!parentId || visited.has(parentId) || !this.activeExecutions.has(parentId)) break;
			visited.add(parentId);
			rootId = parentId;
			depth++;
		}
		return { rootId, depth };
	}
}
