import { testDb } from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import { WorkflowDependencyRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { v4 as uuid } from 'uuid';

import { EventService } from '@/events/event.service';
import { WorkflowIndexService } from '@/modules/workflow-index/workflow-index.service';

import { createOwner } from '../shared/db/users';
import { DatabaseConfig } from '@n8n/config';

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

if (Container.get(DatabaseConfig).isLegacySqlite) {
	describe('WorkflowIndexService Integration', () => {
		it('should not run on legacy SQLite databases', async () => {
			await expect(workflowIndexService.buildIndex()).rejects.toThrow(
				'Workflow dependency indexing is not supported on legacy SQLite databases',
			);
		});
	});
} else {
	describe('WorkflowIndexService Integration', () => {
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
				};

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

				// Wait for async event handler to complete
				await new Promise((resolve) => setTimeout(resolve, 100));

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
}
