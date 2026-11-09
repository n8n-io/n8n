import type { LlmUsageRecord, LlmUsageSink } from '@n8n/ai-utilities/llm-usage';
import { LLM_USAGE_RANGE_DAYS } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import type { LlmUsage } from './llm-usage.entity';
import { LlmBudgetSpendService } from './llm-budget-spend.service';
import { LlmUsageRepository } from './llm-usage.repository';
import { PriceCatalogService } from './price-catalog.service';
import { priceUsage } from './pricing';
import { WorkflowPublisherCache } from './workflow-publisher-cache';

/** How often the buffer is written, and the first retry delay after a failed write. */
const FLUSH_INTERVAL_MS = 5 * Time.seconds.toMilliseconds;
/**
 * Records in one write, and the unit that is retried after a failed write. The repository
 * also splits its inserts at the same size, for the database parameter limits.
 */
const FLUSH_SIZE = 500;
/** Unpriced calls read at a time when repricing. */
const REPRICE_PAGE = 1_000;
/** The longest delay between retries of a failed write. */
const MAX_BACKOFF_MS = Time.minutes.toMilliseconds;
/** Buffered records above which a warning is logged, at most once each `WARN_INTERVAL_MS`. */
const WARN_SIZE = 10_000;
const WARN_INTERVAL_MS = Time.minutes.toMilliseconds;
/** Repricing covers the longest range the API reports. */
const REPRICE_WINDOW_MS = Math.max(...LLM_USAGE_RANGE_DAYS) * Time.days.toMilliseconds;

/**
 * Buffers captured LLM calls and writes them in batches. While the process runs, a record is
 * never dropped: a failed batch goes back to the buffer and is retried with backoff. After shutdown starts,
 * each record is written at once: executions still finish, and the process can exit right after.
 */
@Service()
export class LlmUsageCollector implements LlmUsageSink {
	private buffer: LlmUsageRecord[] = [];

	private flushing: Promise<void> | undefined;

	private timer: NodeJS.Timeout | undefined;

	private retryAt = 0;

	private backoffMs = FLUSH_INTERVAL_MS;

	private lastWarnAt = 0;

	private repricePending = false;

	private draining = false;

	constructor(
		private readonly repository: LlmUsageRepository,
		private readonly catalog: PriceCatalogService,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		private readonly publishers: WorkflowPublisherCache,
		private readonly budgetSpend: LlmBudgetSpendService,
	) {
		this.logger = this.logger.scoped('llm-usage');
	}

	start() {
		this.catalog.onChange(() => (this.repricePending = true));
		this.timer = setInterval(async () => {
			await this.flush();
			await this.reprice();
		}, FLUSH_INTERVAL_MS);
		this.timer.unref();
	}

	write(record: LlmUsageRecord) {
		this.buffer.push(record);
		// Budgets see the call at once, not after the next flush and refresh.
		this.budgetSpend.add(this.toRow(record));
		if (this.draining || this.buffer.length >= FLUSH_SIZE) void this.flush();
	}

	/** Writes the buffer. A call while a write runs waits for it, then writes what is left. */
	async flush() {
		if (this.flushing) await this.flushing;
		this.flushing ??= this.writeBuffer().finally(() => {
			this.flushing = undefined;
		});
		await this.flushing;
	}

	/**
	 * Prices the calls stored without a price, once after each new catalog. Calls are stored
	 * unpriced while no catalog is loaded, or when the catalog does not have the model. Only the
	 * leader main process does it: every process loads the catalog at startup, and one pass
	 * prices the rows of all of them.
	 */
	async reprice() {
		if (!this.repricePending || !this.instanceSettings.isLeader) return;
		this.repricePending = false;
		try {
			const since = new Date(Date.now() - REPRICE_WINDOW_MS);
			let afterCallId: string | undefined;
			while (true) {
				const calls = await this.repository.findUnpriced(since, REPRICE_PAGE, afterCallId);
				const prices = calls.flatMap((call) => {
					const { estimatedCostUsd } = priceUsage(
						call,
						this.catalog.lookup(call.provider, call.model, call.inputTokens),
					);
					return estimatedCostUsd === null ? [] : [{ callId: call.callId, estimatedCostUsd }];
				});
				await this.repository.setPrices(prices);
				if (calls.length < REPRICE_PAGE) break;
				afterCallId = calls[calls.length - 1].callId;
			}
		} catch (error) {
			this.repricePending = true;
			this.logger.warn('Could not price the stored LLM calls, retrying later', { error });
		}
	}

	/**
	 * Writes what is buffered and switches to writing each record at once. After a failed write,
	 * records wait for the next retry: the timer keeps running while executions finish.
	 */
	async shutdown() {
		this.draining = true;
		this.retryAt = 0;
		await this.flush();
		if (this.buffer.length > 0) {
			this.logger.warn('LLM usage records are not saved yet at shutdown', {
				count: this.buffer.length,
			});
		}
	}

	private async writeBuffer() {
		// Records that arrive during a write join the next batch of this loop.
		while (this.buffer.length > 0 && Date.now() >= this.retryAt) {
			const batch = this.buffer.splice(0, FLUSH_SIZE);
			try {
				await this.repository.insertIgnoringDuplicates(batch.map((record) => this.toRow(record)));
				this.retryAt = 0;
				this.backoffMs = FLUSH_INTERVAL_MS;
			} catch (error) {
				// The insert ignores existing call IDs, so retrying a partly written batch is safe.
				this.buffer.unshift(...batch);
				this.retryAt = Date.now() + this.backoffMs;
				this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
				this.logger.error('Could not save LLM usage records, retrying later', {
					error,
					count: batch.length,
				});
				this.warnIfLarge();
			}
		}
	}

	private warnIfLarge() {
		if (this.buffer.length <= WARN_SIZE || Date.now() - this.lastWarnAt < WARN_INTERVAL_MS) return;
		this.lastWarnAt = Date.now();
		this.logger.warn('LLM usage records are waiting for the database', {
			count: this.buffer.length,
		});
	}

	private toRow({ context, ...usage }: LlmUsageRecord): Partial<LlmUsage> {
		return {
			callId: usage.id,
			startedAt: usage.startedAt ?? null,
			finishedAt: usage.finishedAt,
			durationMs: usage.startedAt ? usage.finishedAt.getTime() - usage.startedAt.getTime() : null,
			callerType: context.callerType,
			subType: usage.subType ?? null,
			workflowId: context.workflowId ?? null,
			executionId: context.executionId ?? null,
			executionMode: context.executionMode ?? null,
			nodeName: context.nodeName ?? null,
			nodeType: context.nodeType ?? null,
			agentId: context.agentId ?? null,
			threadId: context.threadId ?? null,
			projectId: context.projectId ?? null,
			userId: context.userId ?? null,
			accountableUserId: this.publishers.accountableUserId(context) ?? null,
			credentialId: usage.credential && 'id' in usage.credential ? usage.credential.id : null,
			managedBy:
				usage.credential && 'managedBy' in usage.credential ? usage.credential.managedBy : null,
			provider: usage.provider,
			model: usage.model,
			providerResponseId: usage.providerResponseId ?? null,
			inputTokens: usage.inputTokens,
			outputTokens: usage.outputTokens,
			cacheReadTokens: usage.cacheReadTokens ?? 0,
			cacheWriteTokens: usage.cacheWriteTokens ?? 0,
			...priceUsage(usage, this.catalog.lookup(usage.provider, usage.model, usage.inputTokens)),
		};
	}
}
