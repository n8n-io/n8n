import { Logger } from '@n8n/backend-common';
import { WorkflowDependencyRepository } from '@n8n/db';
import { ErrorReporter } from 'n8n-core';
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
			{
				id: 'node-1',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				position: [0, 0],
				parameters: { path: 'webhook-1' },
			},
			{
				id: 'node-2',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [100, 0],
				credentials: {
					httpAuth: { id: 'cred-1', name: 'Auth 1' },
					apiKey: { id: 'cred-2', name: 'Auth 2' },
				},
				parameters: {},
			},
			{
				id: 'node-3',
				name: 'Execute Workflow (string)',
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1,
				position: [200, 0],
				parameters: { workflowId: 'sub-workflow-1' },
			},
			{
				id: 'node-4',
				name: 'Execute Workflow (object)',
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1,
				position: [300, 0],
				parameters: { workflowId: { value: 'sub-workflow-2' } },
			},
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
						dependencyInfo: 'node-1',
					}),
					expect.objectContaining({
						dependencyType: 'nodeType',
						dependencyKey: 'n8n-nodes-base.httpRequest',
						dependencyInfo: 'node-2',
					}),
					expect.objectContaining({
						dependencyType: 'nodeType',
						dependencyKey: 'n8n-nodes-base.executeWorkflow',
						dependencyInfo: 'node-3',
					}),
					expect.objectContaining({
						dependencyType: 'nodeType',
						dependencyKey: 'n8n-nodes-base.executeWorkflow',
						dependencyInfo: 'node-4',
					}),
					// webhookPath dependencies
					expect.objectContaining({
						dependencyType: 'webhookPath',
						dependencyKey: 'webhook-1',
						dependencyInfo: 'node-1',
					}),
					// credentialId dependencies
					expect.objectContaining({
						dependencyType: 'credentialId',
						dependencyKey: 'cred-1',
						dependencyInfo: 'node-2',
					}),
					expect.objectContaining({
						dependencyType: 'credentialId',
						dependencyKey: 'cred-2',
						dependencyInfo: 'node-2',
					}),
					// workflowCall dependencies (both string and object format)
					expect.objectContaining({
						dependencyType: 'workflowCall',
						dependencyKey: 'sub-workflow-1',
						dependencyInfo: 'node-3',
					}),
					expect.objectContaining({
						dependencyType: 'workflowCall',
						dependencyKey: 'sub-workflow-2',
						dependencyInfo: 'node-4',
					}),
				]),
			}),
		);
	});

	it('should handle repository errors gracefully', async () => {
		const error = new Error('Database error');
		mockRepository.updateDependenciesForWorkflow.mockRejectedValue(error);

		const workflow = createWorkflow([
			{
				id: 'node-1',
				name: 'Node',
				type: 'n8n-nodes-base.start',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		]);

		await service.updateIndexFor(workflow);

		expect(mockLogger.error).toHaveBeenCalledWith(
			'Failed to update workflow dependency index for workflow workflow-123: Database error',
		);
		expect(mockErrorReporter.error).toHaveBeenCalledWith(error);
	});
});
