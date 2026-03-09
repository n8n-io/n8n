import {
	testDb,
	createWorkflow,
	createWorkflowHistory,
	setActiveVersion,
} from '@n8n/backend-test-utils';
import { WorkflowDependencyRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { WorkflowIndexService } from '../workflow-index.service';

describe('WorkflowIndexService (Integration)', () => {
	let service: WorkflowIndexService;
	let workflowDependencyRepository: WorkflowDependencyRepository;
	let workflowRepository: WorkflowRepository;

	beforeAll(async () => {
		await testDb.init();
		service = Container.get(WorkflowIndexService);
		workflowDependencyRepository = Container.get(WorkflowDependencyRepository);
		workflowRepository = Container.get(WorkflowRepository);
	});

	beforeEach(async () => {
		// WorkflowEntity has a FK to WorkflowHistory (activeVersionId), so we must
		// clear activeVersionId before truncating WorkflowHistory.
		await workflowRepository.createQueryBuilder().update().set({ activeVersionId: null }).execute();
		await testDb.truncate([
			'WorkflowDependency',
			'WorkflowPublishHistory',
			'WorkflowHistory',
			'SharedWorkflow',
			'WorkflowEntity',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const httpRequestNode: INode = {
		id: 'node-1',
		name: 'HTTP Request',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	const webhookNode: INode = {
		id: 'node-2',
		name: 'Webhook',
		type: 'n8n-nodes-base.webhook',
		typeVersion: 1,
		position: [200, 0],
		parameters: { path: 'my-webhook' },
	};

	const manualTriggerNode: INode = {
		id: 'node-3',
		name: 'Manual Trigger',
		type: 'n8n-nodes-base.manualTrigger',
		typeVersion: 1,
		position: [400, 0],
		parameters: {},
	};

	function getDependencyKeys(
		deps: Array<{ dependencyType: string; dependencyKey: string }>,
		type: string,
	) {
		return deps.filter((d) => d.dependencyType === type).map((d) => d.dependencyKey);
	}

	describe('draft and published indexing use correct nodes', () => {
		it('should index draft workflow nodes', async () => {
			const workflow = await createWorkflow({ nodes: [httpRequestNode, webhookNode] });

			await service.updateIndexForDraft(workflow);

			const deps = await workflowDependencyRepository.find({
				where: { workflowId: workflow.id },
			});
			const nodeTypes = getDependencyKeys(deps, 'nodeType');
			expect(nodeTypes).toContain('n8n-nodes-base.httpRequest');
			expect(nodeTypes).toContain('n8n-nodes-base.webhook');
			expect(getDependencyKeys(deps, 'webhookPath')).toContain('my-webhook');
			// All draft deps should have null publishedVersionId
			expect(deps.every((d) => d.publishedVersionId === null)).toBe(true);
		});

		it('should index published version nodes separately from draft nodes', async () => {
			// 1. Create a workflow with initial nodes and publish it
			const initialNodes = [httpRequestNode, webhookNode];
			const workflow = await createWorkflow({ nodes: initialNodes });
			await createWorkflowHistory(workflow);
			await setActiveVersion(workflow.id, workflow.versionId);

			// Index the draft
			await service.updateIndexForDraft(workflow);

			// Index the published version (at this point draft === published)
			await service.updateIndexForPublished(workflow, workflow.versionId, initialNodes);

			const depsAfterPublish = await workflowDependencyRepository.find({
				where: { workflowId: workflow.id },
				order: { dependencyType: 'ASC', dependencyKey: 'ASC' },
			});

			const draftDeps = depsAfterPublish.filter((d) => d.publishedVersionId === null);
			const publishedDeps = depsAfterPublish.filter((d) => d.publishedVersionId !== null);

			// Both draft and published should have the same node types
			const draftNodeTypes = getDependencyKeys(draftDeps, 'nodeType').sort();
			const publishedNodeTypes = getDependencyKeys(publishedDeps, 'nodeType').sort();
			expect(draftNodeTypes).toEqual(publishedNodeTypes);

			// 2. Now modify the draft (add a new node, remove the webhook) but don't re-publish
			const modifiedNodes = [httpRequestNode, manualTriggerNode];
			await workflowRepository.update(workflow.id, {
				nodes: modifiedNodes,
				versionCounter: 2,
			});
			const updatedWorkflow = await workflowRepository.findOneByOrFail({ id: workflow.id });

			// Re-index the draft with new nodes
			await service.updateIndexForDraft(updatedWorkflow);

			// 3. Verify draft reflects the new nodes, published still has the old ones
			const allDeps = await workflowDependencyRepository.find({
				where: { workflowId: workflow.id },
				order: { dependencyType: 'ASC', dependencyKey: 'ASC' },
			});

			const updatedDraftDeps = allDeps.filter((d) => d.publishedVersionId === null);
			const unchangedPublishedDeps = allDeps.filter((d) => d.publishedVersionId !== null);

			// Draft should now have httpRequest + manualTrigger (no webhook)
			const updatedDraftNodeTypes = getDependencyKeys(updatedDraftDeps, 'nodeType').sort();
			expect(updatedDraftNodeTypes).toEqual([
				'n8n-nodes-base.httpRequest',
				'n8n-nodes-base.manualTrigger',
			]);
			expect(getDependencyKeys(updatedDraftDeps, 'webhookPath')).toHaveLength(0);

			// Published should still have httpRequest + webhook (original nodes)
			const unchangedPublishedNodeTypes = getDependencyKeys(
				unchangedPublishedDeps,
				'nodeType',
			).sort();
			expect(unchangedPublishedNodeTypes).toEqual([
				'n8n-nodes-base.httpRequest',
				'n8n-nodes-base.webhook',
			]);
			expect(getDependencyKeys(unchangedPublishedDeps, 'webhookPath')).toContain('my-webhook');
		});

		it('should use published version nodes (not draft) during batch re-indexing', async () => {
			// 1. Create a workflow, publish it, then modify the draft
			const publishedNodes = [httpRequestNode, webhookNode];
			const workflow = await createWorkflow({ nodes: publishedNodes });
			await createWorkflowHistory(workflow);
			await setActiveVersion(workflow.id, workflow.versionId);

			// 2. Modify the draft nodes (different from published)
			const draftNodes = [manualTriggerNode];
			await workflowRepository.update(workflow.id, {
				nodes: draftNodes,
				versionCounter: 2,
			});

			// 3. Run buildIndex (simulates server startup re-indexing)
			await service.buildIndex();

			// 4. Verify the published index was built from published nodes, not draft
			const allDeps = await workflowDependencyRepository.find({
				where: { workflowId: workflow.id },
				order: { dependencyType: 'ASC', dependencyKey: 'ASC' },
			});

			const draftDeps = allDeps.filter((d) => d.publishedVersionId === null);
			const publishedDeps = allDeps.filter((d) => d.publishedVersionId !== null);

			// Draft index should reflect the modified nodes
			const draftNodeTypes = getDependencyKeys(draftDeps, 'nodeType').sort();
			expect(draftNodeTypes).toEqual(['n8n-nodes-base.manualTrigger']);

			// Published index should reflect the original published nodes
			const publishedNodeTypes = getDependencyKeys(publishedDeps, 'nodeType').sort();
			expect(publishedNodeTypes).toEqual(['n8n-nodes-base.httpRequest', 'n8n-nodes-base.webhook']);
			expect(getDependencyKeys(publishedDeps, 'webhookPath')).toContain('my-webhook');
		});
	});
});
