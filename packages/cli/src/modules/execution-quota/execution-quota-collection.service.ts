import { Logger } from '@n8n/backend-common';
import { SharedWorkflowRepository } from '@n8n/db';
import { OnLifecycleEvent, type WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { WorkflowExecuteMode } from 'n8n-workflow';

import { ExecutionQuotaCounterRepository } from './database/repositories/execution-quota-counter.repository';
import { ExecutionQuotaModuleConfig } from './execution-quota.config';
import { ExecutionQuotaService } from './execution-quota.service';

const shouldSkipMode: Record<WorkflowExecuteMode, boolean> = {
	// Count these modes
	cli: false,
	error: false,
	retry: false,
	trigger: false,
	webhook: false,
	evaluation: false,

	// Skip sub-workflows (counted via parent)
	integrated: true,
	// Skip error workflows (internal)
	internal: true,
	// Skip manual test executions
	manual: true,
	// Skip chat hub messages
	chat: true,
};

interface BufferedCounter {
	projectId: string;
	workflowId: string;
	periodStart: Date;
}

/**
 * Collects execution counts after workflow execution and buffers them
 * for periodic flushing to the database.
 */
@Service()
export class ExecutionQuotaCollectionService {
	private bufferedCounters = new Set<BufferedCounter>();

	private flushTimer: NodeJS.Timeout | undefined;

	private isInitialized = false;

	private flushesInProgress = new Set<Promise<void>>();

	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly counterRepository: ExecutionQuotaCounterRepository,
		private readonly quotaService: ExecutionQuotaService,
		private readonly config: ExecutionQuotaModuleConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('execution-quota');
	}

	init() {
		this.isInitialized = true;
		this.scheduleFlushing();
		this.logger.debug('Started counter flushing timer');
	}

	async shutdown() {
		this.cancelScheduledFlushing();
		this.isInitialized = false;

		this.logger.debug('Flushing remaining counters before shutdown');
		await Promise.all([...this.flushesInProgress, this.flushCounters()]);
	}

	@OnLifecycleEvent('workflowExecuteAfter')
	async handleWorkflowExecuteAfter(ctx: WorkflowExecuteAfterContext) {
		if (!this.isInitialized) return;

		if (shouldSkipMode[ctx.runData.mode]) return;

		const shared = await this.sharedWorkflowRepository.findOne({
			where: { workflowId: ctx.workflow.id, role: 'workflow:owner' },
		});

		if (!shared) return;

		// Determine period starts for all configured periods
		// We increment counters for all active period types
		const periods = ['hourly', 'daily', 'weekly', 'monthly'] as const;
		for (const period of periods) {
			const periodStart = this.quotaService.calculatePeriodStart(period);

			// Project-level counter
			this.bufferedCounters.add({
				projectId: shared.projectId,
				workflowId: '', // empty string signals project-level
				periodStart,
			});

			// Workflow-level counter
			this.bufferedCounters.add({
				projectId: shared.projectId,
				workflowId: ctx.workflow.id,
				periodStart,
			});
		}

		if (this.bufferedCounters.size >= this.config.flushBatchSize) {
			this.logger.debug(`Buffer full (${this.bufferedCounters.size}), flushing counters`);
			void this.flushCounters();
		}
	}

	private scheduleFlushing() {
		if (!this.isInitialized) return;

		this.cancelScheduledFlushing();
		this.flushTimer = setTimeout(
			async () => await this.flushCounters(),
			this.config.flushIntervalSeconds * 1000,
		);
	}

	private cancelScheduledFlushing() {
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = undefined;
		}
	}

	private async flushCounters() {
		if (!this.isInitialized || this.bufferedCounters.size === 0) {
			this.scheduleFlushing();
			return;
		}

		this.cancelScheduledFlushing();

		const countersToFlush = new Set(this.bufferedCounters);
		this.bufferedCounters.clear();

		const flushPromise: Promise<void> = (async () => {
			try {
				// Group by unique counter key and sum counts
				const counterMap = new Map<
					string,
					{ projectId: string; workflowId: string | null; periodStart: Date; count: number }
				>();

				for (const counter of countersToFlush) {
					const key = `${counter.projectId}:${counter.workflowId}:${counter.periodStart.getTime()}`;
					const existing = counterMap.get(key);
					if (existing) {
						existing.count++;
					} else {
						counterMap.set(key, {
							projectId: counter.projectId,
							workflowId: counter.workflowId || null,
							periodStart: counter.periodStart,
							count: 1,
						});
					}
				}

				this.logger.debug(`Flushing ${counterMap.size} unique counters`);

				for (const { projectId, workflowId, periodStart, count } of counterMap.values()) {
					await this.counterRepository.incrementCounter(projectId, workflowId, periodStart, count);
				}
			} catch (error) {
				this.logger.error('Error flushing counters, re-buffering', { error });
				for (const counter of countersToFlush) {
					this.bufferedCounters.add(counter);
				}
			} finally {
				this.scheduleFlushing();
			}
		})();

		this.flushesInProgress.add(flushPromise);
		await flushPromise.finally(() => this.flushesInProgress.delete(flushPromise));
	}
}
