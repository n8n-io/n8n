'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const workflow_indexing_service_1 = require('../workflow-indexing.service');
const n8n_workflow_1 = require('n8n-workflow');
describe('WorkflowIndexingService', () => {
	let service;
	let mockLogger;
	let mockSearchEngineService;
	let mockWorkflowRepository;
	const mockWorkflow = {
		id: 'workflow-1',
		name: 'Test Workflow',
		description: 'Test description',
		active: true,
		isArchived: false,
		createdAt: new Date('2024-01-01T00:00:00Z'),
		updatedAt: new Date('2024-01-02T00:00:00Z'),
		nodes: [
			{
				id: 'node-1',
				name: 'Start Node',
				type: 'n8n-nodes-base.start',
				parameters: {},
				position: [100, 100],
			},
			{
				id: 'node-2',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'https://api.example.com',
					method: 'GET',
				},
				position: [200, 100],
			},
		],
		connections: {
			'Start Node': {
				main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
			},
		},
		tags: [
			{ id: 'tag-1', name: 'automation' },
			{ id: 'tag-2', name: 'api' },
		],
		shared: [
			{
				role: 'workflow:owner',
				project: {
					id: 'project-1',
					name: 'Test Project',
				},
			},
		],
		parentFolder: {
			id: 'folder-1',
			name: 'Test Folder',
		},
	};
	beforeEach(() => {
		mockLogger = {
			info: jest.fn(),
			debug: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};
		mockSearchEngineService = {
			isAvailable: jest.fn(),
			createIndex: jest.fn(),
			deleteIndex: jest.fn(),
			indexDocument: jest.fn(),
			bulkIndex: jest.fn(),
			deleteDocument: jest.fn(),
			refreshIndex: jest.fn(),
			search: jest.fn(),
		};
		mockWorkflowRepository = {
			find: jest.fn(),
			findOne: jest.fn(),
			save: jest.fn(),
		};
		service = new workflow_indexing_service_1.WorkflowIndexingService(
			mockLogger,
			mockSearchEngineService,
			mockWorkflowRepository,
		);
	});
	afterEach(() => {
		jest.clearAllMocks();
	});
	describe('Index Initialization', () => {
		it('should initialize index successfully', async () => {
			mockSearchEngineService.isAvailable.mockReturnValue(true);
			mockSearchEngineService.createIndex.mockResolvedValue();
			await service.initializeIndex();
			expect(mockSearchEngineService.createIndex).toHaveBeenCalledWith(
				'workflows',
				expect.objectContaining({
					properties: expect.objectContaining({
						id: { type: 'keyword' },
						name: expect.objectContaining({
							type: 'text',
							analyzer: 'workflow_analyzer',
						}),
						description: expect.objectContaining({
							type: 'text',
							analyzer: 'workflow_analyzer',
						}),
						active: { type: 'boolean' },
						nodeTypes: { type: 'keyword' },
					}),
				}),
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Workflow search index initialized successfully',
			);
		});
		it('should skip initialization when search engine is not available', async () => {
			mockSearchEngineService.isAvailable.mockReturnValue(false);
			await service.initializeIndex();
			expect(mockSearchEngineService.createIndex).not.toHaveBeenCalled();
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Search engine not available, skipping index initialization',
			);
		});
		it('should handle initialization errors', async () => {
			mockSearchEngineService.isAvailable.mockReturnValue(true);
			mockSearchEngineService.createIndex.mockRejectedValue(new Error('Index creation failed'));
			await expect(service.initializeIndex()).rejects.toThrow(n8n_workflow_1.ApplicationError);
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize workflow search index', {
				error: 'Index creation failed',
			});
		});
	});
	describe('Single Workflow Indexing', () => {
		beforeEach(() => {
			mockSearchEngineService.isAvailable.mockReturnValue(true);
		});
		it('should index a workflow successfully', async () => {
			mockSearchEngineService.indexDocument.mockResolvedValue();
			await service.indexWorkflow(mockWorkflow);
			expect(mockSearchEngineService.indexDocument).toHaveBeenCalledWith(
				'workflows',
				expect.objectContaining({
					id: 'workflow-1',
					name: 'Test Workflow',
					description: 'Test description',
					active: true,
					isArchived: false,
					nodeTypes: ['n8n-nodes-base.start', 'n8n-nodes-base.httpRequest'],
					nodeCount: 2,
					tags: [
						{ id: 'tag-1', name: 'automation' },
						{ id: 'tag-2', name: 'api' },
					],
					projectId: 'project-1',
					projectName: 'Test Project',
					folderId: 'folder-1',
					folderName: 'Test Folder',
					hasWebhooks: false,
					hasCronTriggers: false,
					hasErrorTrigger: false,
					complexity: expect.any(Number),
				}),
			);
			expect(mockLogger.debug).toHaveBeenCalledWith('Workflow indexed successfully', {
				workflowId: 'workflow-1',
				workflowName: 'Test Workflow',
			});
		});
		it('should refresh index when requested', async () => {
			mockSearchEngineService.indexDocument.mockResolvedValue();
			mockSearchEngineService.refreshIndex.mockResolvedValue();
			await service.indexWorkflow(mockWorkflow, { refresh: true });
			expect(mockSearchEngineService.refreshIndex).toHaveBeenCalledWith('workflows');
		});
		it('should skip indexing when search engine is not available', async () => {
			mockSearchEngineService.isAvailable.mockReturnValue(false);
			await service.indexWorkflow(mockWorkflow);
			expect(mockSearchEngineService.indexDocument).not.toHaveBeenCalled();
		});
		it('should handle indexing errors', async () => {
			mockSearchEngineService.indexDocument.mockRejectedValue(new Error('Indexing failed'));
			await expect(service.indexWorkflow(mockWorkflow)).rejects.toThrow(
				n8n_workflow_1.ApplicationError,
			);
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to index workflow', {
				workflowId: 'workflow-1',
				workflowName: 'Test Workflow',
				error: 'Indexing failed',
			});
		});
	});
	describe('Bulk Workflow Indexing', () => {
		beforeEach(() => {
			mockSearchEngineService.isAvailable.mockReturnValue(true);
		});
		it('should bulk index workflows successfully', async () => {
			const workflows = [mockWorkflow, { ...mockWorkflow, id: 'workflow-2', name: 'Workflow 2' }];
			mockSearchEngineService.bulkIndex.mockResolvedValue();
			const stats = await service.bulkIndexWorkflows(workflows);
			expect(stats.totalProcessed).toBe(2);
			expect(stats.successCount).toBe(2);
			expect(stats.errorCount).toBe(0);
			expect(stats.errors).toEqual([]);
			expect(mockSearchEngineService.bulkIndex).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						operation: 'index',
						index: 'workflows',
						id: 'workflow-1',
						document: expect.objectContaining({
							id: 'workflow-1',
							name: 'Test Workflow',
						}),
					}),
					expect.objectContaining({
						operation: 'index',
						index: 'workflows',
						id: 'workflow-2',
						document: expect.objectContaining({
							id: 'workflow-2',
							name: 'Workflow 2',
						}),
					}),
				]),
			);
			expect(mockLogger.info).toHaveBeenCalledWith('Bulk workflow indexing completed', {
				totalProcessed: 2,
				successCount: 2,
				errorCount: 0,
				processingTimeMs: expect.any(Number),
			});
		});
		it('should process workflows in batches', async () => {
			const workflows = Array.from({ length: 250 }, (_, i) => ({
				...mockWorkflow,
				id: `workflow-${i}`,
				name: `Workflow ${i}`,
			}));
			mockSearchEngineService.bulkIndex.mockResolvedValue();
			const stats = await service.bulkIndexWorkflows(workflows, { batchSize: 100 });
			expect(stats.totalProcessed).toBe(250);
			expect(stats.successCount).toBe(250);
			expect(mockSearchEngineService.bulkIndex).toHaveBeenCalledTimes(3);
		});
		it('should handle partial batch failures', async () => {
			const workflows = [mockWorkflow, { ...mockWorkflow, id: 'workflow-2', name: 'Workflow 2' }];
			mockSearchEngineService.bulkIndex
				.mockResolvedValueOnce(undefined)
				.mockRejectedValueOnce(new Error('Batch failed'));
			const stats = await service.bulkIndexWorkflows(workflows, { batchSize: 1 });
			expect(stats.totalProcessed).toBe(2);
			expect(stats.successCount).toBe(1);
			expect(stats.errorCount).toBe(1);
			expect(stats.errors).toHaveLength(1);
			expect(stats.errors[0]).toEqual({
				workflowId: 'workflow-2',
				error: 'Batch processing failed: Batch failed',
			});
		});
		it('should skip bulk indexing when search engine is not available', async () => {
			mockSearchEngineService.isAvailable.mockReturnValue(false);
			const workflows = [mockWorkflow];
			const stats = await service.bulkIndexWorkflows(workflows);
			expect(stats.totalProcessed).toBe(1);
			expect(stats.successCount).toBe(0);
			expect(stats.errorCount).toBe(0);
			expect(mockSearchEngineService.bulkIndex).not.toHaveBeenCalled();
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Search engine not available, skipping bulk indexing',
			);
		});
	});
	describe('Workflow Removal', () => {
		beforeEach(() => {
			mockSearchEngineService.isAvailable.mockReturnValue(true);
		});
		it('should remove workflow from index successfully', async () => {
			mockSearchEngineService.deleteDocument.mockResolvedValue();
			await service.removeWorkflow('workflow-1');
			expect(mockSearchEngineService.deleteDocument).toHaveBeenCalledWith(
				'workflows',
				'workflow-1',
			);
			expect(mockLogger.debug).toHaveBeenCalledWith('Workflow removed from index', {
				workflowId: 'workflow-1',
			});
		});
		it('should refresh index when requested', async () => {
			mockSearchEngineService.deleteDocument.mockResolvedValue();
			mockSearchEngineService.refreshIndex.mockResolvedValue();
			await service.removeWorkflow('workflow-1', { refresh: true });
			expect(mockSearchEngineService.refreshIndex).toHaveBeenCalledWith('workflows');
		});
		it('should handle removal errors', async () => {
			mockSearchEngineService.deleteDocument.mockRejectedValue(new Error('Delete failed'));
			await expect(service.removeWorkflow('workflow-1')).rejects.toThrow(
				n8n_workflow_1.ApplicationError,
			);
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to remove workflow from index', {
				workflowId: 'workflow-1',
				error: 'Delete failed',
			});
		});
		it('should bulk remove workflows successfully', async () => {
			mockSearchEngineService.bulkIndex.mockResolvedValue();
			await service.bulkRemoveWorkflows(['workflow-1', 'workflow-2']);
			expect(mockSearchEngineService.bulkIndex).toHaveBeenCalledWith([
				{
					operation: 'delete',
					index: 'workflows',
					id: 'workflow-1',
				},
				{
					operation: 'delete',
					index: 'workflows',
					id: 'workflow-2',
				},
			]);
		});
	});
	describe('Full Reindexing', () => {
		beforeEach(() => {
			mockSearchEngineService.isAvailable.mockReturnValue(true);
		});
		it('should reindex all workflows successfully', async () => {
			const workflows = [mockWorkflow, { ...mockWorkflow, id: 'workflow-2' }];
			mockWorkflowRepository.find.mockResolvedValue(workflows);
			mockSearchEngineService.deleteIndex.mockResolvedValue();
			mockSearchEngineService.createIndex.mockResolvedValue();
			mockSearchEngineService.bulkIndex.mockResolvedValue();
			mockSearchEngineService.refreshIndex.mockResolvedValue();
			const stats = await service.reindexAllWorkflows();
			expect(mockWorkflowRepository.find).toHaveBeenCalledWith({
				relations: ['tags', 'shared', 'shared.project'],
			});
			expect(mockSearchEngineService.deleteIndex).toHaveBeenCalledWith('workflows');
			expect(mockSearchEngineService.createIndex).toHaveBeenCalled();
			expect(mockSearchEngineService.bulkIndex).toHaveBeenCalled();
			expect(mockSearchEngineService.refreshIndex).toHaveBeenCalledWith('workflows');
			expect(stats.totalProcessed).toBe(2);
			expect(stats.successCount).toBe(2);
			expect(stats.errorCount).toBe(0);
			expect(mockLogger.info).toHaveBeenCalledWith('Full workflow reindexing completed', {
				totalWorkflows: 2,
				successCount: 2,
				errorCount: 0,
				processingTimeMs: expect.any(Number),
			});
		});
		it('should handle reindexing errors', async () => {
			mockWorkflowRepository.find.mockRejectedValue(new Error('Database error'));
			await expect(service.reindexAllWorkflows()).rejects.toThrow(n8n_workflow_1.ApplicationError);
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to reindex all workflows', {
				error: 'Database error',
			});
		});
	});
	describe('Health and Statistics', () => {
		it('should get indexing health when search engine is available', async () => {
			mockSearchEngineService.isAvailable.mockReturnValue(true);
			mockSearchEngineService.getHealth.mockResolvedValue({
				status: 'green',
				cluster_name: 'test-cluster',
			});
			mockSearchEngineService.search.mockResolvedValue({
				total: 100,
				hits: [],
				maxScore: 0,
				searchTimeMs: 10,
			});
			const health = await service.getIndexingHealth();
			expect(health.indexExists).toBe(true);
			expect(health.documentCount).toBe(100);
			expect(health.searchEngineHealth).toEqual({
				status: 'green',
				cluster_name: 'test-cluster',
			});
		});
		it('should return unavailable status when search engine is not available', async () => {
			mockSearchEngineService.isAvailable.mockReturnValue(false);
			const health = await service.getIndexingHealth();
			expect(health.indexExists).toBe(false);
			expect(health.documentCount).toBe(0);
			expect(health.indexSize).toBe('0');
			expect(health.searchEngineHealth).toEqual({ status: 'unavailable' });
		});
		it('should handle health check errors', async () => {
			mockSearchEngineService.isAvailable.mockReturnValue(true);
			mockSearchEngineService.getHealth.mockRejectedValue(new Error('Health check failed'));
			const health = await service.getIndexingHealth();
			expect(health.indexExists).toBe(false);
			expect(health.searchEngineHealth).toEqual({
				status: 'error',
				error: 'Health check failed',
			});
		});
	});
	describe('Document Transformation', () => {
		it('should transform workflow with webhook triggers', async () => {
			const webhookWorkflow = {
				...mockWorkflow,
				nodes: [
					{
						id: 'webhook-1',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						parameters: {},
						position: [100, 100],
					},
				],
			};
			mockSearchEngineService.isAvailable.mockReturnValue(true);
			mockSearchEngineService.indexDocument.mockResolvedValue();
			await service.indexWorkflow(webhookWorkflow);
			expect(mockSearchEngineService.indexDocument).toHaveBeenCalledWith(
				'workflows',
				expect.objectContaining({
					hasWebhooks: true,
					hasCronTriggers: false,
					hasErrorTrigger: false,
				}),
			);
		});
		it('should transform workflow with cron triggers', async () => {
			const cronWorkflow = {
				...mockWorkflow,
				nodes: [
					{
						id: 'cron-1',
						name: 'Cron',
						type: 'n8n-nodes-base.cron',
						parameters: {},
						position: [100, 100],
					},
				],
			};
			mockSearchEngineService.isAvailable.mockReturnValue(true);
			mockSearchEngineService.indexDocument.mockResolvedValue();
			await service.indexWorkflow(cronWorkflow);
			expect(mockSearchEngineService.indexDocument).toHaveBeenCalledWith(
				'workflows',
				expect.objectContaining({
					hasWebhooks: false,
					hasCronTriggers: true,
					hasErrorTrigger: false,
				}),
			);
		});
		it('should calculate workflow complexity correctly', async () => {
			const complexWorkflow = {
				...mockWorkflow,
				nodes: [
					{ id: '1', type: 'n8n-nodes-base.start', name: 'Start' },
					{ id: '2', type: 'n8n-nodes-base.if', name: 'If' },
					{ id: '3', type: 'n8n-nodes-base.switch', name: 'Switch' },
					{ id: '4', type: 'n8n-nodes-base.splitInBatches', name: 'Split' },
				],
				connections: {
					Start: { main: [[{ node: 'If' }]] },
					If: { main: [[{ node: 'Switch' }, { node: 'Split' }]] },
				},
			};
			mockSearchEngineService.isAvailable.mockReturnValue(true);
			mockSearchEngineService.indexDocument.mockResolvedValue();
			await service.indexWorkflow(complexWorkflow);
			expect(mockSearchEngineService.indexDocument).toHaveBeenCalledWith(
				'workflows',
				expect.objectContaining({
					complexity: expect.any(Number),
				}),
			);
			const call = mockSearchEngineService.indexDocument.mock.calls[0][1];
			expect(call.complexity).toBeGreaterThan(4);
		});
		it('should handle workflows without optional properties', async () => {
			const minimalWorkflow = {
				id: 'minimal-1',
				name: 'Minimal Workflow',
				active: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				nodes: [],
				connections: {},
			};
			mockSearchEngineService.isAvailable.mockReturnValue(true);
			mockSearchEngineService.indexDocument.mockResolvedValue();
			await service.indexWorkflow(minimalWorkflow);
			expect(mockSearchEngineService.indexDocument).toHaveBeenCalledWith(
				'workflows',
				expect.objectContaining({
					id: 'minimal-1',
					name: 'Minimal Workflow',
					description: undefined,
					tags: [],
					nodeTypes: [],
					nodeCount: 0,
					projectId: undefined,
					projectName: undefined,
					folderId: undefined,
					folderName: undefined,
				}),
			);
		});
	});
});
//# sourceMappingURL=workflow-indexing.service.test.js.map
