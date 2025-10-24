import { mockInstance } from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import {
	type WorkflowDependency,
	WorkflowDependencyRepository,
	WorkflowRepository,
	WorkflowEntity,
} from '@n8n/db';
import { v4 as uuid } from 'uuid';

import type { EventService } from '@/events/event.service';
import { WorkflowIndexService } from '../workflow-index.service';

describe('WorkflowIndexService', () => {
	const workflowRepository = mockInstance(WorkflowRepository);
	const dependencyRepository = mockInstance(WorkflowDependencyRepository);
	const logger = mockInstance(Logger);

	// Create a mock EventService that captures event callbacks
	let eventCallbacks: Map<string, Array<(...args: unknown[]) => Promise<void>>>;
	let eventService: EventService;

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

	beforeEach(() => {
		jest.clearAllMocks();

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
	});

	describe('init() and server-started event', () => {
		test('should index a workflow with a single node when server starts', async () => {
			// Arrange
			const workflowIndexService = new WorkflowIndexService(
				eventService,
				dependencyRepository,
				workflowRepository,
				logger,
			);

			const mockWorkflow = createMockWorkflow({
				id: 'workflow-123',
				nodes: [
					{
						id: 'node-1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
					},
				],
			});

			workflowRepository.find.mockResolvedValue([mockWorkflow]);
			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();

			// Trigger the server-started event
			const serverStartedCallbacks = eventCallbacks.get('server-started');
			expect(serverStartedCallbacks).toBeDefined();
			expect(serverStartedCallbacks!.length).toBe(1);

			await serverStartedCallbacks![0]();

			// Assert
			expect(workflowRepository.find).toHaveBeenCalledTimes(1);
			expect(dependencyRepository.updateDependenciesForWorkflow).toHaveBeenCalledTimes(1);

			const [workflowId, dependencies] = dependencyRepository.updateDependenciesForWorkflow.mock
				.calls[0] as [string, WorkflowDependency[]];

			expect(workflowId).toBe('workflow-123');
			expect(dependencies).toHaveLength(1);
			expect(dependencies[0]).toMatchObject({
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
			);

			const mockWorkflows = [
				createMockWorkflow({
					id: 'workflow-1',
					name: 'Workflow 1',
					versionCounter: 1,
					nodes: [
						{
							id: 'node-1',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							position: [250, 300],
							parameters: {},
						},
					],
				}),
				createMockWorkflow({
					id: 'workflow-2',
					name: 'Workflow 2',
					versionCounter: 2,
					nodes: [
						{
							id: 'node-2',
							name: 'Slack',
							type: 'n8n-nodes-base.slack',
							typeVersion: 1,
							position: [250, 300],
							parameters: {},
						},
					],
				}),
			];

			workflowRepository.find.mockResolvedValue(mockWorkflows);
			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();
			const serverStartedCallbacks = eventCallbacks.get('server-started');
			await serverStartedCallbacks![0]();

			// Assert
			expect(workflowRepository.find).toHaveBeenCalledTimes(1);
			expect(dependencyRepository.updateDependenciesForWorkflow).toHaveBeenCalledTimes(2);

			const [workflowId1, dependencies1] = dependencyRepository.updateDependenciesForWorkflow.mock
				.calls[0] as [string, WorkflowDependency[]];
			const [workflowId2, dependencies2] = dependencyRepository.updateDependenciesForWorkflow.mock
				.calls[1] as [string, WorkflowDependency[]];

			expect(workflowId1).toBe('workflow-1');
			expect(workflowId2).toBe('workflow-2');
			expect(dependencies1).toHaveLength(1);
			expect(dependencies2).toHaveLength(1);
		});

		test('should handle workflows with no nodes', async () => {
			// Arrange
			const workflowIndexService = new WorkflowIndexService(
				eventService,
				dependencyRepository,
				workflowRepository,
				logger,
			);

			const mockWorkflow = createMockWorkflow({
				id: 'workflow-123',
				name: 'Empty Workflow',
				nodes: [],
			});

			workflowRepository.find.mockResolvedValue([mockWorkflow]);
			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();
			const serverStartedCallbacks = eventCallbacks.get('server-started');
			await serverStartedCallbacks![0]();

			// Assert
			expect(dependencyRepository.updateDependenciesForWorkflow).toHaveBeenCalledTimes(1);

			const [workflowId, dependencies] = dependencyRepository.updateDependenciesForWorkflow.mock
				.calls[0] as [string, WorkflowDependency[]];

			expect(workflowId).toBe('workflow-123');
			expect(dependencies).toHaveLength(0);
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
			);

			const mockWorkflow = createMockWorkflow({
				id: 'workflow-456',
				name: 'Updated Workflow',
				versionCounter: 2,
				nodes: [
					{
						id: 'node-1',
						name: 'Gmail',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
					},
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
				.calls[0] as [string, WorkflowDependency[]];

			expect(workflowId).toBe('workflow-456');
			expect(dependencies).toHaveLength(1);
			expect(dependencies[0]).toMatchObject({
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
			);

			const mockWorkflow = createMockWorkflow({
				id: 'workflow-123',
				nodes: [
					{
						id: 'node-1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
					},
					{
						id: 'node-2',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 1,
						position: [450, 300],
						parameters: {},
					},
				],
			});

			workflowRepository.find.mockResolvedValue([mockWorkflow]);
			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();
			const serverStartedCallbacks = eventCallbacks.get('server-started');
			await serverStartedCallbacks![0]();

			// Assert
			const [, dependencies] = dependencyRepository.updateDependenciesForWorkflow.mock.calls[0] as [
				string,
				WorkflowDependency[],
			];

			expect(dependencies).toHaveLength(2);
			expect(dependencies[0]).toMatchObject({
				dependencyType: 'nodeType',
				dependencyKey: 'n8n-nodes-base.httpRequest',
				dependencyInfo: 'node-1',
			});
			expect(dependencies[1]).toMatchObject({
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
			);

			const mockWorkflow = createMockWorkflow({
				id: 'workflow-123',
				nodes: [
					{
						id: 'node-1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
						credentials: {
							slackApi: {
								id: 'cred-123',
								name: 'My Slack Account',
							},
						},
					},
				],
			});

			workflowRepository.find.mockResolvedValue([mockWorkflow]);
			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();
			const serverStartedCallbacks = eventCallbacks.get('server-started');
			await serverStartedCallbacks![0]();

			// Assert
			const [, dependencies] = dependencyRepository.updateDependenciesForWorkflow.mock.calls[0] as [
				string,
				WorkflowDependency[],
			];

			expect(dependencies).toHaveLength(2); // One for nodeType, one for credential
			const credentialDependency = dependencies.find((d) => d.dependencyType === 'credential');
			expect(credentialDependency).toMatchObject({
				dependencyType: 'credential',
				dependencyKey: 'cred-123',
			});
			expect(JSON.parse(credentialDependency!.dependencyInfo!)).toMatchObject({
				nodeId: 'node-1',
				credentialType: 'slackApi',
				credentialName: 'My Slack Account',
			});
		});

		test('should index workflow call dependencies', async () => {
			const workflowIndexService = new WorkflowIndexService(
				eventService,
				dependencyRepository,
				workflowRepository,
				logger,
			);

			const mockWorkflow = createMockWorkflow({
				id: 'workflow-123',
				name: 'Parent Workflow',
				nodes: [
					{
						id: 'node-1',
						name: 'Execute Workflow',
						type: 'n8n-nodes-base.workflowCall',
						typeVersion: 1,
						position: [250, 300],
						parameters: {
							workflowId: 'child-workflow-456',
						},
					},
				],
			});

			workflowRepository.find.mockResolvedValue([mockWorkflow]);
			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();
			const serverStartedCallbacks = eventCallbacks.get('server-started');
			await serverStartedCallbacks![0]();

			// Assert
			const [, dependencies] = dependencyRepository.updateDependenciesForWorkflow.mock.calls[0] as [
				string,
				WorkflowDependency[],
			];

			expect(dependencies).toHaveLength(2); // One for nodeType, one for workflowCall
			const workflowCallDependency = dependencies.find((d) => d.dependencyType === 'workflowCall');
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
			);

			const mockWorkflow = createMockWorkflow({
				id: 'workflow-123',
				name: 'Webhook Workflow',
				nodes: [
					{
						id: 'node-1',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 1,
						position: [250, 300],
						parameters: {
							path: 'my-webhook-path',
						},
					},
				],
			});

			workflowRepository.find.mockResolvedValue([mockWorkflow]);
			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();
			const serverStartedCallbacks = eventCallbacks.get('server-started');
			await serverStartedCallbacks![0]();

			// Assert
			const [, dependencies] = dependencyRepository.updateDependenciesForWorkflow.mock.calls[0] as [
				string,
				WorkflowDependency[],
			];

			expect(dependencies).toHaveLength(2); // One for nodeType, one for webhookPath
			const webhookDependency = dependencies.find((d) => d.dependencyType === 'webhookPath');
			expect(webhookDependency).toMatchObject({
				dependencyType: 'webhookPath',
				dependencyKey: 'my-webhook-path',
				dependencyInfo: 'node-1',
			});
		});

		test('should index all dependency types in a complex workflow', async () => {
			const workflowIndexService = new WorkflowIndexService(
				eventService,
				dependencyRepository,
				workflowRepository,
				logger,
			);

			const mockWorkflow = createMockWorkflow({
				id: 'workflow-complex',
				name: 'Complex Workflow',
				nodes: [
					{
						id: 'node-1',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 1,
						position: [250, 300],
						parameters: {
							path: 'incoming-webhook',
						},
					},
					{
						id: 'node-2',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 1,
						position: [450, 300],
						parameters: {},
						credentials: {
							slackApi: {
								id: 'cred-slack',
								name: 'Slack Credentials',
							},
						},
					},
					{
						id: 'node-3',
						name: 'Execute Workflow',
						type: 'n8n-nodes-base.workflowCall',
						typeVersion: 1,
						position: [650, 300],
						parameters: {
							workflowId: 'other-workflow',
						},
					},
				],
			});

			workflowRepository.find.mockResolvedValue([mockWorkflow]);
			dependencyRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

			// Act
			workflowIndexService.init();
			const serverStartedCallbacks = eventCallbacks.get('server-started');
			await serverStartedCallbacks![0]();

			// Assert
			const [, dependencies] = dependencyRepository.updateDependenciesForWorkflow.mock.calls[0] as [
				string,
				WorkflowDependency[],
			];

			// 3 nodeType + 1 credential + 1 workflowCall + 1 webhookPath = 6 total
			expect(dependencies).toHaveLength(6);

			const nodeTypeDeps = dependencies.filter((d) => d.dependencyType === 'nodeType');
			const credentialDeps = dependencies.filter((d) => d.dependencyType === 'credential');
			const workflowCallDeps = dependencies.filter((d) => d.dependencyType === 'workflowCall');
			const webhookDeps = dependencies.filter((d) => d.dependencyType === 'webhookPath');

			expect(nodeTypeDeps).toHaveLength(3);
			expect(credentialDeps).toHaveLength(1);
			expect(workflowCallDeps).toHaveLength(1);
			expect(webhookDeps).toHaveLength(1);
		});
	});
});
