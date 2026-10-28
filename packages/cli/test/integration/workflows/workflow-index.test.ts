import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import {
	testDb,
	createWorkflow,
	createWorkflowHistory,
	setActiveVersion,
} from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import type { IWorkflowDb } from '@n8n/db';
import { WorkflowDependencyRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { ErrorReporter, Tracing } from 'n8n-core';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowIndexService } from '@/modules/workflow-index/workflow-index.service';
import { retryUntil } from '@test-integration/retry-until';

import { createOwner } from '../shared/db/users';

let workflowIndexService: WorkflowIndexService;
let eventService: EventService;
let workflowRepository: WorkflowRepository;
let workflowDependencyRepository: WorkflowDependencyRepository;

beforeAll(async () => {
	await testDb.init();

	// Get real instances from the container
	workflowRepository = Container.get(WorkflowRepository);
	workflowDependencyRepository = Container.get(WorkflowDependencyRepository);
	eventService = Container.get(EventService);

	// Create the WorkflowIndexService with real dependencies
	workflowIndexService = new WorkflowIndexService(
		workflowDependencyRepository,
		workflowRepository,
		eventService,
		Container.get(Logger),
		Container.get(ErrorReporter),
		Container.get(Tracing),
		Container.get(WorkflowsConfig),
	);

	// Initialize the service to register event listeners
	workflowIndexService.init();
});

afterEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'WorkflowDependency', 'WorkflowHistory']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('WorkflowIndexService Integration', () => {
	const createUserPayload = (owner: Awaited<ReturnType<typeof createOwner>>) => ({
		id: owner.id,
		email: owner.email,
		firstName: owner.firstName,
		lastName: owner.lastName,
		role: { slug: owner.role.slug },
	});

	/**
	 * Creates a workflow with draft content, indexes it, then creates and indexes
	 * a published version with different content.
	 * Returns the workflow (with published nodes) and the published version ID.
	 */
	async function createAndIndexDraftAndPublishedWorkflow(
		owner: Awaited<ReturnType<typeof createOwner>>,
	) {
		const draftWorkflow = await createWorkflow({
			name: 'Workflow with Draft and Published',
			nodes: [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [250, 300] as [number, number],
					parameters: {},
				},
			],
		});

		// Index the draft version
		eventService.emit('workflow-created', {
			user: createUserPayload(owner),
			workflow: draftWorkflow,
			publicApi: false,
			projectId: uuid(),
			projectType: 'personal',
		});

		await retryUntil(async () => {
			const deps = await workflowDependencyRepository.find({
				where: { workflowId: draftWorkflow.id },
			});
			expect(deps).toHaveLength(1);
		});

		// Create and activate a published version with different content
		const publishedVersionId = uuid();
		const publishedNodes = [
			{
				id: 'node-2',
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2,
				position: [250, 300] as [number, number],
				parameters: {},
			},
		];

		draftWorkflow.active = true;
		draftWorkflow.versionCounter = 2;
		draftWorkflow.nodes = publishedNodes;
		const savedWorkflow = await workflowRepository.save(draftWorkflow);

		await createWorkflowHistory({
			...savedWorkflow,
			versionId: publishedVersionId,
			nodes: publishedNodes,
		});
		await setActiveVersion(savedWorkflow.id, publishedVersionId);
		savedWorkflow.activeVersionId = publishedVersionId;

		// Index the published version
		eventService.emit('workflow-activated', {
			user: createUserPayload(owner),
			workflow: savedWorkflow,
			workflowId: savedWorkflow.id,
			publicApi: false,
		});

		// Wait for both draft and published entries to be indexed with their expected content
		await retryUntil(async () => {
			const deps = await workflowDependencyRepository.find({
				where: { workflowId: savedWorkflow.id },
			});
			expect(deps).toHaveLength(2);

			const draftDep = deps.find((d) => d.publishedVersionId === null);
			const publishedDep = deps.find((d) => d.publishedVersionId === publishedVersionId);
			expect(draftDep).toBeDefined();
			expect(publishedDep).toBeDefined();
		});

		return { workflow: savedWorkflow, publishedVersionId };
	}

	describe('workflow-created event', () => {
		it('should index a new workflow with a single node', async () => {
			const owner = await createOwner();
			const workflowId = uuid();
			const versionId = uuid();

			const workflow = {
				id: workflowId,
				name: 'Test Workflow',
				active: false,
				activeVersionId: null,
				versionCounter: 1,
				versionId,
				nodes: [
					{
						id: 'node-1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [250, 300] as [number, number],
						parameters: {},
					},
				],
				connections: {},
				settings: {},
				triggerCount: 0,
				isArchived: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			} satisfies IWorkflowDb;

			const savedWorkflow = await workflowRepository.save(workflow);

			eventService.emit('workflow-created', {
				user: createUserPayload(owner),
				workflow: savedWorkflow,
				publicApi: false,
				projectId: uuid(),
				projectType: 'personal',
			});

			await retryUntil(async () => {
				const dependencies = await workflowDependencyRepository.find({
					where: { workflowId },
				});

				expect(dependencies).toHaveLength(1);
				expect(dependencies[0]).toMatchObject({
					workflowId,
					workflowVersionId: 1,
					dependencyType: 'nodeType',
					dependencyKey: 'n8n-nodes-base.httpRequest',
					dependencyInfo: {
						nodeId: 'node-1',
						nodeVersion: 1,
					},
					indexVersionId: 2,
				});
			});
		});
	});

	describe('workflow-activated event (published version indexing)', () => {
		it('should keep draft and published dependencies separate', async () => {
			const owner = await createOwner();
			const { workflow, publishedVersionId } = await createAndIndexDraftAndPublishedWorkflow(owner);

			await retryUntil(async () => {
				const allDependencies = await workflowDependencyRepository.find({
					where: { workflowId: workflow.id },
					order: { publishedVersionId: 'ASC' },
				});

				expect(allDependencies).toHaveLength(2);

				const draftDep = allDependencies.find((d) => d.publishedVersionId === null);
				expect(draftDep).toMatchObject({
					workflowId: workflow.id,
					publishedVersionId: null,
					dependencyType: 'nodeType',
					dependencyKey: 'n8n-nodes-base.httpRequest',
					dependencyInfo: {
						nodeId: 'node-1',
						nodeVersion: 1,
					},
				});

				const publishedDep = allDependencies.find((d) => d.publishedVersionId !== null);
				expect(publishedDep).toMatchObject({
					workflowId: workflow.id,
					publishedVersionId,
					dependencyType: 'nodeType',
					dependencyKey: 'n8n-nodes-base.slack',
					dependencyInfo: {
						nodeId: 'node-2',
						nodeVersion: 2,
					},
				});
			});
		});
	});

	describe('buildIndex (server startup re-indexing)', () => {
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
			await workflowIndexService.buildIndex();

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

	describe('workflow-deactivated event (unpublish)', () => {
		const nodeWithCredential = (credentialId: string): INode => ({
			id: 'bq-node',
			name: 'Google BigQuery',
			type: 'n8n-nodes-base.googleBigQuery',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
			credentials: { googleApi: { id: credentialId, name: `Credential ${credentialId}` } },
		});

		const credentialKeys = async (workflowId: string) => {
			const deps = await workflowDependencyRepository.find({ where: { workflowId } });
			return deps
				.filter((d) => d.dependencyType === 'credentialId')
				.map((d) => d.dependencyKey)
				.sort();
		};

		// CONTEXT-399: unpublish leaves the published-lane rows behind, and a later draft
		// save only prunes draft-lane rows, so the old credential keeps listing the workflow.
		it('should stop listing the old credential after unpublish and a draft save with a new credential', async () => {
			const owner = await createOwner();
			const oldCredentialId = 'old-credential-x';
			const newCredentialId = 'new-credential-y';

			// 1. Create and index a workflow that uses credential X.
			const workflow = await createWorkflow({ nodes: [nodeWithCredential(oldCredentialId)] });
			// `createWorkflow` pre-seeds nodeType-only rows; drop them so the indexer writes real ones.
			await workflowDependencyRepository.removeDependenciesForWorkflow(workflow.id);
			eventService.emit('workflow-created', {
				user: createUserPayload(owner),
				workflow,
				publicApi: false,
				projectId: uuid(),
				projectType: 'personal',
			});
			await retryUntil(async () => {
				expect(await credentialKeys(workflow.id)).toEqual([oldCredentialId]);
			});

			// 2. Publish it. Published-lane rows for X are written.
			const publishedVersionId = uuid();
			await createWorkflowHistory({ ...workflow, versionId: publishedVersionId });
			await setActiveVersion(workflow.id, publishedVersionId);
			workflow.activeVersionId = publishedVersionId;
			eventService.emit('workflow-activated', {
				user: createUserPayload(owner),
				workflow,
				workflowId: workflow.id,
				publicApi: false,
			});
			await retryUntil(async () => {
				const deps = await workflowDependencyRepository.find({
					where: { workflowId: workflow.id, publishedVersionId },
				});
				expect(deps.some((d) => d.dependencyKey === oldCredentialId)).toBe(true);
			});

			// 3. Unpublish it.
			await workflowRepository.update(workflow.id, { active: false, activeVersionId: null });
			workflow.active = false;
			workflow.activeVersionId = null;
			eventService.emit('workflow-deactivated', {
				user: createUserPayload(owner),
				workflowId: workflow.id,
				workflow,
				publicApi: false,
				deactivatedVersionId: publishedVersionId,
			});

			// 4. Switch the node to credential Y and save as a draft.
			workflow.nodes = [nodeWithCredential(newCredentialId)];
			workflow.versionCounter = workflow.versionCounter + 1;
			const savedWorkflow = await workflowRepository.save(workflow);
			eventService.emit('workflow-saved', {
				user: createUserPayload(owner),
				workflow: savedWorkflow,
				publicApi: false,
			});

			// 5. Only credential Y should list the workflow. No version uses X any more.
			await retryUntil(async () => {
				expect(await credentialKeys(workflow.id)).toEqual([newCredentialId]);
			});
		});
	});

	describe('workflow-deleted event', () => {
		it('should remove both draft and published index entries', async () => {
			const owner = await createOwner();
			const { workflow } = await createAndIndexDraftAndPublishedWorkflow(owner);

			// Delete the workflow
			eventService.emit('workflow-deleted', {
				user: createUserPayload(owner),
				workflowId: workflow.id,
				workflowName: workflow.name,
				projectId: undefined,
				publicApi: false,
			});

			// Verify all entries are removed
			await retryUntil(async () => {
				const remainingDeps = await workflowDependencyRepository.find({
					where: { workflowId: workflow.id },
				});
				expect(remainingDeps).toHaveLength(0);
			});
		});
	});
});
