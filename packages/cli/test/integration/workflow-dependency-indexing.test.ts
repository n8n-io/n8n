import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { WorkflowDependencyRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { WorkflowIndexService } from '@/modules/workflow-index/workflow-index.service';

describe('Workflow Dependency Indexing', () => {
	let workflowIndexService: WorkflowIndexService;
	let workflowDependencyRepository: WorkflowDependencyRepository;
	let workflowRepository: WorkflowRepository;

	beforeAll(async () => {
		await testDb.init();

		workflowIndexService = Container.get(WorkflowIndexService);
		workflowDependencyRepository = Container.get(WorkflowDependencyRepository);
		workflowRepository = Container.get(WorkflowRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowDependency', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('updateIndexFor', () => {
		it('should index workflow with various node types and dependencies', async () => {
			//
			// ARRANGE
			//
			// Create nodes with different dependency types
			const nodes: INode[] = [
				{
					id: 'node1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'node2',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [100, 0],
					parameters: {},
					credentials: {
						httpBasicAuth: {
							id: 'test-credential-id',
							name: 'Test Credential',
						},
					},
				},
				{
					id: 'node3',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [200, 0],
					parameters: {
						path: 'test-webhook-path',
					},
				},
				{
					id: 'node4',
					name: 'Execute Workflow',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1,
					position: [300, 0],
					parameters: {
						source: 'database',
						workflowId: 'test-workflow-id',
					},
				},
			];

			const workflow = await createWorkflow({ nodes });

			//
			// ACT
			//
			await workflowIndexService.updateIndexFor(workflow);

			//
			// ASSERT
			//
			const dependencies = await workflowDependencyRepository.find({
				where: { workflowId: workflow.id },
			});

			// Should have 7 dependencies total:
			// - 4 nodeType dependencies (one for each node)
			// - 1 credentialId dependency (from HTTP Request node)
			// - 1 webhookPath dependency (from Webhook node)
			// - 1 workflowCall dependency (from Execute Workflow node)
			expect(dependencies).toHaveLength(7);

			// Verify nodeType dependencies
			const nodeTypeDeps = dependencies.filter((d) => d.dependencyType === 'nodeType');
			expect(nodeTypeDeps).toHaveLength(4);
			expect(nodeTypeDeps.map((d) => d.dependencyKey)).toEqual(
				expect.arrayContaining([
					'n8n-nodes-base.manualTrigger',
					'n8n-nodes-base.httpRequest',
					'n8n-nodes-base.webhook',
					'n8n-nodes-base.executeWorkflow',
				]),
			);

			// Verify credentialId dependency
			const credentialDeps = dependencies.filter((d) => d.dependencyType === 'credentialId');
			expect(credentialDeps).toHaveLength(1);
			expect(credentialDeps[0].dependencyKey).toBe('test-credential-id');
			expect(credentialDeps[0].dependencyInfo).toBe('node2');

			// Verify webhookPath dependency
			const webhookDeps = dependencies.filter((d) => d.dependencyType === 'webhookPath');
			expect(webhookDeps).toHaveLength(1);
			expect(webhookDeps[0].dependencyKey).toBe('test-webhook-path');
			expect(webhookDeps[0].dependencyInfo).toBe('node3');

			// Verify workflowCall dependency
			const workflowCallDeps = dependencies.filter((d) => d.dependencyType === 'workflowCall');
			expect(workflowCallDeps).toHaveLength(1);
			expect(workflowCallDeps[0].dependencyKey).toBe('test-workflow-id');
			expect(workflowCallDeps[0].dependencyInfo).toBe('node4');

			// Verify version tracking
			expect(dependencies.every((d) => d.workflowVersionId === workflow.versionCounter)).toBe(true);
			expect(dependencies.every((d) => d.indexVersionId === 1)).toBe(true);
		});

		it('should index workflow with no dependencies', async () => {
			//
			// ARRANGE
			//
			const workflow = await createWorkflow({ nodes: [] });

			//
			// ACT
			//
			await workflowIndexService.updateIndexFor(workflow);

			//
			// ASSERT
			//
			const dependencies = await workflowDependencyRepository.find({
				where: { workflowId: workflow.id },
			});

			expect(dependencies).toHaveLength(0);
		});

		it('should update dependencies when workflow is updated', async () => {
			//
			// ARRANGE
			//
			const initialNodes: INode[] = [
				{
					id: 'node1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			];

			const workflow = await createWorkflow({ nodes: initialNodes });
			await workflowIndexService.updateIndexFor(workflow);

			// Verify initial state
			let dependencies = await workflowDependencyRepository.find({
				where: { workflowId: workflow.id },
			});
			expect(dependencies).toHaveLength(1);

			// Update workflow with a new node
			const updatedNodes: INode[] = [
				...initialNodes,
				{
					id: 'node2',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [100, 0],
					parameters: {},
				},
			];

			workflow.nodes = updatedNodes;
			workflow.versionCounter++;
			await workflowRepository.save(workflow);

			//
			// ACT
			//
			await workflowIndexService.updateIndexFor(workflow);

			//
			// ASSERT
			//
			dependencies = await workflowDependencyRepository.find({
				where: { workflowId: workflow.id },
			});

			// Should now have 2 nodeType dependencies
			expect(dependencies).toHaveLength(2);
			expect(dependencies.every((d) => d.workflowVersionId === workflow.versionCounter)).toBe(true);
		});
	});
});
