import { mock } from 'jest-mock-extended';

import { WorkflowDependencyGraphController } from '@/controllers/workflow-dependency-graph.controller';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { WorkflowDependencyGraphService } from '@/services/workflow-dependency-graph.service';

describe('WorkflowDependencyGraphController', () => {
	const workflowDependencyGraphService = mock<WorkflowDependencyGraphService>();
	const controller = new WorkflowDependencyGraphController(workflowDependencyGraphService);

	beforeEach(() => jest.clearAllMocks());

	describe('getFullGraph', () => {
		it('should return the full dependency graph', async () => {
			const mockGraph = {
				nodes: [{ id: 'workflow:1', name: 'Test', type: 'workflow' as const, active: true }],
				edges: [],
			};
			workflowDependencyGraphService.buildFullDependencyGraph.mockResolvedValue(mockGraph);

			const result = await controller.getFullGraph();

			expect(result).toEqual(mockGraph);
			expect(workflowDependencyGraphService.buildFullDependencyGraph).toHaveBeenCalled();
		});
	});

	describe('getWorkflowDependencies', () => {
		it('should return workflow dependencies for valid id', async () => {
			const mockDeps = {
				workflowId: '1',
				workflowName: 'Test Workflow',
				dependencies: {
					credentials: [],
					nodeTypes: [],
					calledWorkflows: [],
					webhookPaths: [],
				},
				dependents: {
					calledByWorkflows: [],
				},
			};
			workflowDependencyGraphService.getWorkflowDependencies.mockResolvedValue(mockDeps);

			const result = await controller.getWorkflowDependencies('1');

			expect(result).toEqual(mockDeps);
			expect(workflowDependencyGraphService.getWorkflowDependencies).toHaveBeenCalledWith('1');
		});
	});

	describe('getCredentialUsage', () => {
		it('should return credential usage information', async () => {
			const mockUsage = {
				credentialId: '1',
				credentialName: 'API Key',
				credentialType: 'httpHeaderAuth',
				usedByWorkflows: [],
			};
			workflowDependencyGraphService.getCredentialUsage.mockResolvedValue(mockUsage);

			const result = await controller.getCredentialUsage('1');

			expect(result).toEqual(mockUsage);
			expect(workflowDependencyGraphService.getCredentialUsage).toHaveBeenCalledWith('1');
		});
	});

	describe('analyzeWorkflowImpact', () => {
		it('should analyze workflow impact', async () => {
			const mockImpact = {
				resourceType: 'workflow' as const,
				resourceId: '1',
				resourceName: 'Test Workflow',
				impactedWorkflows: [],
				totalImpactedCount: 0,
				activeImpactedCount: 0,
			};
			workflowDependencyGraphService.analyzeImpact.mockResolvedValue(mockImpact);

			const result = await controller.analyzeWorkflowImpact('1');

			expect(result).toEqual(mockImpact);
			expect(workflowDependencyGraphService.analyzeImpact).toHaveBeenCalledWith('workflow', '1');
		});
	});

	describe('analyzeCredentialImpact', () => {
		it('should analyze credential impact', async () => {
			const mockImpact = {
				resourceType: 'credential' as const,
				resourceId: '1',
				resourceName: 'API Key',
				impactedWorkflows: [],
				totalImpactedCount: 0,
				activeImpactedCount: 0,
			};
			workflowDependencyGraphService.analyzeImpact.mockResolvedValue(mockImpact);

			const result = await controller.analyzeCredentialImpact('1');

			expect(result).toEqual(mockImpact);
			expect(workflowDependencyGraphService.analyzeImpact).toHaveBeenCalledWith('credential', '1');
		});
	});

	describe('analyzeImpact', () => {
		it('should throw BadRequestError for invalid resource type', async () => {
			await expect(controller.analyzeImpact('invalid', '1')).rejects.toThrow(BadRequestError);
			await expect(controller.analyzeImpact('invalid', '1')).rejects.toThrow(
				'type must be either "credential" or "workflow"',
			);
		});

		it('should call service for valid workflow type', async () => {
			const mockImpact = {
				resourceType: 'workflow' as const,
				resourceId: '1',
				resourceName: 'Test',
				impactedWorkflows: [],
				totalImpactedCount: 0,
				activeImpactedCount: 0,
			};
			workflowDependencyGraphService.analyzeImpact.mockResolvedValue(mockImpact);

			const result = await controller.analyzeImpact('workflow', '1');

			expect(result).toEqual(mockImpact);
			expect(workflowDependencyGraphService.analyzeImpact).toHaveBeenCalledWith('workflow', '1');
		});

		it('should call service for valid credential type', async () => {
			const mockImpact = {
				resourceType: 'credential' as const,
				resourceId: '1',
				resourceName: 'API Key',
				impactedWorkflows: [],
				totalImpactedCount: 0,
				activeImpactedCount: 0,
			};
			workflowDependencyGraphService.analyzeImpact.mockResolvedValue(mockImpact);

			const result = await controller.analyzeImpact('credential', '1');

			expect(result).toEqual(mockImpact);
			expect(workflowDependencyGraphService.analyzeImpact).toHaveBeenCalledWith('credential', '1');
		});
	});
});
