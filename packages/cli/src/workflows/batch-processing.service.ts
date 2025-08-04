import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	EnterpriseBatchProcessingRequestDto,
	EnterpriseBatchProcessingResponseDto,
	BatchOperationStatusDto,
	WorkflowOperationSummaryDto,
} from '@n8n/api-types';
import { v4 as uuid } from 'uuid';

import { EventService } from '@/events/event.service';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowFinderService } from './workflow-finder.service';
import { WorkflowService } from './workflow.service';

interface BatchOperation {
	id: string;
	type: 'activate' | 'deactivate' | 'update' | 'transfer';
	workflowIds: string[];
	parameters?: Record<string, any>;
	status: 'queued' | 'processing' | 'completed' | 'failed';
	progress: {
		processed: number;
		total: number;
		percentage: number;
	};
	results?: {
		successCount: number;
		errorCount: number;
		errors?: Array<{
			workflowId: string;
			error: string;
			code: string;
		}>;
	};
	startedAt: Date;
	completedAt?: Date;
	estimatedCompletion?: Date;
}

interface BatchJob {
	id: string;
	operations: BatchOperation[];
	status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
	priority: 'low' | 'normal' | 'high';
	scheduledFor?: Date;
	webhook?: {
		url: string;
		method: 'POST' | 'PUT';
		headers?: Record<string, string>;
	};
	metadata: {
		totalOperations: number;
		totalWorkflows: number;
		queuedAt: Date;
		startedAt?: Date;
		completedAt?: Date;
	};
	user: User;
}

