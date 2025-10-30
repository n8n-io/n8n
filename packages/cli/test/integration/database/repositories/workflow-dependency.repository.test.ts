import { testDb, createWorkflow } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { WorkflowDependencyRepository, WorkflowDependencies } from '@n8n/db';
import { Container } from '@n8n/di';

const globalConfig = Container.get(GlobalConfig);

if (globalConfig.database.isLegacySqlite) {
	describe('WorkflowDependencyRepository', () => {
		let workflowDependencyRepository: WorkflowDependencyRepository;

		beforeAll(async () => {
			await testDb.init();
			workflowDependencyRepository = Container.get(WorkflowDependencyRepository);
		});

		afterAll(async () => {
			await testDb.terminate();
		});

		it('should not run on legacy SQLite databases', async () => {
			await expect(
				workflowDependencyRepository.updateDependenciesForWorkflow('unused', {} as any),
			).rejects.toThrow('Workflow dependency indexing is not supported on legacy SQLite databases');
			await expect(
				workflowDependencyRepository.removeDependenciesForWorkflow('unused'),
			).rejects.toThrow('Workflow dependency indexing is not supported on legacy SQLite databases');
		});
	});
} else {
	describe('WorkflowDependencyRepository', () => {
		let workflowDependencyRepository: WorkflowDependencyRepository;

		beforeAll(async () => {
			await testDb.init();
			workflowDependencyRepository = Container.get(WorkflowDependencyRepository);
		});

		beforeEach(async () => {
			// Truncate in correct order to respect foreign key constraints
			await testDb.truncate(['WorkflowDependency', 'SharedWorkflow', 'WorkflowEntity']);
		});

		afterAll(async () => {
			await testDb.terminate();
		});

		describe('updateDependenciesForWorkflow()', () => {
			it('should insert new dependencies for a workflow with no existing dependencies', async () => {
				//
				// ARRANGE
				//
				const workflow = await createWorkflow({ versionId: 'v1' });
				const dependencies = new WorkflowDependencies(workflow.id, 1);
				dependencies.add({
					dependencyType: 'credentialId',
					dependencyKey: 'cred-123',
					dependencyInfo: { name: 'Test Credential' },
				});
				dependencies.add({
					dependencyType: 'nodeType',
					dependencyKey: 'n8n-nodes-base.httpRequest',
					dependencyInfo: null,
				});

				//
				// ACT
				//
				const result = await workflowDependencyRepository.updateDependenciesForWorkflow(
					workflow.id,
					dependencies,
				);

				//
				// ASSERT
				//
				expect(result).toBe(true);
				const savedDependencies = await workflowDependencyRepository.find({
					where: { workflowId: workflow.id },
					order: { dependencyType: 'ASC' },
				});
				expect(savedDependencies).toHaveLength(2);
				expect(savedDependencies[0]).toMatchObject({
					workflowId: workflow.id,
					workflowVersionId: 1,
					dependencyType: 'credentialId',
					dependencyKey: 'cred-123',
					dependencyInfo: { name: 'Test Credential' },
					indexVersionId: 1,
				});
				expect(savedDependencies[1]).toMatchObject({
					workflowId: workflow.id,
					workflowVersionId: 1,
					dependencyType: 'nodeType',
					dependencyKey: 'n8n-nodes-base.httpRequest',
					dependencyInfo: null,
					indexVersionId: 1,
				});
			});

			it('should replace existing dependencies with newer version', async () => {
				//
				// ARRANGE
				//
				const workflow = await createWorkflow({ versionId: 'v1' });

				// Insert initial dependencies with version 1
				const initialDeps = new WorkflowDependencies(workflow.id, 1);
				initialDeps.add({
					dependencyType: 'credentialId',
					dependencyKey: 'cred-old',
					dependencyInfo: null,
				});
				await workflowDependencyRepository.updateDependenciesForWorkflow(workflow.id, initialDeps);

				// Create new dependencies with version 2
				const updatedDeps = new WorkflowDependencies(workflow.id, 2);
				updatedDeps.add({
					dependencyType: 'credentialId',
					dependencyKey: 'cred-new',
					dependencyInfo: { updated: true },
				});
				updatedDeps.add({
					dependencyType: 'webhookPath',
					dependencyKey: '/webhook/test',
					dependencyInfo: null,
				});

				//
				// ACT
				//
				const result = await workflowDependencyRepository.updateDependenciesForWorkflow(
					workflow.id,
					updatedDeps,
				);

				//
				// ASSERT
				//
				expect(result).toBe(true);
				const savedDependencies = await workflowDependencyRepository.find({
					where: { workflowId: workflow.id },
					order: { dependencyType: 'ASC' },
				});
				expect(savedDependencies).toHaveLength(2);
				expect(savedDependencies[0].dependencyKey).toBe('cred-new');
				expect(savedDependencies[0].workflowVersionId).toBe(2);
				expect(savedDependencies[1].dependencyType).toBe('webhookPath');
				expect(savedDependencies[1].workflowVersionId).toBe(2);
			});

			it('should not update when incoming version is older than existing version', async () => {
				//
				// ARRANGE
				//
				const workflow = await createWorkflow({ versionId: 'v2' });

				// Insert dependencies with version 2
				const newerDeps = new WorkflowDependencies(workflow.id, 2);
				newerDeps.add({
					dependencyType: 'credentialId',
					dependencyKey: 'cred-new',
					dependencyInfo: null,
				});
				await workflowDependencyRepository.updateDependenciesForWorkflow(workflow.id, newerDeps);

				// Try to update with older version 1
				const olderDeps = new WorkflowDependencies(workflow.id, 1);
				olderDeps.add({
					dependencyType: 'credentialId',
					dependencyKey: 'cred-old',
					dependencyInfo: null,
				});

				//
				// ACT
				//
				const result = await workflowDependencyRepository.updateDependenciesForWorkflow(
					workflow.id,
					olderDeps,
				);

				//
				// ASSERT
				//
				expect(result).toBe(false);
				const savedDependencies = await workflowDependencyRepository.find({
					where: { workflowId: workflow.id },
				});
				expect(savedDependencies).toHaveLength(1);
				expect(savedDependencies[0].dependencyKey).toBe('cred-new');
				expect(savedDependencies[0].workflowVersionId).toBe(2);
			});

			it('should prevent races between concurrent updates', async () => {
				//
				// ARRANGE
				//
				const workflow = await createWorkflow({ versionId: '2' });

				const depsVersion1 = new WorkflowDependencies(workflow.id, 1);
				depsVersion1.add({
					dependencyType: 'credentialId',
					dependencyKey: 'cred-1',
					dependencyInfo: null,
				});

				const depsVersion2 = new WorkflowDependencies(workflow.id, 2);
				depsVersion2.add({
					dependencyType: 'credentialId',
					dependencyKey: 'cred-2',
					dependencyInfo: null,
				});

				//
				// ACT
				//
				// Run the two updates concurrently. Due to the versioning logic,
				// the second update should always be applied. If there's a race,
				// this test may intermittently fail.

				//
				// ASSERT
				//
				await Promise.all([
					workflowDependencyRepository.updateDependenciesForWorkflow(workflow.id, depsVersion1),
					workflowDependencyRepository.updateDependenciesForWorkflow(workflow.id, depsVersion2),
				]);

				const savedDependencies = await workflowDependencyRepository.find({
					where: { workflowId: workflow.id },
				});
				expect(savedDependencies).toHaveLength(1);
				expect(savedDependencies[0].workflowVersionId).toBe(2);
				expect(savedDependencies[0].dependencyKey).toBe('cred-2');
			});
		});

		describe('removeDependenciesForWorkflow()', () => {
			it('should remove all dependencies for a workflow', async () => {
				//
				// ARRANGE
				//
				const workflow = await createWorkflow({ versionId: 'v1' });
				const dependencies = new WorkflowDependencies(workflow.id, 1);
				dependencies.add({
					dependencyType: 'credentialId',
					dependencyKey: 'cred-1',
					dependencyInfo: null,
				});
				dependencies.add({
					dependencyType: 'nodeType',
					dependencyKey: 'node-1',
					dependencyInfo: null,
				});
				await workflowDependencyRepository.updateDependenciesForWorkflow(workflow.id, dependencies);

				//
				// ACT
				//
				const result = await workflowDependencyRepository.removeDependenciesForWorkflow(
					workflow.id,
				);

				//
				// ASSERT
				//
				expect(result).toBe(true);
				const remainingDeps = await workflowDependencyRepository.find({
					where: { workflowId: workflow.id },
				});
				expect(remainingDeps).toHaveLength(0);
			});

			it('should return false when no dependencies exist to remove', async () => {
				//
				// ARRANGE
				//
				const workflow = await createWorkflow({ versionId: 'v1' });

				//
				// ACT
				//
				const result = await workflowDependencyRepository.removeDependenciesForWorkflow(
					workflow.id,
				);

				//
				// ASSERT
				//
				expect(result).toBe(false);
			});
		});
	});
}
