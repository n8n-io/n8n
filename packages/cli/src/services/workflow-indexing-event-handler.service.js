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
exports.WorkflowIndexingEventHandler = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const db_1 = require('@n8n/db');
const event_service_1 = require('@/events/event.service');
const search_engine_service_1 = require('./search-engine.service');
const workflow_indexing_service_1 = require('./workflow-indexing.service');
const search_analytics_service_1 = require('./search-analytics.service');
let WorkflowIndexingEventHandler = class WorkflowIndexingEventHandler {
	constructor(
		logger,
		eventService,
		searchEngineService,
		workflowIndexingService,
		searchAnalyticsService,
		workflowRepository,
	) {
		this.logger = logger;
		this.eventService = eventService;
		this.searchEngineService = searchEngineService;
		this.workflowIndexingService = workflowIndexingService;
		this.searchAnalyticsService = searchAnalyticsService;
		this.workflowRepository = workflowRepository;
		this.isInitialized = false;
	}
	init() {
		if (this.isInitialized) {
			this.logger.debug('Workflow indexing event handler already initialized');
			return;
		}
		if (!this.searchEngineService.isAvailable()) {
			this.logger.info('Search engine not available, skipping workflow indexing event handlers');
			return;
		}
		try {
			this.eventService.on('workflow-created', this.handleWorkflowCreated.bind(this));
			this.eventService.on('workflow-updated', this.handleWorkflowUpdated.bind(this));
			this.eventService.on('workflow-deleted', this.handleWorkflowDeleted.bind(this));
			this.eventService.on('workflow-activated', this.handleWorkflowActivated.bind(this));
			this.eventService.on('workflow-deactivated', this.handleWorkflowDeactivated.bind(this));
			this.eventService.on('workflows-bulk-updated', this.handleWorkflowsBulkUpdated.bind(this));
			this.eventService.on('workflows-bulk-deleted', this.handleWorkflowsBulkDeleted.bind(this));
			this.isInitialized = true;
			this.logger.info('Workflow indexing event handlers initialized');
		} catch (error) {
			this.logger.error('Failed to initialize workflow indexing event handlers', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	async handleWorkflowCreated(payload) {
		try {
			const workflow = await this.getWorkflowWithRelations(payload.workflowId);
			if (!workflow) {
				this.logger.warn('Workflow not found for indexing', { workflowId: payload.workflowId });
				return;
			}
			await this.workflowIndexingService.indexWorkflow(workflow, { refresh: false });
			this.logger.debug('Workflow indexed after creation', {
				workflowId: payload.workflowId,
				workflowName: payload.workflowName,
			});
		} catch (error) {
			this.logger.error('Failed to index workflow after creation', {
				workflowId: payload.workflowId,
				workflowName: payload.workflowName,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	async handleWorkflowUpdated(payload) {
		try {
			const workflow = await this.getWorkflowWithRelations(payload.workflowId);
			if (!workflow) {
				this.logger.warn('Workflow not found for re-indexing', { workflowId: payload.workflowId });
				return;
			}
			await this.workflowIndexingService.indexWorkflow(workflow, { refresh: false });
			this.logger.debug('Workflow re-indexed after update', {
				workflowId: payload.workflowId,
				workflowName: payload.workflowName,
				changes: payload.changes,
			});
		} catch (error) {
			this.logger.error('Failed to re-index workflow after update', {
				workflowId: payload.workflowId,
				workflowName: payload.workflowName,
				changes: payload.changes,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	async handleWorkflowDeleted(payload) {
		try {
			await this.workflowIndexingService.removeWorkflow(payload.workflowId, { refresh: false });
			this.logger.debug('Workflow removed from index after deletion', {
				workflowId: payload.workflowId,
				workflowName: payload.workflowName,
			});
		} catch (error) {
			this.logger.error('Failed to remove workflow from index after deletion', {
				workflowId: payload.workflowId,
				workflowName: payload.workflowName,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	async handleWorkflowActivated(payload) {
		try {
			const workflow = await this.getWorkflowWithRelations(payload.workflowId);
			if (!workflow) {
				this.logger.warn('Workflow not found for activation indexing', {
					workflowId: payload.workflowId,
				});
				return;
			}
			await this.workflowIndexingService.indexWorkflow(workflow, { refresh: false });
			this.logger.debug('Workflow re-indexed after activation', {
				workflowId: payload.workflowId,
				workflowName: payload.workflowName,
			});
		} catch (error) {
			this.logger.error('Failed to re-index workflow after activation', {
				workflowId: payload.workflowId,
				workflowName: payload.workflowName,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	async handleWorkflowDeactivated(payload) {
		try {
			const workflow = await this.getWorkflowWithRelations(payload.workflowId);
			if (!workflow) {
				this.logger.warn('Workflow not found for deactivation indexing', {
					workflowId: payload.workflowId,
				});
				return;
			}
			await this.workflowIndexingService.indexWorkflow(workflow, { refresh: false });
			this.logger.debug('Workflow re-indexed after deactivation', {
				workflowId: payload.workflowId,
				workflowName: payload.workflowName,
			});
		} catch (error) {
			this.logger.error('Failed to re-index workflow after deactivation', {
				workflowId: payload.workflowId,
				workflowName: payload.workflowName,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	async handleWorkflowsBulkUpdated(payload) {
		if (!payload.workflowIds || payload.workflowIds.length === 0) {
			return;
		}
		try {
			const workflows = await this.workflowRepository.find({
				where: { id: payload.workflowIds.includes.bind(payload.workflowIds) },
				relations: ['tags', 'shared', 'shared.project', 'parentFolder'],
			});
			if (workflows.length > 0) {
				const stats = await this.workflowIndexingService.bulkIndexWorkflows(workflows, {
					refresh: workflows.length < 10,
				});
				this.logger.debug('Bulk workflow re-indexing completed', {
					totalRequested: payload.workflowIds.length,
					totalProcessed: stats.totalProcessed,
					successCount: stats.successCount,
					errorCount: stats.errorCount,
					processingTimeMs: stats.processingTimeMs,
				});
			}
		} catch (error) {
			this.logger.error('Failed to bulk re-index workflows', {
				workflowIds: payload.workflowIds,
				totalCount: payload.totalCount,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	async handleWorkflowsBulkDeleted(payload) {
		if (!payload.workflowIds || payload.workflowIds.length === 0) {
			return;
		}
		try {
			await this.workflowIndexingService.bulkRemoveWorkflows(payload.workflowIds, {
				refresh: payload.workflowIds.length < 10,
			});
			this.logger.debug('Bulk workflow removal from index completed', {
				workflowIds: payload.workflowIds,
				totalCount: payload.totalCount,
			});
		} catch (error) {
			this.logger.error('Failed to bulk remove workflows from index', {
				workflowIds: payload.workflowIds,
				totalCount: payload.totalCount,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	async getWorkflowWithRelations(workflowId) {
		try {
			return await this.workflowRepository.findOne({
				where: { id: workflowId },
				relations: ['tags', 'shared', 'shared.project', 'parentFolder'],
			});
		} catch (error) {
			this.logger.error('Failed to fetch workflow with relations', {
				workflowId,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}
	async schedulePeriodicRefresh() {
		if (!this.searchEngineService.isAvailable()) {
			return;
		}
		try {
			setInterval(async () => {
				try {
					await this.searchEngineService.refreshIndex('workflows');
					this.logger.debug('Periodic search index refresh completed');
				} catch (error) {
					this.logger.warn('Periodic search index refresh failed', {
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}, 30 * 1000);
			this.logger.debug('Periodic search index refresh scheduled');
		} catch (error) {
			this.logger.error('Failed to schedule periodic search index refresh', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	async onShutdown() {
		if (this.isInitialized) {
			try {
				this.eventService.removeAllListeners('workflow-created');
				this.eventService.removeAllListeners('workflow-updated');
				this.eventService.removeAllListeners('workflow-deleted');
				this.eventService.removeAllListeners('workflow-activated');
				this.eventService.removeAllListeners('workflow-deactivated');
				this.eventService.removeAllListeners('workflows-bulk-updated');
				this.eventService.removeAllListeners('workflows-bulk-deleted');
				this.logger.debug('Workflow indexing event handlers cleaned up');
			} catch (error) {
				this.logger.error('Failed to cleanup workflow indexing event handlers', {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}
};
exports.WorkflowIndexingEventHandler = WorkflowIndexingEventHandler;
exports.WorkflowIndexingEventHandler = WorkflowIndexingEventHandler = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			event_service_1.EventService,
			search_engine_service_1.SearchEngineService,
			workflow_indexing_service_1.WorkflowIndexingService,
			search_analytics_service_1.SearchAnalyticsService,
			db_1.WorkflowRepository,
		]),
	],
	WorkflowIndexingEventHandler,
);
//# sourceMappingURL=workflow-indexing-event-handler.service.js.map
