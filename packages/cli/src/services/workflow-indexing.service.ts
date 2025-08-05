import { Logger } from '@n8n/backend-common';
import type { WorkflowEntity } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ApplicationError } from 'n8n-workflow';

import {
	SearchEngineService,
	type BulkIndexOperation,
	type IndexDocument,
} from './search-engine.service';

export interface WorkflowSearchDocument extends IndexDocument {
	id: string;
	name: string;
	description?: string;
	content: string;
	active: boolean;
	isArchived: boolean;
	createdAt: string;
	updatedAt: string;
	tags: Array<{ id: string; name: string }>;
	nodeTypes: string[];
	nodeCount: number;
	projectId?: string;
	projectName?: string;
	folderId?: string;
	folderName?: string;
	hasWebhooks: boolean;
	hasCronTriggers: boolean;
	hasErrorTrigger: boolean;
	complexity: number;
	executionCount?: number;
	lastExecutedAt?: string;
	avgExecutionTime?: number;
	successRate?: number;
}

export interface IndexingOptions {
	skipIfExists?: boolean;
	refresh?: boolean;
	batchSize?: number;
}

export interface IndexingStats {
	totalProcessed: number;
	successCount: number;
	errorCount: number;
	processingTimeMs: number;
	errors: Array<{ workflowId: string; error: string }>;
}

@Service()
export class WorkflowIndexingService {
	private readonly indexName = 'workflows';
	private isIndexInitialized = false;

