import type {
	CredentialsRepository,
	WorkflowDependencyRepository,
	WorkflowRepository,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { WorkflowDependencyGraphService } from '@/services/workflow-dependency-graph.service';

describe('WorkflowDependencyGraphService', () => {
	const workflowDependencyRepository = mock<WorkflowDependencyRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const credentialsRepository = mock<CredentialsRepository>();

	const service = new WorkflowDependencyGraphService(
		workflowDependencyRepository,
		workflowRepository,
		credentialsRepository,
	);

	beforeEach(() => jest.clearAllMocks());

	describe('buildFullDependencyGraph', () => {
		it('should return empty graph when no workflows exist', async () => {
			workflowRepository.find.mockResolvedValue([]);
			workflowDependencyRepository.find.mockResolvedValue([]);

			const result = await service.buildFullDependencyGraph();

			expect(result).toEqual({ nodes: [], edges: [] });
		});

		it('should include workflow nodes in the graph', async () => {
			workflowRepository.find.mockResolvedValue([
				{ id: '1', name: 'Workflow 1', active: true },
				{ id: '2', name: 'Workflow 2', active: false },
			] as any[]);
			workflowDependencyRepository.find.mockResolvedValue([]);

			const result = await service.buildFullDependencyGraph();

			expect(result.nodes).toHaveLength(2);
			expect(result.nodes).toContainEqual({
				id: 'workflow:1',
				name: 'Workflow 1',
				type: 'workflow',
				active: true,
			});
			expect(result.nodes).toContainEqual({
				id: 'workflow:2',
				name: 'Workflow 2',
				type: 'workflow',
				active: false,
			});
		});

		it('should add credential nodes and edges for credential dependencies', async () => {
			workflowRepository.find.mockResolvedValue([
				{ id: '1', name: 'Workflow 1', active: true },
			] as any[]);
			workflowDependencyRepository.find.mockResolvedValue([
				{
					workflowId: '1',
					dependencyType: 'credentialId',
					dependencyKey: 'cred-1',
				},
			] as any[]);
			credentialsRepository.find.mockResolvedValue([
				{ id: 'cred-1', name: 'My API Key', type: 'httpHeaderAuth' },
			] as any[]);

			const result = await service.buildFullDependencyGraph();

			expect(result.nodes).toContainEqual({
				id: 'credential:cred-1',
				name: 'My API Key',
				type: 'credential',
			});
			expect(result.edges).toContainEqual({
				source: 'workflow:1',
				target: 'credential:cred-1',
				type: 'uses_credential',
				label: 'httpHeaderAuth',
			});
		});

		it('should add workflow call edges between workflows', async () => {
			workflowRepository.find
				.mockResolvedValueOnce([
					{ id: '1', name: 'Parent Workflow', active: true },
					{ id: '2', name: 'Child Workflow', active: true },
				] as any[])
				.mockResolvedValueOnce([{ id: '2', name: 'Child Workflow', active: true }] as any[]);

			workflowDependencyRepository.find.mockResolvedValue([
				{
					workflowId: '1',
					dependencyType: 'workflowCall',
					dependencyKey: '2',
				},
			] as any[]);
			credentialsRepository.find.mockResolvedValue([]);

			const result = await service.buildFullDependencyGraph();

			expect(result.edges).toContainEqual({
				source: 'workflow:1',
				target: 'workflow:2',
				type: 'calls_workflow',
			});
		});

		it('should skip archived workflows from graph', async () => {
			workflowRepository.find.mockResolvedValue([
				{ id: '1', name: 'Active Workflow', active: true },
			] as any[]);
			workflowDependencyRepository.find.mockResolvedValue([
				{
					workflowId: 'archived-id',
					dependencyType: 'credentialId',
					dependencyKey: 'cred-1',
				},
			] as any[]);
			credentialsRepository.find.mockResolvedValue([]);

			const result = await service.buildFullDependencyGraph();

			// No edges should be created for archived workflow
			expect(result.edges).toHaveLength(0);
		});
	});

	describe('getWorkflowDependencies', () => {
		it('should throw error when workflow not found', async () => {
			workflowRepository.findOne.mockResolvedValue(null);

			await expect(service.getWorkflowDependencies('non-existent')).rejects.toThrow(
				'Workflow non-existent not found',
			);
		});

		it('should return workflow dependencies', async () => {
			workflowRepository.findOne.mockResolvedValue({
				id: '1',
				name: 'Test Workflow',
			} as any);
			workflowDependencyRepository.find
				.mockResolvedValueOnce([
					{ workflowId: '1', dependencyType: 'credentialId', dependencyKey: 'cred-1' },
					{
						workflowId: '1',
						dependencyType: 'nodeType',
						dependencyKey: 'n8n-nodes-base.httpRequest',
					},
					{ workflowId: '1', dependencyType: 'workflowCall', dependencyKey: '2' },
					{ workflowId: '1', dependencyType: 'webhookPath', dependencyKey: '/webhook/test' },
				] as any[])
				.mockResolvedValueOnce([]); // No dependents
			credentialsRepository.find.mockResolvedValue([
				{ id: 'cred-1', name: 'API Key', type: 'httpHeaderAuth' },
			] as any);
			workflowRepository.find.mockResolvedValue([{ id: '2', name: 'Called Workflow' }] as any[]);

			const result = await service.getWorkflowDependencies('1');

			expect(result.workflowId).toBe('1');
			expect(result.workflowName).toBe('Test Workflow');
			expect(result.dependencies.credentials).toHaveLength(1);
			expect(result.dependencies.nodeTypes).toHaveLength(1);
			expect(result.dependencies.calledWorkflows).toHaveLength(1);
			expect(result.dependencies.webhookPaths).toHaveLength(1);
		});
	});

	describe('getCredentialUsage', () => {
		it('should throw error when credential not found', async () => {
			credentialsRepository.findOne.mockResolvedValue(null);

			await expect(service.getCredentialUsage('non-existent')).rejects.toThrow(
				'Credential non-existent not found',
			);
		});

		it('should return workflows using the credential', async () => {
			credentialsRepository.findOne.mockResolvedValue({
				id: 'cred-1',
				name: 'API Key',
				type: 'httpHeaderAuth',
			} as any);
			workflowDependencyRepository.find.mockResolvedValue([
				{
					workflowId: '1',
					dependencyType: 'credentialId',
					dependencyKey: 'cred-1',
					dependencyInfo: null,
				},
			] as any[]);
			workflowRepository.find.mockResolvedValue([
				{ id: '1', name: 'Workflow 1', active: true },
			] as any[]);

			const result = await service.getCredentialUsage('cred-1');

			expect(result.credentialId).toBe('cred-1');
			expect(result.credentialName).toBe('API Key');
			expect(result.usedByWorkflows).toHaveLength(1);
			expect(result.usedByWorkflows[0]).toEqual({
				id: '1',
				name: 'Workflow 1',
				active: true,
				nodeInfo: null,
			});
		});
	});

	describe('analyzeImpact', () => {
		describe('for credentials', () => {
			it('should return empty impact when credential is not used', async () => {
				credentialsRepository.findOne.mockResolvedValue({
					id: 'cred-1',
					name: 'Unused Credential',
				} as any);
				workflowDependencyRepository.find.mockResolvedValue([]);

				const result = await service.analyzeImpact('credential', 'cred-1');

				expect(result.totalImpactedCount).toBe(0);
				expect(result.impactedWorkflows).toHaveLength(0);
			});

			it('should return impacted workflows when credential is used', async () => {
				credentialsRepository.findOne.mockResolvedValue({
					id: 'cred-1',
					name: 'API Key',
				} as any);
				workflowDependencyRepository.find.mockResolvedValue([
					{ workflowId: '1', dependencyType: 'credentialId', dependencyKey: 'cred-1' },
				] as any[]);
				workflowRepository.find.mockResolvedValue([
					{ id: '1', name: 'Workflow 1', active: true },
				] as any[]);

				const result = await service.analyzeImpact('credential', 'cred-1');

				expect(result.totalImpactedCount).toBe(1);
				expect(result.activeImpactedCount).toBe(1);
				expect(result.impactedWorkflows[0].impactType).toBe('direct');
			});
		});

		describe('for workflows', () => {
			it('should return empty impact when workflow has no dependents', async () => {
				workflowRepository.findOne.mockResolvedValue({
					id: '1',
					name: 'Standalone Workflow',
				} as any);
				workflowDependencyRepository.find.mockResolvedValue([]);

				const result = await service.analyzeImpact('workflow', '1');

				expect(result.totalImpactedCount).toBe(0);
				expect(result.impactedWorkflows).toHaveLength(0);
			});

			it('should return direct dependents', async () => {
				workflowRepository.findOne.mockResolvedValue({
					id: '1',
					name: 'Library Workflow',
				} as any);
				workflowDependencyRepository.find.mockResolvedValueOnce([
					{ workflowId: '2', dependencyType: 'workflowCall', dependencyKey: '1' },
				] as any[]);
				workflowDependencyRepository.find.mockResolvedValue([]);
				workflowRepository.find.mockResolvedValue([
					{ id: '2', name: 'Calling Workflow', active: true },
				] as any[]);

				const result = await service.analyzeImpact('workflow', '1');

				expect(result.totalImpactedCount).toBe(1);
				expect(result.impactedWorkflows[0]).toMatchObject({
					id: '2',
					name: 'Calling Workflow',
					impactType: 'direct',
				});
			});

			it('should use BFS to find transitive dependents', async () => {
				workflowRepository.findOne.mockResolvedValue({
					id: '1',
					name: 'Base Workflow',
				} as any);

				// First call: workflows calling '1' (direct)
				workflowDependencyRepository.find.mockResolvedValueOnce([
					{ workflowId: '2', dependencyType: 'workflowCall', dependencyKey: '1' },
				] as any[]);

				// Second call: workflows calling '2' (indirect)
				workflowDependencyRepository.find.mockResolvedValueOnce([
					{ workflowId: '3', dependencyType: 'workflowCall', dependencyKey: '2' },
				] as any[]);

				// Third call: workflows calling '3' (second level indirect)
				workflowDependencyRepository.find.mockResolvedValueOnce([
					{ workflowId: '4', dependencyType: 'workflowCall', dependencyKey: '3' },
				] as any[]);

				// Fourth call: no more dependents
				workflowDependencyRepository.find.mockResolvedValue([]);

				workflowRepository.find.mockResolvedValue([
					{ id: '2', name: 'Level 1', active: true },
					{ id: '3', name: 'Level 2', active: false },
					{ id: '4', name: 'Level 3', active: true },
				] as any[]);

				const result = await service.analyzeImpact('workflow', '1');

				expect(result.totalImpactedCount).toBe(3);
				expect(result.activeImpactedCount).toBe(2);

				const directWorkflow = result.impactedWorkflows.find((w) => w.id === '2');
				const indirectWorkflow1 = result.impactedWorkflows.find((w) => w.id === '3');
				const indirectWorkflow2 = result.impactedWorkflows.find((w) => w.id === '4');

				expect(directWorkflow?.impactType).toBe('direct');
				expect(indirectWorkflow1?.impactType).toBe('indirect');
				expect(indirectWorkflow2?.impactType).toBe('indirect');
			});

			it('should handle circular dependencies without infinite loop', async () => {
				workflowRepository.findOne.mockResolvedValue({
					id: '1',
					name: 'Workflow A',
				} as any);

				// Setup circular dependency: 1 -> 2 -> 3 -> 1
				workflowDependencyRepository.find
					.mockResolvedValueOnce([
						{ workflowId: '2', dependencyType: 'workflowCall', dependencyKey: '1' },
					] as any[])
					.mockResolvedValueOnce([
						{ workflowId: '3', dependencyType: 'workflowCall', dependencyKey: '2' },
					] as any[])
					.mockResolvedValueOnce([
						{ workflowId: '1', dependencyType: 'workflowCall', dependencyKey: '3' },
					] as any[])
					.mockResolvedValue([]);

				workflowRepository.find.mockResolvedValue([
					{ id: '2', name: 'Workflow B', active: true },
					{ id: '3', name: 'Workflow C', active: true },
				] as any[]);

				const result = await service.analyzeImpact('workflow', '1');

				// Should not include workflow 1 itself and should not loop infinitely
				expect(result.impactedWorkflows.find((w) => w.id === '1')).toBeUndefined();
				expect(result.totalImpactedCount).toBe(2);
			});
		});
	});
});
