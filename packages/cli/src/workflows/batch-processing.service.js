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
exports.BatchProcessingService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const uuid_1 = require('uuid');
const event_service_1 = require('@/events/event.service');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const workflow_finder_service_1 = require('./workflow-finder.service');
const workflow_service_1 = require('./workflow.service');
let BatchProcessingService = class BatchProcessingService {
	constructor(logger, eventService, activeWorkflowManager, workflowFinderService, workflowService) {
		this.logger = logger;
		this.eventService = eventService;
		this.activeWorkflowManager = activeWorkflowManager;
		this.workflowFinderService = workflowFinderService;
		this.workflowService = workflowService;
		this.batchJobs = new Map();
		this.processingQueue = [];
		this.isProcessing = false;
		this.startQueueProcessor();
	}
	async queueBatchOperation(user, request) {
		const batchId = (0, uuid_1.v4)();
		const now = new Date();
		const totalWorkflows = request.operations.reduce((sum, op) => sum + op.workflowIds.length, 0);
		const operations = request.operations.map((op) => ({
			id: (0, uuid_1.v4)(),
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
		const batchJob = {
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
		const estimatedTimePerWorkflow = 2000;
		const estimatedTotalTime = totalWorkflows * estimatedTimePerWorkflow;
		batchJob.operations.forEach((op) => {
			op.estimatedCompletion = new Date(now.getTime() + estimatedTotalTime);
		});
		this.batchJobs.set(batchId, batchJob);
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
	async getBatchStatus(batchId) {
		const batchJob = this.batchJobs.get(batchId);
		if (!batchJob) {
			return null;
		}
		const totalWorkflows = batchJob.metadata.totalWorkflows;
		const processedWorkflows = batchJob.operations.reduce(
			(sum, op) => sum + op.progress.processed,
			0,
		);
		const allErrors = batchJob.operations.flatMap((op) => op.results?.errors || []);
		return {
			batchId,
			operation: batchJob.operations[0]?.type || 'activate',
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
	async cancelBatchOperation(batchId) {
		const batchJob = this.batchJobs.get(batchId);
		if (!batchJob || batchJob.status === 'completed' || batchJob.status === 'failed') {
			return false;
		}
		batchJob.status = 'cancelled';
		const queueIndex = this.processingQueue.indexOf(batchId);
		if (queueIndex > -1) {
			this.processingQueue.splice(queueIndex, 1);
		}
		this.logger.info('Batch processing job cancelled', { batchId });
		return true;
	}
	async getUserBatchJobs(userId) {
		const userJobs = Array.from(this.batchJobs.values())
			.filter((job) => job.user.id === userId)
			.map((job) => this.getBatchStatus(job.id))
			.filter((status) => status !== null);
		return await Promise.all(userJobs);
	}
	addToQueue(batchId) {
		const batchJob = this.batchJobs.get(batchId);
		if (!batchJob) return;
		let insertIndex = this.processingQueue.length;
		if (batchJob.priority === 'high') {
			insertIndex = this.processingQueue.findIndex((id) => {
				const job = this.batchJobs.get(id);
				return job && job.priority !== 'high';
			});
			if (insertIndex === -1) insertIndex = this.processingQueue.length;
		} else if (batchJob.priority === 'normal') {
			insertIndex = this.processingQueue.findIndex((id) => {
				const job = this.batchJobs.get(id);
				return job && job.priority === 'low';
			});
			if (insertIndex === -1) insertIndex = this.processingQueue.length;
		}
		this.processingQueue.splice(insertIndex, 0, batchId);
	}
	startQueueProcessor() {
		setInterval(async () => {
			if (this.isProcessing || this.processingQueue.length === 0) return;
			this.isProcessing = true;
			const batchId = this.processingQueue.shift();
			if (batchId) {
				await this.processBatchJob(batchId);
			}
			this.isProcessing = false;
		}, 1000);
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
		}, 30000);
	}
	async processBatchJob(batchId) {
		const batchJob = this.batchJobs.get(batchId);
		if (!batchJob || batchJob.status !== 'queued') return;
		try {
			this.logger.info('Starting batch job processing', { batchId });
			batchJob.status = 'processing';
			batchJob.metadata.startedAt = new Date();
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
			const allCompleted = batchJob.operations.every((op) => op.status === 'completed');
			const anyFailed = batchJob.operations.some((op) => op.status === 'failed');
			batchJob.status = anyFailed ? 'failed' : 'completed';
			batchJob.metadata.completedAt = new Date();
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
	async processActivation(operation, user) {
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
	async processDeactivation(operation, user) {
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
	async processUpdate(operation, user) {
		operation.results = { successCount: 0, errorCount: 0, errors: [] };
		for (const workflowId of operation.workflowIds) {
			try {
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
	async processTransfer(operation, user) {
		operation.results = { successCount: 0, errorCount: 0, errors: [] };
		for (const workflowId of operation.workflowIds) {
			try {
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
	async sendWebhookNotification(batchJob) {
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
};
exports.BatchProcessingService = BatchProcessingService;
exports.BatchProcessingService = BatchProcessingService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			event_service_1.EventService,
			active_workflow_manager_1.ActiveWorkflowManager,
			workflow_finder_service_1.WorkflowFinderService,
			workflow_service_1.WorkflowService,
		]),
	],
	BatchProcessingService,
);
//# sourceMappingURL=batch-processing.service.js.map
