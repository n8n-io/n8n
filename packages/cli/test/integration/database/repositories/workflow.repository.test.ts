import {
	createWorkflowWithTriggerAndHistory,
	createWorkflowWithHistory,
	createActiveWorkflow,
	createManyActiveWorkflows,
	createWorkflow,
	testDb,
	getWorkflowById,
	setActiveVersion,
} from '@n8n/backend-test-utils';
import { WorkflowRepository, WorkflowDependencyRepository, WorkflowDependencies } from '@n8n/db';
import { Container } from '@n8n/di';

import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';

import { createTestRun } from '../../shared/db/evaluation';

describe('WorkflowRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate([
			'WorkflowDependency',
			'WorkflowEntity',
			'WorkflowHistory',
			'WorkflowPublishHistory',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('publishVersion', () => {
		it('should publish a specific workflow version', async () => {
			//
			// ARRANGE
			//
			const workflowRepository = Container.get(WorkflowRepository);
			const workflow = await createWorkflowWithTriggerAndHistory();
			const targetVersionId = 'custom-version-123';
			await createWorkflowHistoryItem(workflow.id, { versionId: targetVersionId });

			//
			// ACT
			//
			await workflowRepository.publishVersion(workflow.id, targetVersionId);

			//
			// ASSERT
			//
			const updatedWorkflow = await getWorkflowById(workflow.id);

			expect(updatedWorkflow?.activeVersionId).toBe(targetVersionId);
			expect(updatedWorkflow?.active).toBe(true);
		});

		it('should update activeVersionId when publishing an already published workflow', async () => {
			//
			// ARRANGE
			//
			const workflowRepository = Container.get(WorkflowRepository);
			const workflow = await createActiveWorkflow();
			const newVersionId = 'new-version-id';
			await createWorkflowHistoryItem(workflow.id, { versionId: newVersionId });

			//
			// ACT
			//
			await workflowRepository.publishVersion(workflow.id, newVersionId);

			//
			// ASSERT
			//
			const updatedWorkflow = await getWorkflowById(workflow.id);

			expect(updatedWorkflow?.activeVersionId).toBe(newVersionId);
			expect(updatedWorkflow?.active).toBe(true);
			expect(updatedWorkflow?.versionId).toBe(workflow.versionId);
		});

		it('should throw error when version does not exist for workflow', async () => {
			//
			// ARRANGE
			//
			const workflowRepository = Container.get(WorkflowRepository);
			const workflow = await createWorkflowWithTriggerAndHistory();
			const nonExistentVersionId = 'non-existent-version';

			//
			// ACT & ASSERT
			//
			await expect(
				workflowRepository.publishVersion(workflow.id, nonExistentVersionId),
			).rejects.toThrow(
				`Version "${nonExistentVersionId}" not found for workflow "${workflow.id}".`,
			);
		});

		it('should publish current version when versionId is not provided', async () => {
			//
			// ARRANGE
			//
			const workflowRepository = Container.get(WorkflowRepository);
			const workflow = await createWorkflowWithTriggerAndHistory();

			//
			// ACT
			//
			await workflowRepository.publishVersion(workflow.id);

			//
			// ASSERT
			//
			const updatedWorkflow = await getWorkflowById(workflow.id);

			expect(updatedWorkflow?.activeVersionId).toBe(workflow.versionId);
			expect(updatedWorkflow?.active).toBe(true);
		});
	});

	describe('unpublishAll', () => {
		it('should unpublish all workflows and clear activeVersionId', async () => {
			//
			// ARRANGE
			//
			const workflowRepository = Container.get(WorkflowRepository);
			const workflows = await createManyActiveWorkflows(2);

			// Verify activeVersionId is initially set
			expect(workflows[0].activeVersionId).not.toBeNull();
			expect(workflows[1].activeVersionId).not.toBeNull();

			//
			// ACT
			//
			await workflowRepository.unpublishAll();
			//
			// ASSERT
			//
			// Verify activeVersionId is cleared
			const workflow1 = await workflowRepository.findOne({
				where: { id: workflows[0].id },
			});
			const workflow2 = await workflowRepository.findOne({
				where: { id: workflows[1].id },
			});

			expect(workflow1?.activeVersionId).toBeNull();
			expect(workflow2?.activeVersionId).toBeNull();
		});
	});

	describe('getActiveIds', () => {
		it('should return all active workflow IDs when invoked without maxResults', async () => {
			//
			// ARRANGE
			//
			const workflows = await Promise.all([
				createActiveWorkflow(),
				createWorkflowWithHistory(),
				createWorkflowWithHistory(),
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
				createActiveWorkflow(),
				createWorkflowWithHistory(),
				createActiveWorkflow(),
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

	describe('isActive()', () => {
		it('should return `true` for active workflow in storage', async () => {
			const workflowRepository = Container.get(WorkflowRepository);

			const workflow = await createWorkflowWithHistory();
			await setActiveVersion(workflow.id, workflow.versionId);

			await expect(workflowRepository.isActive(workflow.id)).resolves.toBe(true);
		});

		it('should return `false` for inactive workflow in storage', async () => {
			const workflowRepository = Container.get(WorkflowRepository);

			const workflow = await createWorkflowWithHistory();

			await expect(workflowRepository.isActive(workflow.id)).resolves.toBe(false);
		});
	});

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
			await workflowDependencyRepository.updateDependenciesForWorkflow(workflow2.id, dependencies2);

			// Workflow 3: Has up-to-date dependencies
			const workflow3 = await createWorkflow({ versionCounter: 15 });
			const dependencies3 = new WorkflowDependencies(workflow3.id, 15);
			dependencies3.add({
				dependencyType: 'nodeType',
				dependencyKey: 'n8n-nodes-base.httpRequest',
				dependencyInfo: null,
			});
			await workflowDependencyRepository.updateDependenciesForWorkflow(workflow3.id, dependencies3);

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

	describe('hasAnyWorkflowsWithErrorWorkflow', () => {
		it('should return false when no workflows have error workflow configured', async () => {
			const workflowRepository = Container.get(WorkflowRepository);
			await createWorkflow({ settings: {} });
			await createWorkflow({ settings: { executionOrder: 'v1' } });

			const result = await workflowRepository.hasAnyWorkflowsWithErrorWorkflow();

			expect(result).toBe(false);
		});

		it('should return true when at least one workflow has error workflow configured', async () => {
			const workflowRepository = Container.get(WorkflowRepository);
			await createWorkflow({ settings: {} });
			await createWorkflow({ settings: { errorWorkflow: 'error-workflow-id-123' } });

			const result = await workflowRepository.hasAnyWorkflowsWithErrorWorkflow();

			expect(result).toBe(true);
		});

		it('should return true when multiple workflows have error workflow configured', async () => {
			const workflowRepository = Container.get(WorkflowRepository);
			await createWorkflow({ settings: { errorWorkflow: 'error-workflow-1' } });
			await createWorkflow({ settings: { errorWorkflow: 'error-workflow-2' } });
			await createWorkflow({ settings: {} });

			const result = await workflowRepository.hasAnyWorkflowsWithErrorWorkflow();

			expect(result).toBe(true);
		});

		it('should return false when workflows have null settings', async () => {
			const workflowRepository = Container.get(WorkflowRepository);
			await createWorkflow({ settings: null as any });

			const result = await workflowRepository.hasAnyWorkflowsWithErrorWorkflow();

			expect(result).toBe(false);
		});
	});
});
