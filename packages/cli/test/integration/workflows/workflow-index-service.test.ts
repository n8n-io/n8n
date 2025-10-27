import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { WorkflowDependencyRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { WorkflowIndexService } from '@/modules/workflow-index/workflow-index.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from '../shared/db/users';

/**
 * Retry an assertion until it passes or times out
 */
async function retryUntil<T>(
	fn: () => Promise<T>,
	options: { timeout?: number; interval?: number } = {},
): Promise<T> {
	const timeout = options.timeout ?? 3000;
	const interval = options.interval ?? 50;
	const startTime = Date.now();

	while (true) {
		try {
			return await fn();
		} catch (error) {
			if (Date.now() - startTime > timeout) {
				throw error;
			}
			await new Promise((resolve) => setTimeout(resolve, interval));
		}
	}
}

describe('Workflow Index Service Integration', () => {
	let workflowIndexService: WorkflowIndexService;
	let workflowService: WorkflowService;
	let workflowDependencyRepository: WorkflowDependencyRepository;
	let workflowRepository: WorkflowRepository;

	beforeAll(async () => {
		await testDb.init();

		workflowIndexService = Container.get(WorkflowIndexService);
		workflowService = Container.get(WorkflowService);
		workflowDependencyRepository = Container.get(WorkflowDependencyRepository);
		workflowRepository = Container.get(WorkflowRepository);

		// Initialize the index service to listen to events
		workflowIndexService.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowDependency', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('automatic indexing via workflow service', () => {
		it('should automatically index workflow when updated via workflow service', async () => {
			//
			// ARRANGE
			//
			const owner = await createOwner();

			// Create a simple workflow with one node
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

			const workflow = await createWorkflow({ nodes: initialNodes }, owner);

			// Update the workflow to add a new node with dependencies
			const updatedNodes: INode[] = [
				...initialNodes,
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
			];

			workflow.nodes = updatedNodes;

			//
			// ACT
			//
			// Update workflow via the workflow service, which should trigger indexing via events
			await workflowService.update(owner, workflow, workflow.id);

			//
			// ASSERT
			//
			// Verify that the workflow index was automatically updated
			// Use retryUntil since event handlers are async
			await retryUntil(async () => {
				const dependencies = await workflowDependencyRepository.find({
					where: { workflowId: workflow.id },
				});

				// Should have 5 dependencies total:
				// - 3 nodeType dependencies (one for each node)
				// - 1 credentialId dependency (from HTTP Request node)
				// - 1 webhookPath dependency (from Webhook node)
				expect(dependencies).toHaveLength(5);

				// Verify nodeType dependencies
				const nodeTypeDeps = dependencies.filter((d) => d.dependencyType === 'nodeType');
				expect(nodeTypeDeps).toHaveLength(3);
				expect(nodeTypeDeps.map((d) => d.dependencyKey)).toEqual(
					expect.arrayContaining([
						'n8n-nodes-base.manualTrigger',
						'n8n-nodes-base.httpRequest',
						'n8n-nodes-base.webhook',
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

				// Verify version tracking
				const updatedWorkflow = await workflowRepository.findOneBy({ id: workflow.id });
				expect(updatedWorkflow).toBeDefined();
				expect(
					dependencies.every((d) => d.workflowVersionId === updatedWorkflow!.versionCounter),
				).toBe(true);
				expect(dependencies.every((d) => d.indexVersionId === 1)).toBe(true);
			});
		});
	});
});
