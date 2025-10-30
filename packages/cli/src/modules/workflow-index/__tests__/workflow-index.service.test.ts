/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Logger } from '@n8n/backend-common';
import type { WorkflowDependencyRepository } from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import type { INode, IWorkflowBase } from 'n8n-workflow';

import { WorkflowIndexService } from '../workflow-index.service';

describe('WorkflowIndexService', () => {
	let service: WorkflowIndexService;
	let mockRepository: jest.Mocked<WorkflowDependencyRepository>;
	let mockLogger: jest.Mocked<Logger>;
	let mockErrorReporter: jest.Mocked<ErrorReporter>;

	beforeEach(() => {
		mockRepository = {
			updateDependenciesForWorkflow: jest.fn(),
		} as unknown as jest.Mocked<WorkflowDependencyRepository>;

		mockLogger = {
			debug: jest.fn(),
			error: jest.fn(),
		} as unknown as jest.Mocked<Logger>;

		mockErrorReporter = {
			error: jest.fn(),
			warn: jest.fn(),
		} as unknown as jest.Mocked<ErrorReporter>;

		service = new WorkflowIndexService(mockRepository, mockLogger, mockErrorReporter);
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
		isArchived: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		versionCounter: 1,
		nodes,
		connections: {},
	});

	it('should extract all dependency types correctly', async () => {
		mockRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

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

		expect(mockRepository.updateDependenciesForWorkflow).toHaveBeenCalledWith(
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
		mockRepository.updateDependenciesForWorkflow.mockRejectedValue(error);

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
		mockRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

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

		expect(mockRepository.updateDependenciesForWorkflow).toHaveBeenCalledWith(
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
		mockRepository.updateDependenciesForWorkflow.mockResolvedValue(true);

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

		expect(mockRepository.updateDependenciesForWorkflow).toHaveBeenCalledWith(
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
});
