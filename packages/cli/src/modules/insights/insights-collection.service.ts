import { Logger } from '@n8n/backend-common';
import { SharedWorkflowRepository } from '@n8n/db';
import { OnLifecycleEvent, type WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { DateTime } from 'luxon';
import { UnexpectedError, type ExecutionStatus, type WorkflowExecuteMode } from 'n8n-workflow';

import { InsightsMetadata } from '@/modules/insights/database/entities/insights-metadata';
import { InsightsRaw } from '@/modules/insights/database/entities/insights-raw';

import { InsightsMetadataRepository } from './database/repositories/insights-metadata.repository';
import { InsightsRawRepository } from './database/repositories/insights-raw.repository';
import { InsightsConfig } from './insights.config';

const shouldSkipStatus: Record<ExecutionStatus, boolean> = {
	success: false,
	crashed: false,
	error: false,

	canceled: true,
	new: true,
	running: true,
	unknown: true,
	waiting: true,
};

const shouldSkipMode: Record<WorkflowExecuteMode, boolean> = {
	cli: false,
	error: false,
	retry: false,
	trigger: false,
	webhook: false,
	evaluation: false,

	// sub workflows
	integrated: true,

	// error workflows
	internal: true,

	manual: true,
};

type BufferedInsight = Pick<InsightsRaw, 'type' | 'value' | 'timestamp'> & {
	workflowId: string;
	workflowName: string;
};

/**
 * This service is responsible for collecting insights event, store them in a buffer,
 * and flushing this buffer to the database
 */
@Service()
export class InsightsCollectionService {
	private readonly cachedMetadata: Map<string, InsightsMetadata> = new Map();

	private bufferedInsights: Set<BufferedInsight> = new Set();

	private flushInsightsRawBufferTimer: NodeJS.Timeout | undefined;

	private isAsynchronouslySavingInsights = true;

	private flushesInProgress: Set<Promise<void>> = new Set();

	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly insightsRawRepository: InsightsRawRepository,
		private readonly insightsMetadataRepository: InsightsMetadataRepository,
		private readonly insightsConfig: InsightsConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('insights');
	}

	startFlushingTimer() {
		this.isAsynchronouslySavingInsights = true;
		this.scheduleFlushing();
		this.logger.debug('Started flushing timer');
	}

	scheduleFlushing() {
		this.cancelScheduledFlushing();
		this.flushInsightsRawBufferTimer = setTimeout(
			async () => await this.flushEvents(),
			this.insightsConfig.flushIntervalSeconds * 1000,
		);
	}

	cancelScheduledFlushing() {
		if (this.flushInsightsRawBufferTimer !== undefined) {
			clearTimeout(this.flushInsightsRawBufferTimer);
			this.flushInsightsRawBufferTimer = undefined;
		}
	}

	stopFlushingTimer() {
		this.cancelScheduledFlushing();
		this.logger.debug('Stopped flushing timer');
	}

	async shutdown() {
		this.stopFlushingTimer();

		// Prevent new insights from being added to the buffer (and never flushed)
		// when remaining workflows are handled during shutdown
		this.isAsynchronouslySavingInsights = false;

		// Wait for all in-progress asynchronous flushes
		// Flush any remaining events
		this.logger.debug('Flushing remaining insights before shutdown');
		await Promise.all([...this.flushesInProgress, this.flushEvents()]);
	}

	@OnLifecycleEvent('workflowExecuteAfter')
	async handleWorkflowExecuteAfter(ctx: WorkflowExecuteAfterContext) {
		if (shouldSkipStatus[ctx.runData.status] || shouldSkipMode[ctx.runData.mode]) {
			return;
		}

		const status = ctx.runData.status === 'success' ? 'success' : 'failure';

		const commonWorkflowData = {
			workflowId: ctx.workflow.id,
			workflowName: ctx.workflow.name,
			timestamp: DateTime.utc().toJSDate(),
		};

		// success or failure event
		this.bufferedInsights.add({
			...commonWorkflowData,
			type: status,
			value: 1,
		});

		// run time event
		if (ctx.runData.stoppedAt) {
			const value = ctx.runData.stoppedAt.getTime() - ctx.runData.startedAt.getTime();
			this.bufferedInsights.add({
				...commonWorkflowData,
				type: 'runtime_ms',
				value,
			});
		}

		// time saved event
		if (status === 'success' && ctx.workflow.settings?.timeSavedPerExecution) {
			this.bufferedInsights.add({
				...commonWorkflowData,
				type: 'time_saved_min',
				value: ctx.workflow.settings.timeSavedPerExecution,
			});
		}

		if (!this.isAsynchronouslySavingInsights) {
			this.logger.debug('Flushing insights synchronously (shutdown in progress)');
			// If we are not asynchronously saving insights, we need to flush the events
			await this.flushEvents();
		}

		// If the buffer is full, flush the events asynchronously
		if (this.bufferedInsights.size >= this.insightsConfig.flushBatchSize) {
			this.logger.debug(`Buffer is full (${this.bufferedInsights.size} insights), flushing events`);
			// Fire and forget flush to avoid blocking the workflow execute after handler
			void this.flushEvents();
		}
	}

	private async saveInsightsMetadataAndRaw(insightsRawToInsertBuffer: Set<BufferedInsight>) {
		this.logger.debug(`Flushing ${insightsRawToInsertBuffer.size} insights`);
		const workflowIdNames: Map<string, string> = new Map();

		for (const event of insightsRawToInsertBuffer) {
			workflowIdNames.set(event.workflowId, event.workflowName);
		}

		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			where: { workflowId: In([...workflowIdNames.keys()]), role: 'workflow:owner' },
			relations: { project: true },
		});

		// Upsert metadata for the workflows that are not already in the cache or have
		// different project or workflow names
		const metadataToUpsert = sharedWorkflows.reduce((acc, workflow) => {
			const cachedMetadata = this.cachedMetadata.get(workflow.workflowId);
			if (
				!cachedMetadata ||
				cachedMetadata.projectId !== workflow.projectId ||
				cachedMetadata.projectName !== workflow.project.name ||
				cachedMetadata.workflowName !== workflowIdNames.get(workflow.workflowId)
			) {
				const metadata = new InsightsMetadata();
				metadata.projectId = workflow.projectId;
				metadata.projectName = workflow.project.name;
				metadata.workflowId = workflow.workflowId;
				metadata.workflowName = workflowIdNames.get(workflow.workflowId)!;

				acc.push(metadata);
			}
			return acc;
		}, [] as InsightsMetadata[]);

		this.logger.debug(`Saving ${metadataToUpsert.length} insights metadata for workflows`);
		await this.insightsMetadataRepository.upsert(metadataToUpsert, ['workflowId']);

		const upsertMetadata = await this.insightsMetadataRepository.findBy({
			workflowId: In(metadataToUpsert.map((m) => m.workflowId)),
		});
		for (const metadata of upsertMetadata) {
			this.cachedMetadata.set(metadata.workflowId, metadata);
		}

		const events: InsightsRaw[] = [];
		for (const event of insightsRawToInsertBuffer) {
			const insight = new InsightsRaw();
			const metadata = this.cachedMetadata.get(event.workflowId);
			if (!metadata) {
				// could not find shared workflow for this insight (not supposed to happen)
				throw new UnexpectedError(
					`Could not find shared workflow for insight with workflowId ${event.workflowId}`,
				);
			}
			insight.metaId = metadata.metaId;
			insight.type = event.type;
			insight.value = event.value;
			insight.timestamp = event.timestamp;

			events.push(insight);
		}

		this.logger.debug(`Inserting ${events.length} insights raw`);
		await this.insightsRawRepository.insert(events);
	}

	async flushEvents() {
		// Prevent flushing if there are no events to flush
		if (this.bufferedInsights.size === 0) {
			// reschedule the timer to flush again
			this.scheduleFlushing();
			return;
		}

		// Stop timer to prevent concurrent flush from timer
		this.cancelScheduledFlushing();

		// Copy the buffer to a new set to avoid concurrent modification
		// while we are flushing the events
		const bufferedInsightsToFlush = new Set(this.bufferedInsights);
		this.bufferedInsights.clear();

		let flushPromise: Promise<void> | undefined = undefined;
		flushPromise = (async () => {
			try {
				await this.saveInsightsMetadataAndRaw(bufferedInsightsToFlush);
			} catch (e) {
				this.logger.error('Error while saving insights metadata and raw data', { error: e });
				for (const event of bufferedInsightsToFlush) {
					this.bufferedInsights.add(event);
				}
			} finally {
				this.scheduleFlushing();
				this.flushesInProgress.delete(flushPromise!);
			}
		})();

		// Add the flush promise to the set of flushes in progress for shutdown await
		this.flushesInProgress.add(flushPromise);
		await flushPromise;
	}
}
