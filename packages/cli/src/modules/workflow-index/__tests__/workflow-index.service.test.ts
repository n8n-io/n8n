/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { WorkflowDependencyRepository, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { ErrorReporter } from 'n8n-core';
import type { INode, IWorkflowBase } from 'n8n-workflow';

import { WorkflowIndexService } from '../workflow-index.service';
import { EventService } from '@/events/event.service';

describe('WorkflowIndexService', () => {
	let service: WorkflowIndexService;
	const mockWorkflowDependencyRepository = mockInstance(WorkflowDependencyRepository);
	const mockWorkflowRepository = mockInstance(WorkflowRepository);
	const mockLogger = mockInstance(Logger);
	const mockErrorReporter = mockInstance(ErrorReporter);
	const mockEventService = mockInstance(EventService);

	beforeEach(() => {
		jest.resetAllMocks();

		service = new WorkflowIndexService(
			mockWorkflowDependencyRepository,
			mockWorkflowRepository,
			mockEventService,
			mockLogger,
			mockErrorReporter,
		);
	});

	const createNode = (overrides: Partial<INode> & { id: string; type: string }): INode => {
		const { parameters, ...rest } = overrides;
		return {
			name: overrides.id,
			typeVersion: 1,
			position: [0, 0],
			parameters: parameters ?? {},
			...rest,
		};
	};

	const createWorkflow = (nodes: INode[]): IWorkflowBase => ({
		id: 'workflow-123',
		name: 'Test Workflow',
		active: true,
		activeVersionId: 'some-version-id',
		isArchived: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		versionCounter: 1,
		nodes,
		connections: {},
	});

	const createWorkflowEntity = (nodes: INode[]): WorkflowEntity => {
		const workflow = createWorkflow(nodes);
		return Object.assign(new WorkflowEntity(), workflow);
	};

	describe('updateIndexFor()', () => {
		it('should extract all dependency types correctly', async () => {
			mockWorkflowDependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			const workflow = createWorkflow([
				createNode({
					id: 'node-1',
					type: 'n8n-nodes-base.webhook',
					parameters: { path: 'webhook-1' },
				}),
				createNode({
					id: 'node-2',
					type: 'n8n-nodes-base.httpRequest',
					credentials: {
						httpAuth: { id: 'cred-1', name: 'Auth 1' },
						apiKey: { id: 'cred-2', name: 'Auth 2' },
					},
				}),
				createNode({
					id: 'node-3',
					type: 'n8n-nodes-base.executeWorkflow',
					parameters: { workflowId: 'sub-workflow-1' },
				}),
				createNode({
					id: 'node-4',
					type: 'n8n-nodes-base.executeWorkflow',
					parameters: { workflowId: { value: 'sub-workflow-2' } },
				}),
			]);

			await service.updateIndexFor(workflow);

			expect(mockWorkflowDependencyRepository.updateDependenciesForWorkflow).toHaveBeenCalledWith(
				'workflow-123',
				expect.objectContaining({
					dependencies: expect.arrayContaining([
						// nodeType dependencies
						expect.objectContaining({
							dependencyType: 'nodeType',
							dependencyKey: 'n8n-nodes-base.webhook',
							dependencyInfo: { nodeId: 'node-1', nodeVersion: 1 },
						}),
						expect.objectContaining({
							dependencyType: 'nodeType',
							dependencyKey: 'n8n-nodes-base.httpRequest',
							dependencyInfo: { nodeId: 'node-2', nodeVersion: 1 },
						}),
						expect.objectContaining({
							dependencyType: 'nodeType',
							dependencyKey: 'n8n-nodes-base.executeWorkflow',
							dependencyInfo: { nodeId: 'node-3', nodeVersion: 1 },
						}),
						expect.objectContaining({
							dependencyType: 'nodeType',
							dependencyKey: 'n8n-nodes-base.executeWorkflow',
							dependencyInfo: { nodeId: 'node-4', nodeVersion: 1 },
						}),
						// webhookPath dependencies
						expect.objectContaining({
							dependencyType: 'webhookPath',
							dependencyKey: 'webhook-1',
							dependencyInfo: { nodeId: 'node-1', nodeVersion: 1 },
						}),
						// credentialId dependencies
						expect.objectContaining({
							dependencyType: 'credentialId',
							dependencyKey: 'cred-1',
							dependencyInfo: { nodeId: 'node-2', nodeVersion: 1 },
						}),
						expect.objectContaining({
							dependencyType: 'credentialId',
							dependencyKey: 'cred-2',
							dependencyInfo: { nodeId: 'node-2', nodeVersion: 1 },
						}),
						// workflowCall dependencies (both string and object format)
						expect.objectContaining({
							dependencyType: 'workflowCall',
							dependencyKey: 'sub-workflow-1',
							dependencyInfo: { nodeId: 'node-3', nodeVersion: 1 },
						}),
						expect.objectContaining({
							dependencyType: 'workflowCall',
							dependencyKey: 'sub-workflow-2',
							dependencyInfo: { nodeId: 'node-4', nodeVersion: 1 },
						}),
					]),
				}),
			);
		});

		it('should handle repository errors gracefully', async () => {
			const error = new Error('Database error');
			mockWorkflowDependencyRepository.updateDependenciesForWorkflow.mockRejectedValue(error);

			const workflow = createWorkflow([
				createNode({
					id: 'node-1',
					type: 'n8n-nodes-base.start',
				}),
			]);

			await service.updateIndexFor(workflow);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to update workflow dependency index for workflow workflow-123: Database error',
			);
			expect(mockErrorReporter.error).toHaveBeenCalledWith(error);
		});

		it('should not create workflowCall dependencies for parameter, localFile, and url sources', async () => {
			mockWorkflowDependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			const workflow = createWorkflow([
				createNode({
					id: 'node-1',
					type: 'n8n-nodes-base.executeWorkflow',
					parameters: { source: 'parameter' },
				}),
				createNode({
					id: 'node-2',
					type: 'n8n-nodes-base.executeWorkflow',
					parameters: { source: 'localFile' },
				}),
				createNode({
					id: 'node-3',
					type: 'n8n-nodes-base.executeWorkflow',
					parameters: { source: 'url' },
				}),
			]);

			await service.updateIndexFor(workflow);

			expect(mockWorkflowDependencyRepository.updateDependenciesForWorkflow).toHaveBeenCalledWith(
				'workflow-123',
				expect.objectContaining({
					dependencies: expect.not.arrayContaining([
						expect.objectContaining({
							dependencyType: 'workflowCall',
						}),
					]),
				}),
			);
		});

		it('should handle multiple credentials on a single node', async () => {
			mockWorkflowDependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			const workflow = createWorkflow([
				createNode({
					id: 'node-1',
					type: 'n8n-nodes-base.httpRequest',
					credentials: {
						httpAuth: { id: 'cred-1', name: 'Basic Auth' },
						apiKey: { id: 'cred-2', name: 'API Key' },
						oAuth2: { id: 'cred-3', name: 'OAuth2' },
					},
				}),
			]);

			await service.updateIndexFor(workflow);

			expect(mockWorkflowDependencyRepository.updateDependenciesForWorkflow).toHaveBeenCalledWith(
				'workflow-123',
				expect.objectContaining({
					dependencies: expect.arrayContaining([
						expect.objectContaining({
							dependencyType: 'credentialId',
							dependencyKey: 'cred-1',
							dependencyInfo: { nodeId: 'node-1', nodeVersion: 1 },
						}),
						expect.objectContaining({
							dependencyType: 'credentialId',
							dependencyKey: 'cred-2',
							dependencyInfo: { nodeId: 'node-1', nodeVersion: 1 },
						}),
						expect.objectContaining({
							dependencyType: 'credentialId',
							dependencyKey: 'cred-3',
							dependencyInfo: { nodeId: 'node-1', nodeVersion: 1 },
						}),
					]),
				}),
			);
		});

		it('should skip credentials with null or empty id', async () => {
			mockWorkflowDependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			const workflow = createWorkflow([
				createNode({
					id: 'node-1',
					type: 'n8n-nodes-base.httpRequest',
					credentials: {
						httpAuth: { id: 'cred-1', name: 'Valid Auth' },
						apiKey: { id: null, name: 'Invalid API Key' },
						oAuth2: { id: '', name: 'Empty OAuth2' },
					},
				}),
			]);

			await service.updateIndexFor(workflow);

			const call = mockWorkflowDependencyRepository.updateDependenciesForWorkflow.mock.calls[0];
			const dependencies = call[1].dependencies;

			// Should have nodeType + only 1 credential (cred-1)
			expect(dependencies).toHaveLength(2);
			expect(dependencies).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						dependencyType: 'nodeType',
						dependencyKey: 'n8n-nodes-base.httpRequest',
						dependencyInfo: { nodeId: 'node-1', nodeVersion: 1 },
					}),
					expect.objectContaining({
						dependencyType: 'credentialId',
						dependencyKey: 'cred-1',
						dependencyInfo: { nodeId: 'node-1', nodeVersion: 1 },
					}),
				]),
			);
		});

		it('should skip nodes with missing type', async () => {
			mockWorkflowDependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			const workflow = createWorkflow([
				createNode({
					id: 'node-1',
					type: 'n8n-nodes-base.httpRequest',
				}),
				{
					id: 'node-2',
					name: 'node-2',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
				} as INode,
			]);

			await service.updateIndexFor(workflow);

			const call = mockWorkflowDependencyRepository.updateDependenciesForWorkflow.mock.calls[0];
			const dependencies = call[1].dependencies;

			expect(dependencies).toHaveLength(1);
			expect(dependencies[0]).toEqual(
				expect.objectContaining({
					dependencyType: 'nodeType',
					dependencyKey: 'n8n-nodes-base.httpRequest',
					dependencyInfo: { nodeId: 'node-1', nodeVersion: 1 },
				}),
			);
		});

		it('should skip webhook nodes with missing path', async () => {
			mockWorkflowDependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			const workflow = createWorkflow([
				createNode({
					id: 'node-1',
					type: 'n8n-nodes-base.webhook',
					parameters: { path: 'valid-path' },
				}),
				createNode({
					id: 'node-2',
					type: 'n8n-nodes-base.webhook',
					parameters: {},
				}),
			]);

			await service.updateIndexFor(workflow);

			const call = mockWorkflowDependencyRepository.updateDependenciesForWorkflow.mock.calls[0];
			const dependencies = call[1].dependencies;

			expect(dependencies).toHaveLength(3);
			expect(dependencies).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						dependencyType: 'nodeType',
						dependencyKey: 'n8n-nodes-base.webhook',
						dependencyInfo: { nodeId: 'node-1', nodeVersion: 1 },
					}),
					expect.objectContaining({
						dependencyType: 'nodeType',
						dependencyKey: 'n8n-nodes-base.webhook',
						dependencyInfo: { nodeId: 'node-2', nodeVersion: 1 },
					}),
					expect.objectContaining({
						dependencyType: 'webhookPath',
						dependencyKey: 'valid-path',
						dependencyInfo: { nodeId: 'node-1', nodeVersion: 1 },
					}),
				]),
			);
		});
	});

	describe('init()', () => {
		it('should register event listeners for workflow events', () => {
			service.init();

			expect(mockEventService.on).toHaveBeenCalledTimes(4);
			expect(mockEventService.on).toHaveBeenCalledWith('server-started', expect.any(Function));
			expect(mockEventService.on).toHaveBeenCalledWith('workflow-created', expect.any(Function));
			expect(mockEventService.on).toHaveBeenCalledWith('workflow-saved', expect.any(Function));
			expect(mockEventService.on).toHaveBeenCalledWith('workflow-deleted', expect.any(Function));
		});
	});

	describe('buildIndex()', () => {
		it('should retrieve unindexed workflows and update their dependencies', async () => {
			const workflow1 = createWorkflowEntity([
				createNode({ id: 'node-1', type: 'n8n-nodes-base.start' }),
			]);
			const workflow2 = createWorkflowEntity([
				createNode({ id: 'node-2', type: 'n8n-nodes-base.webhook', parameters: { path: 'test' } }),
			]);
			workflow2.id = 'workflow-456';

			// Mock findWorkflowsNeedingIndexing to return workflows on first call, empty on second
			mockWorkflowRepository.findWorkflowsNeedingIndexing
				.mockResolvedValueOnce([workflow1, workflow2])
				.mockResolvedValueOnce([]);

			mockWorkflowDependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			await service.buildIndex();

			// Verify findWorkflowsNeedingIndexing was called with correct pagination
			expect(mockWorkflowRepository.findWorkflowsNeedingIndexing).toHaveBeenCalledWith(100); // default batch size

			// Verify updateDependenciesForWorkflow was called for each workflow
			expect(mockWorkflowDependencyRepository.updateDependenciesForWorkflow).toHaveBeenCalledTimes(
				2,
			);
			expect(mockWorkflowDependencyRepository.updateDependenciesForWorkflow).toHaveBeenCalledWith(
				'workflow-123',
				expect.any(Object),
			);
			expect(mockWorkflowDependencyRepository.updateDependenciesForWorkflow).toHaveBeenCalledWith(
				'workflow-456',
				expect.any(Object),
			);
		});

		it('should process workflows in batches', async () => {
			// Create a service with a small batch size to test batching behavior
			const batchSize = 2;
			const serviceWithSmallBatch = new WorkflowIndexService(
				mockWorkflowDependencyRepository,
				mockWorkflowRepository,
				mockEventService,
				mockLogger,
				mockErrorReporter,
				batchSize,
			);

			// Create 5 workflows to test multiple batches
			const workflows = Array.from({ length: 5 }, (_, i) => {
				const workflow = createWorkflowEntity([
					createNode({ id: `node-${i}`, type: 'n8n-nodes-base.start' }),
				]);
				workflow.id = `workflow-${i}`;
				return workflow;
			});

			// Mock findWorkflowsNeedingIndexing to return workflows in batches
			mockWorkflowRepository.findWorkflowsNeedingIndexing
				.mockResolvedValueOnce([workflows[0], workflows[1]]) // First batch: 2 workflows
				.mockResolvedValueOnce([workflows[2], workflows[3]]) // Second batch: 2 workflows
				.mockResolvedValueOnce([workflows[4]]); // Third batch: 1 workflow (partial, should stop)

			mockWorkflowDependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			await serviceWithSmallBatch.buildIndex();

			// Verify findWorkflowsNeedingIndexing was called 3 times with correct pagination
			expect(mockWorkflowRepository.findWorkflowsNeedingIndexing).toHaveBeenCalledTimes(3);
			expect(mockWorkflowRepository.findWorkflowsNeedingIndexing).toHaveBeenNthCalledWith(
				1,
				batchSize,
			);
			expect(mockWorkflowRepository.findWorkflowsNeedingIndexing).toHaveBeenNthCalledWith(
				2,
				batchSize,
			);
			expect(mockWorkflowRepository.findWorkflowsNeedingIndexing).toHaveBeenNthCalledWith(
				3,
				batchSize,
			);

			// Verify all 5 workflows were processed
			expect(mockWorkflowDependencyRepository.updateDependenciesForWorkflow).toHaveBeenCalledTimes(
				5,
			);
			for (let i = 0; i < 5; i++) {
				expect(mockWorkflowDependencyRepository.updateDependenciesForWorkflow).toHaveBeenCalledWith(
					`workflow-${i}`,
					expect.any(Object),
				);
			}
		});
	});
});
