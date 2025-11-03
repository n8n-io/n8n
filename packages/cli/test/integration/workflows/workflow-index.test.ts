import { Logger } from '@n8n/backend-common';
import { testDb } from '@n8n/backend-test-utils';
import { DatabaseConfig } from '@n8n/config';
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
	await testDb.truncate(['WorkflowEntity', 'WorkflowDependency']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('WorkflowIndexService Integration', () => {
	if (Container.get(DatabaseConfig).isLegacySqlite) {
		// NOTE: this feature isn't supported on legacy SQLite databases, so we skip the tests.
		it('is not supported on legacy SQLite databases', async () => {});
		return;
	}

	describe('workflow-created event', () => {
		it('should index a new workflow with a single node', async () => {
			// Arrange
			const owner = await createOwner();
			const workflowId = uuid();
			const versionId = uuid();

			const workflow = {
				id: workflowId,
				name: 'Test Workflow',
				active: false,
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

			// Save the workflow to the database
			const savedWorkflow = await workflowRepository.save(workflow);

			// Act - emit the workflow-created event
			eventService.emit('workflow-created', {
				user: {
					id: owner.id,
					email: owner.email,
					firstName: owner.firstName,
					lastName: owner.lastName,
					role: { slug: owner.role.slug },
				},
				workflow: savedWorkflow,
				publicApi: false,
				projectId: uuid(),
				projectType: 'personal',
			});

			await retryUntil(async () => {
				// Assert - check that dependencies were indexed in the database
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
});
