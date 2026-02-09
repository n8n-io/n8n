import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { DateTime } from 'luxon';

import type { ExecutionQuotaConfig, QuotaPeriod } from './database/entities/execution-quota-config';
import { ExecutionQuotaConfigRepository } from './database/repositories/execution-quota-config.repository';
import { ExecutionQuotaCounterRepository } from './database/repositories/execution-quota-counter.repository';
import { ExecutionQuotaModuleConfig } from './execution-quota.config';

export interface QuotaCheckResult {
	allowed: boolean;
	/** The config that was exceeded (if any) */
	exceededConfig?: ExecutionQuotaConfig;
	currentCount?: number;
	periodStart?: Date;
}

@Service()
export class ExecutionQuotaService {
	/** In-memory cache for quota configs keyed by `${projectId}:${workflowId}` */
	private configCache = new Map<string, { configs: ExecutionQuotaConfig[]; cachedAt: number }>();

	constructor(
		private readonly configRepository: ExecutionQuotaConfigRepository,
		private readonly counterRepository: ExecutionQuotaCounterRepository,
		private readonly config: ExecutionQuotaModuleConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('execution-quota');
	}

	/**
	 * Check if a workflow execution would exceed any applicable quota.
	 * Returns the first exceeded quota config, or allowed=true if all quotas pass.
	 */
	async checkQuota(workflowId: string, projectId: string): Promise<QuotaCheckResult> {
		const configs = await this.getApplicableConfigs(projectId, workflowId);

		if (configs.length === 0) {
			return { allowed: true };
		}

		for (const quotaConfig of configs) {
			const periodStart = this.calculatePeriodStart(quotaConfig.period);
			const isWorkflowLevel = quotaConfig.workflowId !== null;
			const currentCount = await this.counterRepository.getCount(
				projectId,
				isWorkflowLevel ? workflowId : null,
				periodStart,
			);

			if (currentCount >= quotaConfig.limit) {
				return {
					allowed: false,
					exceededConfig: quotaConfig,
					currentCount,
					periodStart,
				};
			}
		}

		return { allowed: true };
	}

	/**
	 * Calculate the start of the current period for a given period type.
	 */
	calculatePeriodStart(period: QuotaPeriod): Date {
		const now = DateTime.utc();

		switch (period) {
			case 'hourly':
				return now.startOf('hour').toJSDate();
			case 'daily':
				return now.startOf('day').toJSDate();
			case 'weekly':
				return now.startOf('week').toJSDate();
			case 'monthly':
				return now.startOf('month').toJSDate();
		}
	}

	/** Invalidate the config cache (called after CRUD operations) */
	refreshCache() {
		this.configCache.clear();
	}

	/** Prune counter data older than the retention period */
	async pruneOldCounters(): Promise<number> {
		const olderThan = DateTime.utc().minus({ months: this.config.retentionMonths }).toJSDate();

		const pruned = await this.counterRepository.pruneOldCounters(olderThan);

		if (pruned > 0) {
			this.logger.info(`Pruned ${pruned} old quota counter records`);
		}

		return pruned;
	}

	private async getApplicableConfigs(
		projectId: string,
		workflowId: string,
	): Promise<ExecutionQuotaConfig[]> {
		const cacheKey = `${projectId}:${workflowId}`;
		const cached = this.configCache.get(cacheKey);
		const ttlMs = this.config.cacheTtlMinutes * 60 * 1000;

		if (cached && Date.now() - cached.cachedAt < ttlMs) {
			return cached.configs;
		}

		const configs = await this.configRepository.findApplicableConfigs(projectId, workflowId);

		this.configCache.set(cacheKey, { configs, cachedAt: Date.now() });

		return configs;
	}
}
