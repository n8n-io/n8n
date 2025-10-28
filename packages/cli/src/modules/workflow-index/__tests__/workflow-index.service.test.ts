import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { WorkflowDependencyRepository, WorkflowRepository, WorkflowEntity } from '@n8n/db';
import type { WorkflowDependencies } from '@n8n/db';
import { ErrorReporter } from 'n8n-core';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import type { EventService } from '@/events/event.service';

import { WorkflowIndexService } from '../workflow-index.service';

describe('WorkflowIndexService', () => {
	const workflowRepository = mockInstance(WorkflowRepository);
	const dependencyRepository = mockInstance(WorkflowDependencyRepository);
	const logger = mockInstance(Logger);
	const errorReporter = mockInstance(ErrorReporter);

	// Create a mock EventService that captures event callbacks
	let eventCallbacks: Map<string, Array<(...args: unknown[]) => Promise<void>>>;
	let eventService: EventService;
	let workflowIndexService: WorkflowIndexService;

	// Helper to create mock workflows with all required WorkflowEntity properties
	const createMockWorkflow = (
		partial: Partial<WorkflowEntity> & { id: string },
	): WorkflowEntity => {
		const workflow = new WorkflowEntity();
		Object.assign(workflow, {
			name: 'Test Workflow',
			active: false,
			versionCounter: 1,
			connections: {},
			nodes: [],
			isArchived: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			versionId: uuid(),
			triggerCount: 0,
			tagMappings: [],
			shared: [],
			statistics: [],
			parentFolder: null,
			testRuns: [],
			...partial,
		});
		return workflow;
	};

	const createNode = (partial: Partial<INode> & { id: string }): INode => {
		return {
			name: 'Test Node',
			type: 'n8n-nodes-base.start',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...partial,
		};
	};

	beforeEach(() => {
		jest.clearAllMocks();
		workflowRepository.findWorkflowsNeedingIndexing.mockReset();
		dependencyRepository.updateDependenciesForWorkflow.mockReset();

		// Reset event callbacks
		eventCallbacks = new Map();

		// Create a mock EventService that captures callbacks
		eventService = {
			on: jest.fn((event: string, callback: (...args: unknown[]) => Promise<void>) => {
				if (!eventCallbacks.has(event)) {
					eventCallbacks.set(event, []);
				}
				eventCallbacks.get(event)!.push(callback);
			}),
		} as unknown as EventService;

		workflowIndexService = new WorkflowIndexService(
			eventService,
			dependencyRepository,
			workflowRepository,
			logger,
			errorReporter,
		);
	});

	describe('init() and server-started event', () => {
		test('should index a workflow with a single node when server starts', async () => {
			// Arrange
			const mockWorkflow = createMockWorkflow({
				id: 'workflow-123',
				nodes: [
					createNode({
						id: 'node-1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
					}),
				],
			});

			workflowRepository.findWorkflowsNeedingIndexing
				.mockResolvedValueOnce([mockWorkflow])
				.mockResolvedValueOnce([]);
			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();

			// Trigger the server-started event
			const serverStartedCallbacks = eventCallbacks.get('server-started');
			expect(serverStartedCallbacks).toBeDefined();
			expect(serverStartedCallbacks!.length).toBe(1);

			await serverStartedCallbacks![0]();

			// Assert
			expect(workflowRepository.findWorkflowsNeedingIndexing).toHaveBeenCalledWith({
				take: 100,
				skip: 0,
			});
			expect(dependencyRepository.updateDependenciesForWorkflow).toHaveBeenCalledTimes(1);

			const [workflowId, dependencies] = dependencyRepository.updateDependenciesForWorkflow.mock
				.calls[0] as [string, WorkflowDependencies];

			expect(workflowId).toBe('workflow-123');
			expect(dependencies.dependencies).toHaveLength(1);
			expect(dependencies.dependencies[0]).toMatchObject({
				workflowId: 'workflow-123',
				workflowVersionId: 1,
				dependencyType: 'nodeType',
				dependencyKey: 'n8n-nodes-base.httpRequest',
				dependencyInfo: 'node-1',
				indexVersionId: 1,
			});
		});

		test('should index multiple workflows when server starts', async () => {
			// Arrange
			const workflowIndexService = new WorkflowIndexService(
				eventService,
				dependencyRepository,
				workflowRepository,
				logger,
				errorReporter,
			);

			const mockWorkflows = [
				createMockWorkflow({
					id: 'workflow-1',
					name: 'Workflow 1',
					versionCounter: 1,
					nodes: [
						createNode({
							id: 'node-1',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
						}),
					],
				}),
				createMockWorkflow({
					id: 'workflow-2',
					name: 'Workflow 2',
					versionCounter: 2,
					nodes: [
						createNode({
							id: 'node-2',
							name: 'Slack',
							type: 'n8n-nodes-base.slack',
						}),
					],
				}),
			];

			workflowRepository.findWorkflowsNeedingIndexing
				.mockResolvedValueOnce(mockWorkflows)
				.mockResolvedValueOnce([]);
			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();
			const serverStartedCallbacks = eventCallbacks.get('server-started');
			await serverStartedCallbacks![0]();

			// Assert
			expect(workflowRepository.findWorkflowsNeedingIndexing).toHaveBeenCalledWith({
				take: 100,
				skip: 0,
			});
			expect(dependencyRepository.updateDependenciesForWorkflow).toHaveBeenCalledTimes(2);

			const [workflowId1, dependencies1] = dependencyRepository.updateDependenciesForWorkflow.mock
				.calls[0] as [string, WorkflowDependencies];
			const [workflowId2, dependencies2] = dependencyRepository.updateDependenciesForWorkflow.mock
				.calls[1] as [string, WorkflowDependencies];

			expect(workflowId1).toBe('workflow-1');
			expect(workflowId2).toBe('workflow-2');
			expect(dependencies1.dependencies).toHaveLength(1);
			expect(dependencies2.dependencies).toHaveLength(1);
		});

		test('should handle workflows with no nodes', async () => {
			// Arrange
			const workflowIndexService = new WorkflowIndexService(
				eventService,
				dependencyRepository,
				workflowRepository,
				logger,
				errorReporter,
			);

			const mockWorkflow = createMockWorkflow({
				id: 'workflow-123',
				name: 'Empty Workflow',
				nodes: [],
			});

			workflowRepository.findWorkflowsNeedingIndexing
				.mockResolvedValueOnce([mockWorkflow])
				.mockResolvedValueOnce([]);
			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();
			const serverStartedCallbacks = eventCallbacks.get('server-started');
			await serverStartedCallbacks![0]();

			// Assert
			expect(dependencyRepository.updateDependenciesForWorkflow).toHaveBeenCalledTimes(1);

			const [workflowId, dependencies] = dependencyRepository.updateDependenciesForWorkflow.mock
				.calls[0] as [string, WorkflowDependencies];

			expect(workflowId).toBe('workflow-123');
			expect(dependencies.dependencies).toHaveLength(0);
		});
	});

	describe('workflow-saved event', () => {
		test('should update index when workflow is saved', async () => {
			// Arrange
			const workflowIndexService = new WorkflowIndexService(
				eventService,
				dependencyRepository,
				workflowRepository,
				logger,
				errorReporter,
			);

			const mockWorkflow = createMockWorkflow({
				id: 'workflow-456',
				name: 'Updated Workflow',
				versionCounter: 2,
				nodes: [
					createNode({
						id: 'node-1',
						name: 'Gmail',
						type: 'n8n-nodes-base.gmail',
					}),
				],
			});

			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();

			// Trigger the workflow-saved event
			const workflowSavedCallbacks = eventCallbacks.get('workflow-saved');
			expect(workflowSavedCallbacks).toBeDefined();
			expect(workflowSavedCallbacks!.length).toBe(1);

			await workflowSavedCallbacks![0]({ workflow: mockWorkflow });

			// Assert
			expect(dependencyRepository.updateDependenciesForWorkflow).toHaveBeenCalledTimes(1);

			const [workflowId, dependencies] = dependencyRepository.updateDependenciesForWorkflow.mock
				.calls[0] as [string, WorkflowDependencies];

			expect(workflowId).toBe('workflow-456');
			expect(dependencies.dependencies).toHaveLength(1);
			expect(dependencies.dependencies[0]).toMatchObject({
				workflowId: 'workflow-456',
				workflowVersionId: 2,
				dependencyType: 'nodeType',
				dependencyKey: 'n8n-nodes-base.gmail',
				dependencyInfo: 'node-1',
			});
		});
	});

	describe('dependency indexing', () => {
		test('should index node type dependencies', async () => {
			const workflowIndexService = new WorkflowIndexService(
				eventService,
				dependencyRepository,
				workflowRepository,
				logger,
				errorReporter,
			);

			const mockWorkflow = createMockWorkflow({
				id: 'workflow-123',
				nodes: [
					createNode({
						id: 'node-1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
					}),
					createNode({
						id: 'node-2',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
					}),
				],
			});

			workflowRepository.findWorkflowsNeedingIndexing
				.mockResolvedValueOnce([mockWorkflow])
				.mockResolvedValueOnce([]);
			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();
			const serverStartedCallbacks = eventCallbacks.get('server-started');
			await serverStartedCallbacks![0]();

			// Assert
			const [, dependencies] = dependencyRepository.updateDependenciesForWorkflow.mock.calls[0] as [
				string,
				WorkflowDependencies,
			];

			expect(dependencies.dependencies).toHaveLength(2);
			expect(dependencies.dependencies[0]).toMatchObject({
				dependencyType: 'nodeType',
				dependencyKey: 'n8n-nodes-base.httpRequest',
				dependencyInfo: 'node-1',
			});
			expect(dependencies.dependencies[1]).toMatchObject({
				dependencyType: 'nodeType',
				dependencyKey: 'n8n-nodes-base.slack',
				dependencyInfo: 'node-2',
			});
		});

		test('should index credential dependencies', async () => {
			const workflowIndexService = new WorkflowIndexService(
				eventService,
				dependencyRepository,
				workflowRepository,
				logger,
				errorReporter,
			);

			const mockWorkflow = createMockWorkflow({
				id: 'workflow-123',
				nodes: [
					createNode({
						id: 'node-1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						credentials: {
							slackApi: {
								id: 'cred-123',
								name: 'My Slack Account',
							},
						},
					}),
				],
			});

			workflowRepository.findWorkflowsNeedingIndexing
				.mockResolvedValueOnce([mockWorkflow])
				.mockResolvedValueOnce([]);
			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();
			const serverStartedCallbacks = eventCallbacks.get('server-started');
			await serverStartedCallbacks![0]();

			// Assert
			const [, dependencies] = dependencyRepository.updateDependenciesForWorkflow.mock.calls[0] as [
				string,
				WorkflowDependencies,
			];

			expect(dependencies.dependencies).toHaveLength(2); // One for nodeType, one for credential
			const credentialDependency = dependencies.dependencies.find(
				(d) => d.dependencyType === 'credentialId',
			);
			expect(credentialDependency).toMatchObject({
				dependencyType: 'credentialId',
				dependencyKey: 'cred-123',
				dependencyInfo: 'node-1',
			});
		});

		test('should index workflow call dependencies', async () => {
			const workflowIndexService = new WorkflowIndexService(
				eventService,
				dependencyRepository,
				workflowRepository,
				logger,
				errorReporter,
			);

			const mockWorkflow = createMockWorkflow({
				id: 'workflow-123',
				name: 'Parent Workflow',
				nodes: [
					createNode({
						id: 'node-1',
						name: 'Execute Workflow',
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: {
							workflowId: 'child-workflow-456',
						},
					}),
				],
			});

			workflowRepository.findWorkflowsNeedingIndexing
				.mockResolvedValueOnce([mockWorkflow])
				.mockResolvedValueOnce([]);
			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();
			const serverStartedCallbacks = eventCallbacks.get('server-started');
			await serverStartedCallbacks![0]();

			// Assert
			const [, dependencies] = dependencyRepository.updateDependenciesForWorkflow.mock.calls[0] as [
				string,
				WorkflowDependencies,
			];

			expect(dependencies.dependencies).toHaveLength(2); // One for nodeType, one for workflowCall
			const workflowCallDependency = dependencies.dependencies.find(
				(d) => d.dependencyType === 'workflowCall',
			);
			expect(workflowCallDependency).toMatchObject({
				dependencyType: 'workflowCall',
				dependencyKey: 'child-workflow-456',
				dependencyInfo: 'node-1',
			});
		});

		test('should index webhook path dependencies', async () => {
			const workflowIndexService = new WorkflowIndexService(
				eventService,
				dependencyRepository,
				workflowRepository,
				logger,
				errorReporter,
			);

			const mockWorkflow = createMockWorkflow({
				id: 'workflow-123',
				name: 'Webhook Workflow',
				nodes: [
					createNode({
						id: 'node-1',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						parameters: {
							path: 'my-webhook-path',
						},
					}),
				],
			});

			workflowRepository.findWorkflowsNeedingIndexing
				.mockResolvedValueOnce([mockWorkflow])
				.mockResolvedValueOnce([]);
			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();
			const serverStartedCallbacks = eventCallbacks.get('server-started');
			await serverStartedCallbacks![0]();

			// Assert
			const [, dependencies] = dependencyRepository.updateDependenciesForWorkflow.mock.calls[0] as [
				string,
				WorkflowDependencies,
			];

			expect(dependencies.dependencies).toHaveLength(2); // One for nodeType, one for webhookPath
			const webhookDependency = dependencies.dependencies.find(
				(d) => d.dependencyType === 'webhookPath',
			);
			expect(webhookDependency).toMatchObject({
				dependencyType: 'webhookPath',
				dependencyKey: 'my-webhook-path',
				dependencyInfo: 'node-1',
			});
		});
	});
});