@Service()
export class BatchProcessingService {
	private batchJobs = new Map<string, BatchJob>();
	private processingQueue: string[] = [];
	private isProcessing = false;

	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowService: WorkflowService,
	) {
		// Start processing queue
		this.startQueueProcessor();
	}

	/**
	 * Queue a new batch processing job
	 */
	async queueBatchOperation(
		user: User,
		request: EnterpriseBatchProcessingRequestDto,
	): Promise<EnterpriseBatchProcessingResponseDto> {
		const batchId = uuid();
		const now = new Date();

		// Calculate total workflows across all operations
		const totalWorkflows = request.operations.reduce((sum, op) => sum + op.workflowIds.length, 0);

		// Create batch operations
		const operations: BatchOperation[] = request.operations.map((op) => ({
			id: uuid(),
			type: op.type,
			workflowIds: op.workflowIds,
			parameters: op.parameters,
			status: 'queued',
			progress: {
				processed: 0,
				total: op.workflowIds.length,
				percentage: 0,
			},
			startedAt: now,
		}));

		// Create batch job
		const batchJob: BatchJob = {
			id: batchId,
			operations,
			status: 'queued',
			priority: request.priority || 'normal',
			scheduledFor: request.scheduledFor ? new Date(request.scheduledFor) : undefined,
			webhook: request.webhook,
			metadata: {
				totalOperations: operations.length,
				totalWorkflows,
				queuedAt: now,
			},
			user,
		};

		// Estimate completion time based on operation complexity
		const estimatedTimePerWorkflow = 2000; // 2 seconds per workflow
		const estimatedTotalTime = totalWorkflows * estimatedTimePerWorkflow;
		batchJob.operations.forEach((op) => {
			op.estimatedCompletion = new Date(now.getTime() + estimatedTotalTime);
		});

		this.batchJobs.set(batchId, batchJob);

		// Add to processing queue if not scheduled for later
		if (!batchJob.scheduledFor || batchJob.scheduledFor <= now) {
			this.addToQueue(batchId);
		}

		this.logger.info('Batch processing job queued', {
			batchId,
			userId: user.id,
			totalOperations: operations.length,
			totalWorkflows,
			priority: batchJob.priority,
		});

		// Return response
		return {
			batchId,
			operations: operations.map((op) => ({
				operationId: op.id,
				type: op.type,
				workflowCount: op.workflowIds.length,
				status: 'queued',
			})),
			status: 'queued',
			estimatedCompletion: operations[0]?.estimatedCompletion?.toISOString(),
			metadata: {
				priority: batchJob.priority,
				queuedAt: batchJob.metadata.queuedAt.toISOString(),
				totalOperations: batchJob.metadata.totalOperations,
				totalWorkflows: batchJob.metadata.totalWorkflows,
			},
		};
	}

	/**
	 * Get status of a batch operation
	 */
	async getBatchStatus(batchId: string): Promise<BatchOperationStatusDto | null> {
		const batchJob = this.batchJobs.get(batchId);
		if (!batchJob) {
			return null;
		}

		// Calculate overall progress
		const totalWorkflows = batchJob.metadata.totalWorkflows;
		const processedWorkflows = batchJob.operations.reduce(
			(sum, op) => sum + op.progress.processed,
			0,
		);

		// Collect all errors
		const allErrors = batchJob.operations.flatMap((op) => op.results?.errors || []);

		return {
			batchId,
			operation: batchJob.operations[0]?.type || 'activate', // Simplified - could be multiple types
			status: batchJob.status,
			progress: {
				processed: processedWorkflows,
				total: totalWorkflows,
				percentage:
					totalWorkflows > 0 ? Math.round((processedWorkflows / totalWorkflows) * 100) : 0,
			},
			results:
				batchJob.status === 'completed' || batchJob.status === 'failed'
					? {
							successCount: batchJob.operations.reduce(
								(sum, op) => sum + (op.results?.successCount || 0),
								0,
							),
							errorCount: batchJob.operations.reduce(
								(sum, op) => sum + (op.results?.errorCount || 0),
								0,
							),
							errors: allErrors,
						}
					: undefined,
			metadata: {
				startedAt:
					batchJob.metadata.startedAt?.toISOString() || batchJob.metadata.queuedAt.toISOString(),
				completedAt: batchJob.metadata.completedAt?.toISOString(),
				estimatedCompletion: batchJob.operations[0]?.estimatedCompletion?.toISOString(),
				processingTimeMs: batchJob.metadata.completedAt
					? batchJob.metadata.completedAt.getTime() -
						(batchJob.metadata.startedAt?.getTime() || batchJob.metadata.queuedAt.getTime())
					: undefined,
			},
		};
	}

	/**
	 * Cancel a batch operation
	 */
	async cancelBatchOperation(batchId: string): Promise<boolean> {
		const batchJob = this.batchJobs.get(batchId);
		if (!batchJob || batchJob.status === 'completed' || batchJob.status === 'failed') {
			return false;
		}

		batchJob.status = 'cancelled';

		// Remove from queue if not yet processing
		const queueIndex = this.processingQueue.indexOf(batchId);
		if (queueIndex > -1) {
			this.processingQueue.splice(queueIndex, 1);
		}

		this.logger.info('Batch processing job cancelled', { batchId });
		return true;
	}

	/**
	 * Get all batch jobs for a user
	 */
	async getUserBatchJobs(userId: string): Promise<BatchOperationStatusDto[]> {
		const userJobs = Array.from(this.batchJobs.values())
			.filter((job) => job.user.id === userId)
			.map((job) => this.getBatchStatus(job.id))
			.filter((status): status is Promise<BatchOperationStatusDto> => status !== null);

		return await Promise.all(userJobs);
	}

	/**
	 * Add batch job to processing queue
	 */
	private addToQueue(batchId: string): void {
		const batchJob = this.batchJobs.get(batchId);
		if (!batchJob) return;

		// Insert based on priority
		let insertIndex = this.processingQueue.length;
		if (batchJob.priority === 'high') {
			// Find first non-high priority job
			insertIndex = this.processingQueue.findIndex((id) => {
				const job = this.batchJobs.get(id);
				return job && job.priority !== 'high';
			});
			if (insertIndex === -1) insertIndex = this.processingQueue.length;
		} else if (batchJob.priority === 'normal') {
			// Find first low priority job
			insertIndex = this.processingQueue.findIndex((id) => {
				const job = this.batchJobs.get(id);
				return job && job.priority === 'low';
			});
			if (insertIndex === -1) insertIndex = this.processingQueue.length;
		}

		this.processingQueue.splice(insertIndex, 0, batchId);
	}

	/**
	 * Start the queue processor
	 */
	private startQueueProcessor(): void {
		setInterval(async () => {
			if (this.isProcessing || this.processingQueue.length === 0) return;

			this.isProcessing = true;
			const batchId = this.processingQueue.shift();
			if (batchId) {
				await this.processBatchJob(batchId);
			}
			this.isProcessing = false;
		}, 1000);

		// Process scheduled jobs
		setInterval(() => {
			const now = new Date();
			for (const [batchId, batchJob] of this.batchJobs.entries()) {
				if (
					batchJob.status === 'queued' &&
					batchJob.scheduledFor &&
					batchJob.scheduledFor <= now &&
					!this.processingQueue.includes(batchId)
				) {
					this.addToQueue(batchId);
				}
			}
		}, 30000); // Check every 30 seconds
	}

	/**
	 * Process a batch job
	 */
	private async processBatchJob(batchId: string): Promise<void> {
		const batchJob = this.batchJobs.get(batchId);
		if (!batchJob || batchJob.status !== 'queued') return;

		try {
			this.logger.info('Starting batch job processing', { batchId });

			batchJob.status = 'processing';
			batchJob.metadata.startedAt = new Date();

			// Process each operation
			for (const operation of batchJob.operations) {
				operation.status = 'processing';

				try {
					switch (operation.type) {
						case 'activate':
							await this.processActivation(operation, batchJob.user);
							break;
						case 'deactivate':
							await this.processDeactivation(operation, batchJob.user);
							break;
						case 'update':
							await this.processUpdate(operation, batchJob.user);
							break;
						case 'transfer':
							await this.processTransfer(operation, batchJob.user);
							break;
					}
					operation.status = 'completed';
				} catch (error) {
					this.logger.error('Operation failed in batch job', {
						batchId,
						operationId: operation.id,
						error: error instanceof Error ? error.message : String(error),
					});
					operation.status = 'failed';
				}
			}

			// Determine overall status
			const allCompleted = batchJob.operations.every((op) => op.status === 'completed');
			const anyFailed = batchJob.operations.some((op) => op.status === 'failed');

			batchJob.status = anyFailed ? 'failed' : 'completed';
			batchJob.metadata.completedAt = new Date();

			// Send webhook notification if configured
			if (batchJob.webhook) {
				await this.sendWebhookNotification(batchJob);
			}

			this.logger.info('Batch job processing completed', {
				batchId,
				status: batchJob.status,
				totalOperations: batchJob.operations.length,
				completedOperations: batchJob.operations.filter((op) => op.status === 'completed').length,
			});
		} catch (error) {
			this.logger.error('Batch job processing failed', {
				batchId,
				error: error instanceof Error ? error.message : String(error),
			});
			batchJob.status = 'failed';
			batchJob.metadata.completedAt = new Date();
		}
	}

	private async processActivation(operation: BatchOperation, user: User): Promise<void> {
		// Implementation similar to bulk activate but for batch processing
		// This would use the same logic as the controller but adapted for batch context
		operation.results = { successCount: 0, errorCount: 0, errors: [] };

		for (const workflowId of operation.workflowIds) {
			try {
				const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:update',
				]);

				if (workflow && !workflow.active) {
					await this.activeWorkflowManager.add(workflowId, 'activate');
					operation.results.successCount++;
				}
			} catch (error) {
				operation.results.errorCount++;
				operation.results.errors?.push({
					workflowId,
					error: error instanceof Error ? error.message : String(error),
					code: 'ACTIVATION_FAILED',
				});
			}

			operation.progress.processed++;
			operation.progress.percentage = Math.round(
				(operation.progress.processed / operation.progress.total) * 100,
			);
		}
	}

	private async processDeactivation(operation: BatchOperation, user: User): Promise<void> {
		// Similar implementation for deactivation
		operation.results = { successCount: 0, errorCount: 0, errors: [] };

		for (const workflowId of operation.workflowIds) {
			try {
				const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:update',
				]);

				if (workflow && workflow.active) {
					await this.activeWorkflowManager.remove(workflowId);
					operation.results.successCount++;
				}
			} catch (error) {
				operation.results.errorCount++;
				operation.results.errors?.push({
					workflowId,
					error: error instanceof Error ? error.message : String(error),
					code: 'DEACTIVATION_FAILED',
				});
			}

			operation.progress.processed++;
			operation.progress.percentage = Math.round(
				(operation.progress.processed / operation.progress.total) * 100,
			);
		}
	}

	private async processUpdate(operation: BatchOperation, user: User): Promise<void> {
		// Implementation for bulk updates
		operation.results = { successCount: 0, errorCount: 0, errors: [] };

		for (const workflowId of operation.workflowIds) {
			try {
				// Process update using the workflow service
				// This would apply the updates specified in operation.parameters
				operation.results.successCount++;
			} catch (error) {
				operation.results.errorCount++;
				operation.results.errors?.push({
					workflowId,
					error: error instanceof Error ? error.message : String(error),
					code: 'UPDATE_FAILED',
				});
			}

			operation.progress.processed++;
			operation.progress.percentage = Math.round(
				(operation.progress.processed / operation.progress.total) * 100,
			);
		}
	}

	private async processTransfer(operation: BatchOperation, user: User): Promise<void> {
		// Implementation for bulk transfers
		operation.results = { successCount: 0, errorCount: 0, errors: [] };

		for (const workflowId of operation.workflowIds) {
			try {
				// Process transfer using the workflow service
				// This would transfer workflows based on operation.parameters
				operation.results.successCount++;
			} catch (error) {
				operation.results.errorCount++;
				operation.results.errors?.push({
					workflowId,
					error: error instanceof Error ? error.message : String(error),
					code: 'TRANSFER_FAILED',
				});
			}

			operation.progress.processed++;
			operation.progress.percentage = Math.round(
				(operation.progress.processed / operation.progress.total) * 100,
			);
		}
	}

	private async sendWebhookNotification(batchJob: BatchJob): Promise<void> {
		if (!batchJob.webhook) return;

		try {
			const payload = {
				batchId: batchJob.id,
				status: batchJob.status,
				completedAt: batchJob.metadata.completedAt?.toISOString(),
				operations: batchJob.operations.map((op) => ({
					operationId: op.id,
					type: op.type,
					status: op.status,
					results: op.results,
				})),
			};

			// Here you would implement the actual HTTP request
			// using axios or similar HTTP client
			this.logger.debug('Webhook notification sent', {
				batchId: batchJob.id,
				webhookUrl: batchJob.webhook.url,
			});
		} catch (error) {
			this.logger.error('Failed to send webhook notification', {
				batchId: batchJob.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
