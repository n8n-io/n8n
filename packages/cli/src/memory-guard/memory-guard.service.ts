import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { type WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { OnLifecycleEvent, OnShutdown, type WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { formatBytes } from '@n8n/utils/number/bytes';
import { sleep } from '@n8n/utils/sleep';
import { MemoryPressureExecutionCancelledError } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ExecutionRecoveryService } from '@/executions/execution-recovery.service';
import { UserManagementMailer } from '@/user-management/email/user-management-mailer';
import { isWorkflowIdValid } from '@/utils';
import { WorkflowPushNotifier } from '@/workflows/workflow-push-notifier.service';

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
	STOPS_TO_DEACTIVATE,
} from './memory-guard.constants';
import type { StopTarget, StopTrigger } from './memory-guard.types';
import {
	buildStopError,
	exposeGc,
	isProductionMode,
	largestNode,
	nodeType,
	settleWithin,
} from './memory-guard.utils';
import { getContainerLimit, type MemoryUsage, readMemoryUsage } from './memory-usage';
import { ProductionHold } from './production-hold';
import { type RunDataEstimate, RunDataTracker } from './run-data-tracker';
import { MemoryGuardJournal } from './memory-guard-journal';
import { MemoryStoppedExecutions } from './memory-stopped-executions';

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

	private areCrashesReported = false;

	private pendingStop: Promise<void> | undefined;

	/**
	 * Workflow of the pending stop. A successful production run of the workflow clears it, so
	 * that the stop does not count.
	 */
	private pendingStopWorkflowId: string | undefined;

	/**
	 * Set when a stop frees no memory, until memory falls below the resume level. The guard
	 * then still holds, but stops only at the critical level.
	 */
	private isStandingDown = false;

	/**
	 * Set when a held execution waits too long and no stop can help. The guard then ends the
	 * hold and starts no new hold until memory falls below the resume level.
	 */
	private isHoldSuspended = false;

	/** Counted stops by workflow, until a successful production run or a deactivation. */
	private readonly stopsByWorkflow = new Map<string, number>();

	/** Workflows with a deactivation in progress, so that later stops do not start another. */
	private readonly deactivating = new Set<string>();

	constructor(
		private readonly logger: Logger,
		private readonly activeExecutions: ActiveExecutions,
		private readonly productionHold: ProductionHold,
		private readonly tracker: RunDataTracker,
		private readonly memoryStoppedExecutions: MemoryStoppedExecutions,
		private readonly eventService: EventService,
		private readonly journal: MemoryGuardJournal,
		private readonly workflowRepository: WorkflowRepository,
		private readonly executionRecoveryService: ExecutionRecoveryService,
		private readonly mailer: UserManagementMailer,
		private readonly workflowPushNotifier: WorkflowPushNotifier,
	) {
		this.logger = this.logger.scoped('memory-guard');
	}

	init() {
		this.containerLimit = getContainerLimit();
		this.forceGc = exposeGc();
		this.memoryStoppedExecutions.enabled = true;
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
			this.reportCrashes();
			this.memoryStoppedExecutions.pruneFinishing((id) => this.activeExecutions.has(id));
			this.evaluate(readMemoryUsage(this.containerLimit));
		} catch (error) {
			this.logger.error('Memory guard check failed', { error: ensureError(error) });
		}

		const isUnderPressure =
			this.lastUtilization >= FAST_SAMPLING_LEVEL ||
			this.isHolding ||
			this.productionHold.heldCount > 0 ||
			this.pendingStop !== undefined ||
			this.isStandingDown ||
			Date.now() < this.fastSamplingUntil;
		this.scheduleNext(isUnderPressure ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS);
	}

	/** The metrics start after the guard, so report the crash totals once something listens. */
	private reportCrashes() {
		if (this.areCrashesReported) return;
		if (!(this.eventService.listenerCount('memory-guard-crashes-counted') > 0)) return;
		this.areCrashesReported = true;
		this.eventService.emit('memory-guard-crashes-counted', {
			crashes: { ...this.journal.crashes },
		});
	}

	private get isHolding() {
		return this.holdStartedAt !== undefined;
	}

	private evaluate(usage: MemoryUsage) {
		const { utilization } = usage;
		this.lastUtilization = utilization;
		if (utilization < FAST_SAMPLING_LEVEL) this.journal.reset();
		this.holdStreak = utilization >= HOLD_LEVEL ? this.holdStreak + 1 : 0;
		this.stopStreak = utilization >= STOP_LEVEL ? this.stopStreak + 1 : 0;
		const isCritical = utilization >= CRITICAL_LEVEL;

		if (this.isStandingDown && utilization < RESUME_LEVEL) {
			this.isStandingDown = false;
			this.logger.info(
				`Memory fell below ${percent(RESUME_LEVEL)}, so the memory guard again stops executions at ${percent(STOP_LEVEL)}`,
			);
		}

		if (this.isHoldSuspended && utilization < RESUME_LEVEL) this.isHoldSuspended = false;

		const shouldHold = this.holdStreak >= SAMPLES_TO_ACT || isCritical;
		if (!this.isHolding && !this.isHoldSuspended && shouldHold) {
			this.startHold(usage);
		} else if (this.isHolding && utilization < RESUME_LEVEL) {
			const heldMs = this.endHold();
			this.logger.info(
				`Memory fell below ${percent(RESUME_LEVEL)} after a hold of ${heldMs}ms, so held executions now start in batches`,
			);
		}

		if (this.isHolding) {
			this.admitBatch = 1;
			// With nothing running, no stop can free memory, so let one held execution start.
			// Not during a stop, because the stopped engine still runs after it leaves the active list.
			if (!this.pendingStop && !this.hasRunningExecution()) this.admitOneHeld();
		} else {
			this.admitHeldGradually(utilization);
		}

		if (this.pendingStop) return;

		if (this.isStandingDown) {
			if (isCritical) this.stop('critical');
			else if (this.hasHoldLimitPassed())
				this.suspendHold('The last stop freed less memory than expected');
			return;
		}

		const stop = this.getStop(isCritical);
		if (!stop) return;

		const isStopped = this.stop(stop.trigger, stop.usageAfterGc);
		if (!isStopped && this.hasHoldLimitPassed()) {
			this.suspendHold('No execution can be stopped to end the hold');
		}
	}

	private suspendHold(reason: string) {
		this.isHoldSuspended = true;
		this.endHold();
		this.logger.warn(
			`${reason}, so the memory guard ends the hold and starts no new hold until memory falls below ${percent(RESUME_LEVEL)}`,
		);
	}

	private hasRunningExecution() {
		return this.activeExecutions.getActiveExecutions().some((e) => e.status === 'running');
	}

	private admitOneHeld() {
		const now = Date.now();
		if (now - this.lastStarvationAdmitAt < STARVATION_ADMIT_INTERVAL_MS) return;
		if (this.productionHold.admit(1) > 0) this.lastStarvationAdmitAt = now;
	}

	/**
	 * Freed memory shows only after a garbage collection, so collect before a threshold stop.
	 * If memory falls below the stop level, the streak starts again, to limit collections.
	 */
	private getStop(
		isCritical: boolean,
	): { trigger: StopTrigger; usageAfterGc?: MemoryUsage } | undefined {
		if (isCritical) return { trigger: 'critical' };
		// Without a stop target, a collection on every sample only pauses the event loop.
		if (this.stopStreak >= SAMPLES_TO_ACT && this.findStopTarget()) {
			const usageAfterGc = this.readUsageAfterGc();
			if (usageAfterGc.utilization >= STOP_LEVEL) return { trigger: 'threshold', usageAfterGc };
			this.stopStreak = 0;
		}
		if (this.hasHoldLimitPassed()) return { trigger: 'hold-limit' };
		return undefined;
	}

	private readUsageAfterGc() {
		this.forceGc?.();
		return readMemoryUsage(this.containerLimit);
	}

	private hasHoldLimitPassed() {
		const { oldestHeldAt } = this.productionHold;
		if (!this.isHolding || oldestHeldAt === undefined) return false;
		return Date.now() - Math.max(oldestHeldAt, this.lastStopEndedAt) >= HOLD_LIMIT_MS;
	}

	/**
	 * Let held executions start in batches, so that memory can rise slowly. A batch doubles
	 * only when memory did not rise since the batch before it.
	 */
	private admitHeldGradually(utilization: number) {
		if (this.productionHold.heldCount === 0) {
			this.admitBatch = 1;
			return;
		}

		const now = Date.now();
		if (now - this.lastAdmitAt < ADMIT_INTERVAL_MS) return;

		if (utilization >= RESUME_LEVEL || utilization > this.utilizationAtLastAdmit) {
			this.admitBatch = 1;
		}
		this.productionHold.admit(this.admitBatch);
		this.admitBatch *= 2;
		this.lastAdmitAt = now;
		this.utilizationAtLastAdmit = utilization;
	}

	private startHold(usage: MemoryUsage) {
		this.holdStartedAt = Date.now();
		this.productionHold.start();
		this.journal.record('hold');
		this.logger.warn(
			`Memory at ${formatBytes(usage.usedBytes)} of ${formatBytes(usage.limitBytes)}, holding new production executions`,
		);
		this.eventService.emit('memory-guard-hold-started', {
			memoryUsedBytes: usage.usedBytes,
			memoryLimitBytes: usage.limitBytes,
		});
	}

	private endHold() {
		if (this.holdStartedAt === undefined) return;

		const heldMs = Date.now() - this.holdStartedAt;
		this.holdStartedAt = undefined;
		this.fastSamplingUntil = Date.now() + FAST_SAMPLING_AFTER_HOLD_MS;
		this.productionHold.end();
		this.eventService.emit('memory-guard-hold-ended', { heldMs });
		return heldMs;
	}

	/** Stop the execution tree that holds the most run data. Returns whether it stopped one. */
	private stop(trigger: StopTrigger, usageAfterGc?: MemoryUsage) {
		const target = this.findStopTarget();
		if (!target) return false;
		this.journal.record('stop');

		// The check after the stop also collects first, so only the stop counts as freed memory.
		const usage = usageAfterGc ?? this.readUsageAfterGc();

		const engines: Array<Promise<void>> = [];
		for (const executionId of target.memberIds) {
			const execution = this.activeExecutions.getExecutionOrFail(executionId);
			const estimate = this.tracker.getEstimate(executionId);
			this.memoryStoppedExecutions.markStopped(executionId, {
				error: buildStopError(execution.executionData.workflowData, estimate, usage),
				runningNode: estimate?.runningNode,
			});

			// A node that ignores the stop can fire events until the engine ends, so the
			// execution stays marked as stopped until then. Do not keep the engine result,
			// because it holds the full run data.
			const forget = () => this.memoryStoppedExecutions.forget(executionId);
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
		this.pendingStopWorkflowId = target.workflow.id;
		this.pendingStop = this.finishStop(target, engines, usage, trigger)
			.catch((error: unknown) => {
				this.logger.error(
					'The memory guard stopped an execution, but could not check how much memory the stop freed',
					{ error: ensureError(error) },
				);
			})
			.finally(() => {
				this.pendingStop = undefined;
				this.pendingStopWorkflowId = undefined;
				this.lastStopEndedAt = Date.now();
			});

		return true;
	}

	/**
	 * Wait until the stopped engines end, then check whether the stop freed memory. If it
	 * did not and memory is still at the stop level, executions do not hold the memory, so
	 * the guard stops only at the critical level until memory falls. Below the stop level,
	 * other work can allocate during the stop, and the guard must still stop at the stop level.
	 */
	private async finishStop(
		target: StopTarget,
		engines: Array<Promise<void>>,
		before: MemoryUsage,
		trigger: StopTrigger,
	) {
		await settleWithin(engines, RELEASE_TIMEOUT_MS);
		const { after, freedMemory } = await this.measureAfterStop(before, target.estimatedBytes);
		// A stop below the stop level, for example at the hold limit, says nothing about this workflow.
		const isCounted =
			freedMemory &&
			before.utilization >= STOP_LEVEL &&
			this.pendingStopWorkflowId === target.workflow.id;
		const deactivation = isCounted ? this.countStop(target) : Promise.resolve(false);

		this.logger.warn(
			`Stopped execution ${target.rootId} of workflow ${target.workflow.id} at ${formatBytes(before.usedBytes)} of ${formatBytes(before.limitBytes)} (${trigger}). It held an estimated ${formatBytes(target.estimatedBytes)} of run data. Memory after the stop: ${formatBytes(after.usedBytes)}`,
			{ executionId: target.rootId, workflowId: target.workflow.id },
		);

		if (!freedMemory && after.utilization >= STOP_LEVEL) {
			this.isStandingDown = true;
			this.logger.warn(
				`The stop freed less memory than expected, so the memory guard now stops executions only at ${percent(CRITICAL_LEVEL)} or more, until memory falls below ${percent(RESUME_LEVEL)}`,
			);
		}

		const { largestEstimate, largestWorkflow } = target;
		// The event waits for the deactivation, but the next stop does not.
		void deactivation.then((workflowDeactivated) =>
			this.eventService.emit('memory-guard-execution-stopped', {
				executionId: target.rootId,
				workflowId: target.workflow.id,
				mode: target.mode,
				trigger,
				runningNodeType: nodeType(largestWorkflow, largestEstimate?.runningNode),
				largestDataNodeType: nodeType(largestWorkflow, largestNode(largestEstimate)?.name),
				estimatedBytes: target.estimatedBytes,
				memoryUsedBytes: before.usedBytes,
				memoryLimitBytes: before.limitBytes,
				freedMemory,
				workflowDeactivated,
			}),
		);
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
			if (status !== 'running') continue;
			// A finishing execution is saving its result, and a stop then would save it twice.
			if (
				this.memoryStoppedExecutions.isStopped(id) ||
				this.memoryStoppedExecutions.isFinishing(id)
			)
				continue;
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
			let largest: { executionId: string; estimate: RunDataEstimate } | undefined;
			for (const { executionId } of members) {
				const estimate = this.tracker.getEstimate(executionId);
				if (!estimate) continue;
				estimatedBytes += estimate.totalBytes;
				if (!largest || estimate.totalBytes > largest.estimate.totalBytes) {
					largest = { executionId, estimate };
				}
			}
			if (estimatedBytes === 0 || (target && estimatedBytes <= target.estimatedBytes)) continue;

			const root = this.activeExecutions.getExecutionOrFail(rootId).executionData;
			target = {
				rootId,
				workflow: root.workflowData,
				mode: root.executionMode,
				memberIds: members.sort((a, b) => a.depth - b.depth).map((m) => m.executionId),
				estimatedBytes,
				largestEstimate: largest?.estimate,
				largestWorkflow: this.activeExecutions.getExecutionOrFail(largest?.executionId ?? rootId)
					.executionData.workflowData,
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

	/** A successful production run shows that the workflow can run, so its count starts again. */
	@OnLifecycleEvent('workflowExecuteAfter')
	onExecutionEnd({ workflow, mode, runData }: WorkflowExecuteAfterContext) {
		if (runData.status === 'success' && isProductionMode(mode)) {
			this.stopsByWorkflow.delete(workflow.id);
			if (this.pendingStopWorkflowId === workflow.id) this.pendingStopWorkflowId = undefined;
		}
	}

	/**
	 * Count only stops of production runs, because a manual run uses the draft, not the published
	 * version. Resolves with whether the workflow was deactivated. Do not await it, so that slow
	 * trigger teardown does not delay the next stop.
	 */
	private async countStop({ workflow, mode }: StopTarget) {
		if (!isProductionMode(mode) || !isWorkflowIdValid(workflow.id)) return false;

		const stops = (this.stopsByWorkflow.get(workflow.id) ?? 0) + 1;
		this.stopsByWorkflow.set(workflow.id, stops);
		if (stops < STOPS_TO_DEACTIVATE || this.deactivating.has(workflow.id)) return false;

		this.deactivating.add(workflow.id);
		try {
			return await this.deactivate(workflow.id);
		} finally {
			this.deactivating.delete(workflow.id);
		}
	}

	/** Never throws. After a failure, the count stays, so the next counted stop tries again. */
	private async deactivate(workflowId: string) {
		try {
			const workflow = await this.workflowRepository.findOne({ where: { id: workflowId } });
			if (!workflow || workflow.activeVersionId === null) {
				this.stopsByWorkflow.delete(workflowId);
				return false;
			}

			// Lazy import, as in crash recovery, because the workflow service has many dependencies.
			const { WorkflowService } = await import('@/workflows/workflow.service.js');
			await Container.get(WorkflowService).deactivateWorkflowAsSystem(workflowId);
			this.stopsByWorkflow.delete(workflowId);
			this.logger.warn(
				`Deactivated workflow ${workflowId}, because n8n stopped ${STOPS_TO_DEACTIVATE} of its executions to keep the instance from running out of memory`,
				{ workflowId },
			);
			void this.notifyDeactivated(workflow);
			return true;
		} catch (error) {
			this.logger.error(`Failed to deactivate workflow ${workflowId}`, {
				workflowId,
				error: ensureError(error),
			});
			return false;
		}
	}

	private async notifyDeactivated(workflow: WorkflowEntity) {
		const workflowId = workflow.id;
		try {
			await this.workflowPushNotifier.notify(workflowId, {
				type: 'workflowAutoDeactivated',
				data: { workflowId },
			});
		} catch (error) {
			this.logger.error(`Failed to push the deactivation of workflow ${workflowId}`, {
				workflowId,
				error: ensureError(error),
			});
		}

		try {
			const recipient = await this.executionRecoveryService.getAutodeactivationRecipient(workflow);
			await this.mailer.notifyWorkflowAutodeactivated({
				recipient,
				workflow,
				reason: 'memory-pressure',
			});
		} catch (error) {
			this.logger.error(`Failed to email about the deactivation of workflow ${workflowId}`, {
				workflowId,
				error: ensureError(error),
			});
		}
	}
}

function percent(level: number) {
	return `${Math.round(level * 100)}%`;
}
