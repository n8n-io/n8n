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
exports.WorkflowIndexingService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const search_engine_service_1 = require('./search-engine.service');
let WorkflowIndexingService = class WorkflowIndexingService {
	constructor(logger, searchEngineService, workflowRepository) {
		this.logger = logger;
		this.searchEngineService = searchEngineService;
		this.workflowRepository = workflowRepository;
		this.indexName = 'workflows';
		this.isIndexInitialized = false;
	}
	async initializeIndex() {
		if (!this.searchEngineService.isAvailable()) {
			this.logger.info('Search engine not available, skipping index initialization');
			return;
		}
		try {
			const mapping = this.getWorkflowIndexMapping();
			await this.searchEngineService.createIndex(this.indexName, mapping);
			this.isIndexInitialized = true;
			this.logger.info('Workflow search index initialized successfully');
		} catch (error) {
			this.logger.error('Failed to initialize workflow search index', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw new n8n_workflow_1.ApplicationError(
				`Failed to initialize workflow search index: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async indexWorkflow(workflow, options = {}) {
		if (!this.searchEngineService.isAvailable()) {
			return;
		}
		try {
			const document = await this.transformWorkflowToDocument(workflow);
			await this.searchEngineService.indexDocument(this.indexName, document);
			if (options.refresh) {
				await this.searchEngineService.refreshIndex(this.indexName);
			}
			this.logger.debug('Workflow indexed successfully', {
				workflowId: workflow.id,
				workflowName: workflow.name,
			});
		} catch (error) {
			this.logger.error('Failed to index workflow', {
				workflowId: workflow.id,
				workflowName: workflow.name,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new n8n_workflow_1.ApplicationError(
				`Failed to index workflow ${workflow.id}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async bulkIndexWorkflows(workflows, options = {}) {
		const startTime = Date.now();
		const stats = {
			totalProcessed: workflows.length,
			successCount: 0,
			errorCount: 0,
			processingTimeMs: 0,
			errors: [],
		};
		if (!this.searchEngineService.isAvailable()) {
			this.logger.info('Search engine not available, skipping bulk indexing');
			return stats;
		}
		const batchSize = options.batchSize || 100;
		const batches = this.chunkArray(workflows, batchSize);
		this.logger.info('Starting bulk workflow indexing', {
			totalWorkflows: workflows.length,
			batches: batches.length,
			batchSize,
		});
		for (let i = 0; i < batches.length; i++) {
			const batch = batches[i];
			try {
				await this.processBatch(batch, stats);
				this.logger.debug(`Processed batch ${i + 1}/${batches.length}`, {
					batchSize: batch.length,
					successCount: stats.successCount,
					errorCount: stats.errorCount,
				});
			} catch (error) {
				this.logger.error(`Failed to process batch ${i + 1}`, {
					batchSize: batch.length,
					error: error instanceof Error ? error.message : String(error),
				});
				batch.forEach((workflow) => {
					stats.errors.push({
						workflowId: workflow.id,
						error: `Batch processing failed: ${error instanceof Error ? error.message : String(error)}`,
					});
					stats.errorCount++;
				});
			}
		}
		if (options.refresh && stats.successCount > 0) {
			await this.searchEngineService.refreshIndex(this.indexName);
		}
		stats.processingTimeMs = Date.now() - startTime;
		this.logger.info('Bulk workflow indexing completed', {
			totalProcessed: stats.totalProcessed,
			successCount: stats.successCount,
			errorCount: stats.errorCount,
			processingTimeMs: stats.processingTimeMs,
		});
		return stats;
	}
	async removeWorkflow(workflowId, options = {}) {
		if (!this.searchEngineService.isAvailable()) {
			return;
		}
		try {
			await this.searchEngineService.deleteDocument(this.indexName, workflowId);
			if (options.refresh) {
				await this.searchEngineService.refreshIndex(this.indexName);
			}
			this.logger.debug('Workflow removed from index', { workflowId });
		} catch (error) {
			this.logger.error('Failed to remove workflow from index', {
				workflowId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new n8n_workflow_1.ApplicationError(
				`Failed to remove workflow from index: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async bulkRemoveWorkflows(workflowIds, options = {}) {
		if (!this.searchEngineService.isAvailable()) {
			return;
		}
		try {
			const operations = workflowIds.map((id) => ({
				operation: 'delete',
				index: this.indexName,
				id,
			}));
			await this.searchEngineService.bulkIndex(operations);
			if (options.refresh) {
				await this.searchEngineService.refreshIndex(this.indexName);
			}
			this.logger.debug('Workflows removed from index', {
				count: workflowIds.length,
			});
		} catch (error) {
			this.logger.error('Failed to bulk remove workflows from index', {
				count: workflowIds.length,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new n8n_workflow_1.ApplicationError(
				`Failed to bulk remove workflows: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async reindexAllWorkflows(options = {}) {
		this.logger.info('Starting full workflow reindexing');
		try {
			const workflows = await this.workflowRepository.find({
				relations: ['tags', 'shared', 'shared.project'],
			});
			await this.searchEngineService.deleteIndex(this.indexName);
			await this.initializeIndex();
			const stats = await this.bulkIndexWorkflows(workflows, {
				...options,
				refresh: true,
			});
			this.logger.info('Full workflow reindexing completed', {
				totalWorkflows: workflows.length,
				successCount: stats.successCount,
				errorCount: stats.errorCount,
				processingTimeMs: stats.processingTimeMs,
			});
			return stats;
		} catch (error) {
			this.logger.error('Failed to reindex all workflows', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw new n8n_workflow_1.ApplicationError(
				`Failed to reindex all workflows: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getIndexingHealth() {
		if (!this.searchEngineService.isAvailable()) {
			return {
				indexExists: false,
				documentCount: 0,
				indexSize: '0',
				searchEngineHealth: { status: 'unavailable' },
			};
		}
		try {
			const health = await this.searchEngineService.getHealth();
			const searchResult = await this.searchEngineService.search(this.indexName, {
				query: '*',
				size: 0,
			});
			return {
				indexExists: true,
				documentCount: searchResult.total,
				indexSize: 'N/A',
				searchEngineHealth: health,
			};
		} catch (error) {
			this.logger.error('Failed to get indexing health', {
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				indexExists: false,
				documentCount: 0,
				indexSize: '0',
				searchEngineHealth: {
					status: 'error',
					error: error instanceof Error ? error.message : String(error),
				},
			};
		}
	}
	async processBatch(batch, stats) {
		const operations = [];
		for (const workflow of batch) {
			try {
				const document = await this.transformWorkflowToDocument(workflow);
				operations.push({
					operation: 'index',
					index: this.indexName,
					id: workflow.id,
					document,
				});
			} catch (error) {
				stats.errors.push({
					workflowId: workflow.id,
					error: `Document transformation failed: ${error instanceof Error ? error.message : String(error)}`,
				});
				stats.errorCount++;
			}
		}
		if (operations.length > 0) {
			await this.searchEngineService.bulkIndex(operations);
			stats.successCount += operations.length;
		}
	}
	async transformWorkflowToDocument(workflow) {
		const nodeTypes = workflow.nodes ? [...new Set(workflow.nodes.map((n) => n.type))] : [];
		const nodeCount = workflow.nodes ? workflow.nodes.length : 0;
		const complexity = this.calculateWorkflowComplexity(workflow);
		const hasWebhooks = this.hasWebhookTriggers(workflow);
		const hasCronTriggers = this.hasCronTriggers(workflow);
		const hasErrorTrigger = this.hasErrorTrigger(workflow);
		const content = this.buildSearchableContent(workflow);
		const projectInfo = this.extractProjectInfo(workflow);
		const folderInfo = this.extractFolderInfo(workflow);
		return {
			id: workflow.id,
			name: workflow.name,
			description: workflow.description || undefined,
			content,
			active: workflow.active,
			isArchived: workflow.isArchived || false,
			createdAt: workflow.createdAt.toISOString(),
			updatedAt: workflow.updatedAt.toISOString(),
			tags: workflow.tags ? workflow.tags.map((tag) => ({ id: tag.id, name: tag.name })) : [],
			nodeTypes,
			nodeCount,
			projectId: projectInfo.id,
			projectName: projectInfo.name,
			folderId: folderInfo.id,
			folderName: folderInfo.name,
			hasWebhooks,
			hasCronTriggers,
			hasErrorTrigger,
			complexity,
			executionCount: undefined,
			lastExecutedAt: undefined,
			avgExecutionTime: undefined,
			successRate: undefined,
		};
	}
	buildSearchableContent(workflow) {
		const contentParts = [];
		contentParts.push(workflow.name);
		if (workflow.description) {
			contentParts.push(workflow.description);
		}
		if (workflow.nodes) {
			workflow.nodes.forEach((node) => {
				contentParts.push(node.name);
				contentParts.push(node.type);
				if (node.parameters) {
					Object.values(node.parameters).forEach((value) => {
						if (typeof value === 'string' && value.length < 200) {
							contentParts.push(value);
						}
					});
				}
			});
		}
		if (workflow.tags) {
			workflow.tags.forEach((tag) => {
				contentParts.push(tag.name);
			});
		}
		return contentParts.join(' ');
	}
	calculateWorkflowComplexity(workflow) {
		if (!workflow.nodes) return 0;
		let complexity = 0;
		complexity += workflow.nodes.length;
		if (workflow.connections) {
			const connectionCount = Object.values(workflow.connections).reduce(
				(total, nodeConnections) => {
					if (nodeConnections && nodeConnections.main) {
						return (
							total +
							nodeConnections.main.reduce((nodeTotal, outputConnections) => {
								return nodeTotal + (outputConnections ? outputConnections.length : 0);
							}, 0)
						);
					}
					return total;
				},
				0,
			);
			complexity += connectionCount * 0.5;
		}
		workflow.nodes.forEach((node) => {
			if (node.type.includes('If') || node.type.includes('Switch')) {
				complexity += 2;
			}
			if (node.type.includes('Loop') || node.type.includes('Split')) {
				complexity += 3;
			}
		});
		return Math.round(complexity);
	}
	hasWebhookTriggers(workflow) {
		if (!workflow.nodes) return false;
		return workflow.nodes.some(
			(node) =>
				node.type.toLowerCase().includes('webhook') || node.type.toLowerCase().includes('http'),
		);
	}
	hasCronTriggers(workflow) {
		if (!workflow.nodes) return false;
		return workflow.nodes.some(
			(node) =>
				node.type.toLowerCase().includes('cron') || node.type.toLowerCase().includes('schedule'),
		);
	}
	hasErrorTrigger(workflow) {
		if (!workflow.nodes) return false;
		return workflow.nodes.some((node) => node.type.toLowerCase().includes('error'));
	}
	extractProjectInfo(workflow) {
		if (workflow.shared && workflow.shared.length > 0) {
			const ownerShare = workflow.shared.find((share) => share.role === 'workflow:owner');
			if (ownerShare && ownerShare.project) {
				return {
					id: ownerShare.project.id,
					name: ownerShare.project.name,
				};
			}
		}
		return {};
	}
	extractFolderInfo(workflow) {
		if (workflow.parentFolder) {
			return {
				id: workflow.parentFolder.id,
				name: workflow.parentFolder.name,
			};
		}
		return {};
	}
	chunkArray(array, chunkSize) {
		const chunks = [];
		for (let i = 0; i < array.length; i += chunkSize) {
			chunks.push(array.slice(i, i + chunkSize));
		}
		return chunks;
	}
	getWorkflowIndexMapping() {
		return {
			properties: {
				id: { type: 'keyword' },
				name: {
					type: 'text',
					analyzer: 'workflow_analyzer',
					fields: {
						keyword: { type: 'keyword' },
						suggest: { type: 'completion' },
					},
				},
				description: {
					type: 'text',
					analyzer: 'workflow_analyzer',
				},
				content: {
					type: 'text',
					analyzer: 'workflow_analyzer',
				},
				active: { type: 'boolean' },
				isArchived: { type: 'boolean' },
				createdAt: { type: 'date' },
				updatedAt: { type: 'date' },
				tags: {
					type: 'nested',
					properties: {
						id: { type: 'keyword' },
						name: {
							type: 'text',
							analyzer: 'workflow_analyzer',
							fields: { keyword: { type: 'keyword' } },
						},
					},
				},
				nodeTypes: { type: 'keyword' },
				nodeCount: { type: 'integer' },
				projectId: { type: 'keyword' },
				projectName: {
					type: 'text',
					analyzer: 'workflow_analyzer',
					fields: { keyword: { type: 'keyword' } },
				},
				folderId: { type: 'keyword' },
				folderName: {
					type: 'text',
					analyzer: 'workflow_analyzer',
					fields: { keyword: { type: 'keyword' } },
				},
				hasWebhooks: { type: 'boolean' },
				hasCronTriggers: { type: 'boolean' },
				hasErrorTrigger: { type: 'boolean' },
				complexity: { type: 'integer' },
				executionCount: { type: 'integer' },
				lastExecutedAt: { type: 'date' },
				avgExecutionTime: { type: 'float' },
				successRate: { type: 'float' },
			},
		};
	}
};
exports.WorkflowIndexingService = WorkflowIndexingService;
exports.WorkflowIndexingService = WorkflowIndexingService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			search_engine_service_1.SearchEngineService,
			db_1.WorkflowRepository,
		]),
	],
	WorkflowIndexingService,
);
//# sourceMappingURL=workflow-indexing.service.js.map
