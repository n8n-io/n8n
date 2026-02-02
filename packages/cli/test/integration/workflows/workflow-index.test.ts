import { Logger } from '@n8n/backend-common';
import {
	testDb,
	createWorkflow,
	createWorkflowHistory,
	setActiveVersion,
} from '@n8n/backend-test-utils';
import type { IWorkflowDb } from '@n8n/db';
import { WorkflowDependencyRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { retryUntil } from '@test-integration/retry-until';
import { ErrorReporter } from 'n8n-core';
import { v4 as uuid } from 'uuid';

import { createOwner } from '../shared/db/users';

import { EventService } from '@/events/event.service';
import { WorkflowIndexService } from '@/modules/workflow-index/workflow-index.service';

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
					indexVersionId: 1,
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

	describe('workflow-deleted event', () => {
		it('should remove both draft and published index entries', async () => {
			const owner = await createOwner();
			const { workflow } = await createAndIndexDraftAndPublishedWorkflow(owner);

			// Delete the workflow
			eventService.emit('workflow-deleted', {
				user: createUserPayload(owner),
				workflowId: workflow.id,
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
