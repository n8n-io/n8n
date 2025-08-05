import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { WorkflowEntity } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { OnShutdown } from '@n8n/types';

import { EventService } from '@/events/event.service';
import { SearchEngineService } from './search-engine.service';
import { WorkflowIndexingService } from './workflow-indexing.service';
import { SearchAnalyticsService } from './search-analytics.service';

interface WorkflowEventPayload {
	user: { id: string; email?: string };
	workflowId: string;
	workflowName: string;
	changes?: string[];
}

@Service()
export class WorkflowIndexingEventHandler implements OnShutdown {
	private isInitialized = false;

	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly searchEngineService: SearchEngineService,
		private readonly workflowIndexingService: WorkflowIndexingService,
		private readonly searchAnalyticsService: SearchAnalyticsService,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	/**
	 * Initialize event listeners for workflow indexing
	 */
	init(): void {
		if (this.isInitialized) {
			this.logger.debug('Workflow indexing event handler already initialized');
			return;
		}

		if (!this.searchEngineService.isAvailable()) {
			this.logger.info('Search engine not available, skipping workflow indexing event handlers');
			return;
		}

		try {
			// Listen for workflow lifecycle events
			this.eventService.on('workflow-created', this.handleWorkflowCreated.bind(this));
			this.eventService.on('workflow-updated', this.handleWorkflowUpdated.bind(this));
			this.eventService.on('workflow-deleted', this.handleWorkflowDeleted.bind(this));
			this.eventService.on('workflow-activated', this.handleWorkflowActivated.bind(this));
			this.eventService.on('workflow-deactivated', this.handleWorkflowDeactivated.bind(this));

			// Listen for bulk operations
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

	/**
	 * Handle workflow creation events
	 */
	private async handleWorkflowCreated(payload: WorkflowEventPayload): Promise<void> {
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

	/**
	 * Handle workflow update events
	 */
	private async handleWorkflowUpdated(payload: WorkflowEventPayload): Promise<void> {
		try {
			const workflow = await this.getWorkflowWithRelations(payload.workflowId);
			if (!workflow) {
				this.logger.warn('Workflow not found for re-indexing', { workflowId: payload.workflowId });
				return;
			}

			// Re-index the updated workflow
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

	/**
	 * Handle workflow deletion events
	 */
	private async handleWorkflowDeleted(payload: WorkflowEventPayload): Promise<void> {
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

	/**
	 * Handle workflow activation events
	 */
	private async handleWorkflowActivated(payload: WorkflowEventPayload): Promise<void> {
		try {
			const workflow = await this.getWorkflowWithRelations(payload.workflowId);
			if (!workflow) {
				this.logger.warn('Workflow not found for activation indexing', {
					workflowId: payload.workflowId,
				});
				return;
			}

			// Re-index with updated active status
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

	/**
	 * Handle workflow deactivation events
	 */
	private async handleWorkflowDeactivated(payload: WorkflowEventPayload): Promise<void> {
		try {
			const workflow = await this.getWorkflowWithRelations(payload.workflowId);
			if (!workflow) {
				this.logger.warn('Workflow not found for deactivation indexing', {
					workflowId: payload.workflowId,
				});
				return;
			}

			// Re-index with updated active status
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

	/**
	 * Handle bulk workflow update events
	 */
	private async handleWorkflowsBulkUpdated(payload: {
		user: { id: string; email?: string };
		workflowIds: string[];
		totalCount: number;
	}): Promise<void> {
		if (!payload.workflowIds || payload.workflowIds.length === 0) {
			return;
		}

		try {
			// Get all updated workflows with relations
			const workflows = await this.workflowRepository.find({
				where: { id: payload.workflowIds.includes.bind(payload.workflowIds) as any },
				relations: ['tags', 'shared', 'shared.project', 'parentFolder'],
			});

			if (workflows.length > 0) {
				const stats = await this.workflowIndexingService.bulkIndexWorkflows(workflows, {
					refresh: workflows.length < 10, // Only refresh for small batches
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

	/**
	 * Handle bulk workflow deletion events
	 */
	private async handleWorkflowsBulkDeleted(payload: {
		user: { id: string; email?: string };
		workflowIds: string[];
		totalCount: number;
	}): Promise<void> {
		if (!payload.workflowIds || payload.workflowIds.length === 0) {
			return;
		}

		try {
			await this.workflowIndexingService.bulkRemoveWorkflows(payload.workflowIds, {
				refresh: payload.workflowIds.length < 10, // Only refresh for small batches
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

	/**
	 * Get workflow with all necessary relations for indexing
	 */
	private async getWorkflowWithRelations(workflowId: string): Promise<WorkflowEntity | null> {
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

	/**
	 * Refresh search index periodically for better performance
	 */
	async schedulePeriodicRefresh(): Promise<void> {
		if (!this.searchEngineService.isAvailable()) {
			return;
		}

		try {
			// Refresh index every 30 seconds to ensure changes are searchable
			setInterval(async () => {
				try {
					await this.searchEngineService.refreshIndex('workflows');
					this.logger.debug('Periodic search index refresh completed');
				} catch (error) {
					this.logger.warn('Periodic search index refresh failed', {
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}, 30 * 1000); // 30 seconds

			this.logger.debug('Periodic search index refresh scheduled');
		} catch (error) {
			this.logger.error('Failed to schedule periodic search index refresh', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Cleanup on shutdown
	 */
	async onShutdown(): Promise<void> {
		if (this.isInitialized) {
			try {
				// Remove event listeners
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
}
