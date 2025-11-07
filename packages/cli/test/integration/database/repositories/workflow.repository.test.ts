import {
	createWorkflowWithTrigger,
	createWorkflow,
	getAllWorkflows,
	testDb,
} from '@n8n/backend-test-utils';
import { WorkflowRepository, WorkflowDependencyRepository, WorkflowDependencies } from '@n8n/db';
import { Container } from '@n8n/di';

import { createTestRun } from '../../shared/db/evaluation';
import { GlobalConfig } from '@n8n/config';

describe('WorkflowRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowDependency', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('activateAll', () => {
		it('should activate all workflows', async () => {
			//
			// ARRANGE
			//
			const workflowRepository = Container.get(WorkflowRepository);
			const workflows = await Promise.all([
				createWorkflowWithTrigger(),
				createWorkflowWithTrigger(),
			]);
			expect(workflows).toMatchObject([{ active: false }, { active: false }]);

			//
			// ACT
			//
			await workflowRepository.activateAll();

			//
			// ASSERT
			//
			const after = await getAllWorkflows();
			expect(after).toMatchObject([{ active: true }, { active: true }]);
		});
	});

	describe('deactivateAll', () => {
		it('should deactivate all workflows', async () => {
			//
			// ARRANGE
			//
			const workflowRepository = Container.get(WorkflowRepository);
			const workflows = await Promise.all([
				createWorkflowWithTrigger({ active: true }),
				createWorkflowWithTrigger({ active: true }),
			]);
			expect(workflows).toMatchObject([{ active: true }, { active: true }]);

			//
			// ACT
			//
			await workflowRepository.deactivateAll();

			//
			// ASSERT
			//
			const after = await getAllWorkflows();
			expect(after).toMatchObject([{ active: false }, { active: false }]);
		});
	});

	describe('getActiveIds', () => {
		it('should return all active workflow IDs when invoked without maxResults', async () => {
			//
			// ARRANGE
			//
			const workflows = await Promise.all([
				createWorkflow({ active: true }),
				createWorkflow({ active: false }),
				createWorkflow({ active: false }),
			]);

			//
			// ACT
			//
			const activeIds = await Container.get(WorkflowRepository).getActiveIds();

			//
			// ASSERT
			//
			expect(activeIds).toEqual([workflows[0].id]);
			expect(activeIds).toHaveLength(1);
		});

		it('should return a capped number of active workflow IDs when invoked with maxResults', async () => {
			//
			// ARRANGE
			//
			await Promise.all([
				createWorkflow({ active: true }),
				createWorkflow({ active: false }),
				createWorkflow({ active: true }),
			]);

			//
			// ACT
			//
			const activeIds = await Container.get(WorkflowRepository).getActiveIds({ maxResults: 1 });

			//
			// ASSERT
			//
			expect(activeIds).toHaveLength(1);
		});
	});

	describe('getWorkflowsWithEvaluationCount', () => {
		it('should return 0 when no workflows have test runs', async () => {
			//
			// ARRANGE
			//
			const workflowRepository = Container.get(WorkflowRepository);
			await createWorkflow();
			await createWorkflow();

			//
			// ACT
			//
			const count = await workflowRepository.getWorkflowsWithEvaluationCount();

			//
			// ASSERT
			//
			expect(count).toBe(0);
		});

		it('should return correct count when some workflows have test runs', async () => {
			//
			// ARRANGE
			//
			const workflowRepository = Container.get(WorkflowRepository);
			const workflow1 = await createWorkflow();
			await createWorkflow();
			const workflow3 = await createWorkflow();

			await createTestRun(workflow1.id);
			await createTestRun(workflow3.id);

			//
			// ACT
			//
			const count = await workflowRepository.getWorkflowsWithEvaluationCount();

			//
			// ASSERT
			//
			expect(count).toBe(2);
		});

		it('should count each workflow only once even with multiple test runs', async () => {
			//
			// ARRANGE
			//
			const workflowRepository = Container.get(WorkflowRepository);
			const workflow1 = await createWorkflow();
			const workflow2 = await createWorkflow();

			await createTestRun(workflow1.id);
			await createTestRun(workflow1.id);
			await createTestRun(workflow1.id);
			await createTestRun(workflow2.id);
			await createTestRun(workflow2.id);

			//
			// ACT
			//
			const count = await workflowRepository.getWorkflowsWithEvaluationCount();

			//
			// ASSERT
			//
			expect(count).toBe(2);
		});
	});

	// NOTE: these tests use the workflow dependency repository, which is not enabled
	// on legacy Sqlite.
	const globalConfig = Container.get(GlobalConfig);
	if (!globalConfig.database.isLegacySqlite) {
		describe('findWorkflowsNeedingIndexing', () => {
			it('should return workflows with no dependencies or outdated dependencies', async () => {
				//
				// ARRANGE
				//
				const workflowRepository = Container.get(WorkflowRepository);
				const workflowDependencyRepository = Container.get(WorkflowDependencyRepository);

				// Workflow 1: No dependencies
				const workflow1 = await createWorkflow({ versionCounter: 5 });

				// Workflow 2: Has dependencies but with outdated version
				const workflow2 = await createWorkflow({ versionCounter: 10 });
				const dependencies2 = new WorkflowDependencies(workflow2.id, 7);
				dependencies2.add({
					dependencyType: 'credentialId',
					dependencyKey: 'cred-123',
					dependencyInfo: null,
				});
				await workflowDependencyRepository.updateDependenciesForWorkflow(
					workflow2.id,
					dependencies2,
				);

				// Workflow 3: Has up-to-date dependencies
				const workflow3 = await createWorkflow({ versionCounter: 15 });
				const dependencies3 = new WorkflowDependencies(workflow3.id, 15);
				dependencies3.add({
					dependencyType: 'nodeType',
					dependencyKey: 'n8n-nodes-base.httpRequest',
					dependencyInfo: null,
				});
				await workflowDependencyRepository.updateDependenciesForWorkflow(
					workflow3.id,
					dependencies3,
				);

				//
				// ACT
				//
				const workflowsNeedingIndexing = await workflowRepository.findWorkflowsNeedingIndexing();

				//
				// ASSERT
				//
				expect(workflowsNeedingIndexing).toHaveLength(2);
				const workflowIds = workflowsNeedingIndexing.map((w) => w.id);
				expect(workflowIds).toContain(workflow1.id);
				expect(workflowIds).toContain(workflow2.id);
				expect(workflowIds).not.toContain(workflow3.id);
			});

			it('should respect the batch size limit', async () => {
				//
				// ARRANGE
				//
				const workflowRepository = Container.get(WorkflowRepository);

				// Create 5 workflows with no dependencies
				for (let i = 0; i < 5; i++) {
					await createWorkflow({ versionCounter: 1 });
				}

				//
				// ACT
				//
				const batchSize = 3;
				const workflowsNeedingIndexing =
					await workflowRepository.findWorkflowsNeedingIndexing(batchSize);

				//
				// ASSERT
				//
				expect(workflowsNeedingIndexing).toHaveLength(batchSize);
			});
		});
	}
});
