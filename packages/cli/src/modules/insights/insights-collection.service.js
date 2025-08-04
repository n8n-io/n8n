'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.InsightsCollectionService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const luxon_1 = require('luxon');
const n8n_workflow_1 = require('n8n-workflow');
const insights_metadata_1 = require('@/modules/insights/database/entities/insights-metadata');
const insights_raw_1 = require('@/modules/insights/database/entities/insights-raw');
const insights_metadata_repository_1 = require('./database/repositories/insights-metadata.repository');
const insights_raw_repository_1 = require('./database/repositories/insights-raw.repository');
const insights_config_1 = require('./insights.config');
const shouldSkipStatus = {
	success: false,
	crashed: false,
	error: false,
	canceled: true,
	new: true,
	running: true,
	unknown: true,
	waiting: true,
};
const shouldSkipMode = {
	cli: false,
	error: false,
	retry: false,
	trigger: false,
	webhook: false,
	evaluation: false,
	integrated: true,
	internal: true,
	manual: true,
};
let InsightsCollectionService = class InsightsCollectionService {
	constructor(
		sharedWorkflowRepository,
		insightsRawRepository,
		insightsMetadataRepository,
		insightsConfig,
		logger,
	) {
		this.sharedWorkflowRepository = sharedWorkflowRepository;
		this.insightsRawRepository = insightsRawRepository;
		this.insightsMetadataRepository = insightsMetadataRepository;
		this.insightsConfig = insightsConfig;
		this.logger = logger;
		this.cachedMetadata = new Map();
		this.bufferedInsights = new Set();
		this.isAsynchronouslySavingInsights = true;
		this.flushesInProgress = new Set();
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
		this.isAsynchronouslySavingInsights = false;
		this.logger.debug('Flushing remaining insights before shutdown');
		await Promise.all([...this.flushesInProgress, this.flushEvents()]);
	}
	async handleWorkflowExecuteAfter(ctx) {
		if (shouldSkipStatus[ctx.runData.status] || shouldSkipMode[ctx.runData.mode]) {
			return;
		}
		const status = ctx.runData.status === 'success' ? 'success' : 'failure';
		const commonWorkflowData = {
			workflowId: ctx.workflow.id,
			workflowName: ctx.workflow.name,
			timestamp: luxon_1.DateTime.utc().toJSDate(),
		};
		this.bufferedInsights.add({
			...commonWorkflowData,
			type: status,
			value: 1,
		});
		if (ctx.runData.stoppedAt) {
			const value = ctx.runData.stoppedAt.getTime() - ctx.runData.startedAt.getTime();
			this.bufferedInsights.add({
				...commonWorkflowData,
				type: 'runtime_ms',
				value,
			});
		}
		if (status === 'success' && ctx.workflow.settings?.timeSavedPerExecution) {
			this.bufferedInsights.add({
				...commonWorkflowData,
				type: 'time_saved_min',
				value: ctx.workflow.settings.timeSavedPerExecution,
			});
		}
		if (!this.isAsynchronouslySavingInsights) {
			this.logger.debug('Flushing insights synchronously (shutdown in progress)');
			await this.flushEvents();
		}
		if (this.bufferedInsights.size >= this.insightsConfig.flushBatchSize) {
			this.logger.debug(`Buffer is full (${this.bufferedInsights.size} insights), flushing events`);
			void this.flushEvents();
		}
	}
	async saveInsightsMetadataAndRaw(insightsRawToInsertBuffer) {
		this.logger.debug(`Flushing ${insightsRawToInsertBuffer.size} insights`);
		const workflowIdNames = new Map();
		for (const event of insightsRawToInsertBuffer) {
			workflowIdNames.set(event.workflowId, event.workflowName);
		}
		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			where: { workflowId: (0, typeorm_1.In)([...workflowIdNames.keys()]), role: 'workflow:owner' },
			relations: { project: true },
		});
		const metadataToUpsert = sharedWorkflows.reduce((acc, workflow) => {
			const cachedMetadata = this.cachedMetadata.get(workflow.workflowId);
			if (
				!cachedMetadata ||
				cachedMetadata.projectId !== workflow.projectId ||
				cachedMetadata.projectName !== workflow.project.name ||
				cachedMetadata.workflowName !== workflowIdNames.get(workflow.workflowId)
			) {
				const metadata = new insights_metadata_1.InsightsMetadata();
				metadata.projectId = workflow.projectId;
				metadata.projectName = workflow.project.name;
				metadata.workflowId = workflow.workflowId;
				metadata.workflowName = workflowIdNames.get(workflow.workflowId);
				acc.push(metadata);
			}
			return acc;
		}, []);
		this.logger.debug(`Saving ${metadataToUpsert.length} insights metadata for workflows`);
		await this.insightsMetadataRepository.upsert(metadataToUpsert, ['workflowId']);
		const upsertMetadata = await this.insightsMetadataRepository.findBy({
			workflowId: (0, typeorm_1.In)(metadataToUpsert.map((m) => m.workflowId)),
		});
		for (const metadata of upsertMetadata) {
			this.cachedMetadata.set(metadata.workflowId, metadata);
		}
		const events = [];
		for (const event of insightsRawToInsertBuffer) {
			const insight = new insights_raw_1.InsightsRaw();
			const metadata = this.cachedMetadata.get(event.workflowId);
			if (!metadata) {
				throw new n8n_workflow_1.UnexpectedError(
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
		if (this.bufferedInsights.size === 0) {
			this.scheduleFlushing();
			return;
		}
		this.cancelScheduledFlushing();
		const bufferedInsightsToFlush = new Set(this.bufferedInsights);
		this.bufferedInsights.clear();
		let flushPromise = undefined;
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
				this.flushesInProgress.delete(flushPromise);
			}
		})();
		this.flushesInProgress.add(flushPromise);
		await flushPromise;
	}
};
exports.InsightsCollectionService = InsightsCollectionService;
__decorate(
	[
		(0, decorators_1.OnLifecycleEvent)('workflowExecuteAfter'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	InsightsCollectionService.prototype,
	'handleWorkflowExecuteAfter',
	null,
);
exports.InsightsCollectionService = InsightsCollectionService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			db_1.SharedWorkflowRepository,
			insights_raw_repository_1.InsightsRawRepository,
			insights_metadata_repository_1.InsightsMetadataRepository,
			insights_config_1.InsightsConfig,
			backend_common_1.Logger,
		]),
	],
	InsightsCollectionService,
);
//# sourceMappingURL=insights-collection.service.js.map