	constructor(
		private readonly logger: Logger,
		private readonly searchEngineService: SearchEngineService,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	/**
	 * Initialize the workflow search index
	 */
	async initializeIndex(): Promise<void> {
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
			throw new ApplicationError(
				`Failed to initialize workflow search index: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Index a single workflow
	 */
	async indexWorkflow(workflow: WorkflowEntity, options: IndexingOptions = {}): Promise<void> {
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
			throw new ApplicationError(
				`Failed to index workflow ${workflow.id}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Bulk index multiple workflows
	 */
	async bulkIndexWorkflows(
		workflows: WorkflowEntity[],
		options: IndexingOptions = {},
	): Promise<IndexingStats> {
		const startTime = Date.now();
		const stats: IndexingStats = {
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
				// Add all workflows in failed batch to errors
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

	/**
	 * Remove a workflow from the search index
	 */
	async removeWorkflow(workflowId: string, options: IndexingOptions = {}): Promise<void> {
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
			throw new ApplicationError(
				`Failed to remove workflow from index: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Bulk remove multiple workflows from index
	 */
	async bulkRemoveWorkflows(workflowIds: string[], options: IndexingOptions = {}): Promise<void> {
		if (!this.searchEngineService.isAvailable()) {
			return;
		}

		try {
			const operations: BulkIndexOperation[] = workflowIds.map((id) => ({
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
			throw new ApplicationError(
				`Failed to bulk remove workflows: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Reindex all workflows
	 */
	async reindexAllWorkflows(options: IndexingOptions = {}): Promise<IndexingStats> {
		this.logger.info('Starting full workflow reindexing');

		try {
			// Get all workflows
			const workflows = await this.workflowRepository.find({
				relations: ['tags', 'shared', 'shared.project'],
			});

			// Delete and recreate index
			await this.searchEngineService.deleteIndex(this.indexName);
			await this.initializeIndex();

			// Bulk index all workflows
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
			throw new ApplicationError(
				`Failed to reindex all workflows: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get indexing health and statistics
	 */
	async getIndexingHealth(): Promise<{
		indexExists: boolean;
		documentCount: number;
		indexSize: string;
		searchEngineHealth: any;
	}> {
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

			// Get index stats - simplified version
			const searchResult = await this.searchEngineService.search(this.indexName, {
				query: '*',
				size: 0,
			});

			return {
				indexExists: true,
				documentCount: searchResult.total,
				indexSize: 'N/A', // Would need specific ES/OS API calls to get exact size
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

	// Private methods

	private async processBatch(batch: WorkflowEntity[], stats: IndexingStats): Promise<void> {
		const operations: BulkIndexOperation[] = [];

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

	private async transformWorkflowToDocument(
		workflow: WorkflowEntity,
	): Promise<WorkflowSearchDocument> {
		// Extract node information
		const nodeTypes = workflow.nodes ? [...new Set(workflow.nodes.map((n) => n.type))] : [];
		const nodeCount = workflow.nodes ? workflow.nodes.length : 0;

		// Analyze workflow complexity
		const complexity = this.calculateWorkflowComplexity(workflow);

		// Check for specific trigger types
		const hasWebhooks = this.hasWebhookTriggers(workflow);
		const hasCronTriggers = this.hasCronTriggers(workflow);
		const hasErrorTrigger = this.hasErrorTrigger(workflow);

		// Build searchable content
		const content = this.buildSearchableContent(workflow);

		// Get project and folder info
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
			// Execution stats would be populated from execution repository if needed
			executionCount: undefined,
			lastExecutedAt: undefined,
			avgExecutionTime: undefined,
			successRate: undefined,
		};
	}

	private buildSearchableContent(workflow: WorkflowEntity): string {
		const contentParts: string[] = [];

		// Add workflow name and description
		contentParts.push(workflow.name);
		if (workflow.description) {
			contentParts.push(workflow.description);
		}

		// Add node information
		if (workflow.nodes) {
			workflow.nodes.forEach((node) => {
				// Add node name and type
				contentParts.push(node.name);
				contentParts.push(node.type);

				// Add parameter values (simplified)
				if (node.parameters) {
					Object.values(node.parameters).forEach((value) => {
						if (typeof value === 'string' && value.length < 200) {
							contentParts.push(value);
						}
					});
				}
			});
		}

		// Add tag names
		if (workflow.tags) {
			workflow.tags.forEach((tag) => {
				contentParts.push(tag.name);
			});
		}

		return contentParts.join(' ');
	}

	private calculateWorkflowComplexity(workflow: WorkflowEntity): number {
		if (!workflow.nodes) return 0;

		let complexity = 0;

		// Base complexity from node count
		complexity += workflow.nodes.length;

		// Add complexity for connections
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

		// Add complexity for certain node types
		workflow.nodes.forEach((node) => {
			if (node.type.includes('If') || node.type.includes('Switch')) {
				complexity += 2; // Conditional nodes add complexity
			}
			if (node.type.includes('Loop') || node.type.includes('Split')) {
				complexity += 3; // Loop nodes add more complexity
			}
		});

		return Math.round(complexity);
	}

	private hasWebhookTriggers(workflow: WorkflowEntity): boolean {
		if (!workflow.nodes) return false;
		return workflow.nodes.some(
			(node) =>
				node.type.toLowerCase().includes('webhook') || node.type.toLowerCase().includes('http'),
		);
	}

	private hasCronTriggers(workflow: WorkflowEntity): boolean {
		if (!workflow.nodes) return false;
		return workflow.nodes.some(
			(node) =>
				node.type.toLowerCase().includes('cron') || node.type.toLowerCase().includes('schedule'),
		);
	}

	private hasErrorTrigger(workflow: WorkflowEntity): boolean {
		if (!workflow.nodes) return false;
		return workflow.nodes.some((node) => node.type.toLowerCase().includes('error'));
	}

	private extractProjectInfo(workflow: WorkflowEntity): { id?: string; name?: string } {
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

	private extractFolderInfo(workflow: WorkflowEntity): { id?: string; name?: string } {
		if (workflow.parentFolder) {
			return {
				id: workflow.parentFolder.id,
				name: workflow.parentFolder.name,
			};
		}
		return {};
	}

	private chunkArray<T>(array: T[], chunkSize: number): T[][] {
		const chunks: T[][] = [];
		for (let i = 0; i < array.length; i += chunkSize) {
			chunks.push(array.slice(i, i + chunkSize));
		}
		return chunks;
	}

	private getWorkflowIndexMapping(): any {
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
}
