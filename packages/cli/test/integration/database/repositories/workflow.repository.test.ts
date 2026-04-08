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
import type { Scope } from '@n8n/permissions';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';

import { createTestRun } from '../../shared/db/evaluation';

// Test helper functions
async function shareWorkflowsToProject(
	workflows: Array<{ id: string }>,
	projectId: string,
	role: 'workflow:editor' | 'workflow:owner',
) {
	const { SharedWorkflowRepository } = await import('@n8n/db');
	const sharedWorkflowRepository = Container.get(SharedWorkflowRepository);
	await sharedWorkflowRepository.save(
		workflows.map((w) => ({
			workflowId: w.id,
			projectId,
			role,
		})),
	);
}

function expectWorkflowsMatch(
	oldWorkflows: Array<Record<string, unknown> & { id: string }>,
	newWorkflows: Array<Record<string, unknown> & { id: string }>,
) {
	// Sort by ID for consistent order-independent comparison
	const oldSorted = [...oldWorkflows].sort((a, b) => a.id.localeCompare(b.id));
	const newSorted = [...newWorkflows].sort((a, b) => a.id.localeCompare(b.id));

	// Jest's toEqual does deep recursive comparison of all fields
	expect(newSorted).toEqual(oldSorted);
}

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

	describe('getManyAndCountWithSharingSubquery', () => {
		let workflowRepository: WorkflowRepository;

		beforeEach(async () => {
			await testDb.truncate([
				'SharedWorkflow',
				'ProjectRelation',
				'WorkflowEntity',
				'Project',
				'User',
			]);
			workflowRepository = Container.get(WorkflowRepository);
		});

		it('should fetch workflows using subquery for standard user with roles', async () => {
			// ARRANGE
			const { createMember } = await import('../../shared/db/users');
			const { createTeamProject, linkUserToProject } = await import('@n8n/backend-test-utils');

			const member = await createMember();
			const teamProject = await createTeamProject('test-project');
			await linkUserToProject(member, teamProject, 'project:editor');

			const workflows = await Promise.all([
				createWorkflow({ name: 'Team Workflow 1' }),
				createWorkflow({ name: 'Team Workflow 2' }),
			]);

			await shareWorkflowsToProject(workflows, teamProject.id, 'workflow:editor');

			const sharingOptions = {
				scopes: ['workflow:read'] as Scope[],
				projectRoles: ['project:editor'],
				workflowRoles: ['workflow:editor'],
			};

			// ACT
			const result = await workflowRepository.getManyAndCountWithSharingSubquery(
				member,
				sharingOptions,
				{},
			);

			// ASSERT
			expect(result.workflows).toHaveLength(2);
			expect(result.count).toBe(2);
			expect(result.workflows.map((w) => w.name)).toEqual(
				expect.arrayContaining(['Team Workflow 1', 'Team Workflow 2']),
			);
		});

		it('should handle personal project filtering correctly', async () => {
			// ARRANGE
			const { createOwner } = await import('../../shared/db/users');
			const { getPersonalProject } = await import('@n8n/backend-test-utils');

			const owner = await createOwner();
			const personalProject = await getPersonalProject(owner);

			const workflows = await Promise.all([
				createWorkflow({ name: 'Personal Workflow 1' }),
				createWorkflow({ name: 'Personal Workflow 2' }),
			]);

			await shareWorkflowsToProject(workflows, personalProject.id, 'workflow:owner');

			// ACT
			const result = await workflowRepository.getManyAndCountWithSharingSubquery(
				owner,
				{ isPersonalProject: true, personalProjectOwnerId: owner.id },
				{ filter: { projectId: personalProject.id } },
			);

			// ASSERT
			expect(result.workflows).toHaveLength(2);
			expect(result.count).toBe(2);
		});

		it('should handle onlySharedWithMe filter correctly', async () => {
			// ARRANGE
			const { createMember } = await import('../../shared/db/users');
			const { getPersonalProject } = await import('@n8n/backend-test-utils');

			const member = await createMember();
			const memberPersonalProject = await getPersonalProject(member);

			const sharedWorkflow = await createWorkflow({ name: 'Shared Workflow' });
			await shareWorkflowsToProject([sharedWorkflow], memberPersonalProject.id, 'workflow:editor');

			// ACT
			const result = await workflowRepository.getManyAndCountWithSharingSubquery(
				member,
				{ onlySharedWithMe: true },
				{},
			);

			// ASSERT
			expect(result.workflows).toHaveLength(1);
			expect(result.count).toBe(1);
			expect(result.workflows[0].name).toBe('Shared Workflow');
		});

		it('should apply filters correctly with subquery approach', async () => {
			// ARRANGE
			const { createOwner } = await import('../../shared/db/users');
			const { getPersonalProject } = await import('@n8n/backend-test-utils');

			const owner = await createOwner();
			const personalProject = await getPersonalProject(owner);

			const workflows = await Promise.all([
				createWorkflow({ name: 'Test Workflow Alpha' }),
				createWorkflow({ name: 'Test Workflow Beta' }),
				createWorkflow({ name: 'Production Workflow' }),
			]);

			await shareWorkflowsToProject(workflows, personalProject.id, 'workflow:owner');

			// ACT
			const result = await workflowRepository.getManyAndCountWithSharingSubquery(
				owner,
				{ isPersonalProject: true, personalProjectOwnerId: owner.id },
				{ filter: { projectId: personalProject.id, query: 'Test' } },
			);

			// ASSERT
			expect(result.workflows).toHaveLength(2);
			expect(result.count).toBe(2);
			expect(result.workflows.map((w) => w.name)).toEqual(
				expect.arrayContaining(['Test Workflow Alpha', 'Test Workflow Beta']),
			);
		});

		it('should handle pagination correctly with subquery approach', async () => {
			// ARRANGE
			const { createOwner } = await import('../../shared/db/users');
			const { getPersonalProject } = await import('@n8n/backend-test-utils');

			const owner = await createOwner();
			const personalProject = await getPersonalProject(owner);

			const workflows = await Promise.all([
				createWorkflow({ name: 'Workflow 1' }),
				createWorkflow({ name: 'Workflow 2' }),
				createWorkflow({ name: 'Workflow 3' }),
				createWorkflow({ name: 'Workflow 4' }),
				createWorkflow({ name: 'Workflow 5' }),
			]);

			await shareWorkflowsToProject(workflows, personalProject.id, 'workflow:owner');

			const sharingOptions = { isPersonalProject: true, personalProjectOwnerId: owner.id };

			// ACT
			const page1 = await workflowRepository.getManyAndCountWithSharingSubquery(
				owner,
				sharingOptions,
				{
					filter: { projectId: personalProject.id },
					take: 2,
					skip: 0,
				},
			);

			const page2 = await workflowRepository.getManyAndCountWithSharingSubquery(
				owner,
				sharingOptions,
				{
					filter: { projectId: personalProject.id },
					take: 2,
					skip: 2,
				},
			);

			// ASSERT
			expect(page1.workflows).toHaveLength(2);
			expect(page1.count).toBe(5);
			expect(page2.workflows).toHaveLength(2);
			expect(page2.count).toBe(5);

			// Verify no overlap between pages
			const page1Ids = page1.workflows.map((w) => w.id);
			const page2Ids = page2.workflows.map((w) => w.id);
			const intersection = page1Ids.filter((id) => page2Ids.includes(id));
			expect(intersection).toHaveLength(0);
		});
	});

	describe('getWorkflowsAndFoldersWithCountWithSharingSubquery', () => {
		let workflowRepository: WorkflowRepository;

		beforeEach(async () => {
			await testDb.truncate([
				'SharedWorkflow',
				'ProjectRelation',
				'WorkflowEntity',
				'Folder',
				'Project',
				'User',
			]);
			workflowRepository = Container.get(WorkflowRepository);
		});

		it('should fetch both workflows and folders using subquery approach', async () => {
			// ARRANGE
			const { createOwner } = await import('../../shared/db/users');
			const { getPersonalProject } = await import('@n8n/backend-test-utils');
			const { createFolder } = await import('../../shared/db/folders');

			const owner = await createOwner();
			const personalProject = await getPersonalProject(owner);

			const workflow = await createWorkflow({ name: 'Workflow 1' });
			await shareWorkflowsToProject([workflow], personalProject.id, 'workflow:owner');
			await createFolder(personalProject, { name: 'Folder 1' });

			// ACT
			const [results, count] =
				await workflowRepository.getWorkflowsAndFoldersWithCountWithSharingSubquery(
					owner,
					{ isPersonalProject: true, personalProjectOwnerId: owner.id },
					{ filter: { projectId: personalProject.id } },
				);

			// ASSERT
			expect(count).toBe(2);
			expect(results).toHaveLength(2);

			const resources = results.map((r) => r.resource);
			expect(resources).toContain('workflow');
			expect(resources).toContain('folder');
		});

		it('should handle complex filtering in union query with subquery', async () => {
			// ARRANGE
			const { createOwner } = await import('../../shared/db/users');
			const { getPersonalProject } = await import('@n8n/backend-test-utils');
			const { createFolder } = await import('../../shared/db/folders');

			const owner = await createOwner();
			const personalProject = await getPersonalProject(owner);

			const workflows = await Promise.all([
				createWorkflow({ name: 'Search Workflow' }),
				createWorkflow({ name: 'Other Workflow' }),
			]);

			await shareWorkflowsToProject(workflows, personalProject.id, 'workflow:owner');

			await createFolder(personalProject, { name: 'Search Folder' });
			await createFolder(personalProject, { name: 'Other Folder' });

			// ACT
			const [results, count] =
				await workflowRepository.getWorkflowsAndFoldersWithCountWithSharingSubquery(
					owner,
					{ isPersonalProject: true, personalProjectOwnerId: owner.id },
					{ filter: { projectId: personalProject.id, query: 'Search' } },
				);

			// ASSERT
			expect(count).toBe(2);
			expect(results).toHaveLength(2);

			const names = results.map((r) => r.name);
			expect(names).toContain('Search Workflow');
			expect(names).toContain('Search Folder');
		});
	});

	describe('Comparison: Old vs New Approach', () => {
		let workflowRepository: WorkflowRepository;

		beforeEach(async () => {
			await testDb.truncate([
				'SharedWorkflow',
				'ProjectRelation',
				'WorkflowEntity',
				'Project',
				'User',
			]);
			workflowRepository = Container.get(WorkflowRepository);
		});

		it('should return identical results for standard user with both approaches', async () => {
			// ARRANGE
			const { createMember } = await import('../../shared/db/users');
			const { createTeamProject, linkUserToProject } = await import('@n8n/backend-test-utils');
			const { WorkflowSharingService } = await import('@/workflows/workflow-sharing.service');
			const { RoleService } = await import('@/services/role.service');

			const member = await createMember();
			const teamProject = await createTeamProject('test-project');
			await linkUserToProject(member, teamProject, 'project:editor');

			const workflows = await Promise.all([
				createWorkflow({ name: 'Workflow A' }),
				createWorkflow({ name: 'Workflow B' }),
				createWorkflow({ name: 'Workflow C' }),
			]);

			await shareWorkflowsToProject(workflows, teamProject.id, 'workflow:editor');

			const roleService = Container.get(RoleService);
			const workflowSharingService = Container.get(WorkflowSharingService);

			const scopes: Scope[] = ['workflow:read'];
			const projectRoles = await roleService.rolesWithScope('project', scopes);
			const workflowRoles = await roleService.rolesWithScope('workflow', scopes);

			// ACT - Old Approach (pre-fetch IDs then query)
			const sharedWorkflowIds = await workflowSharingService.getSharedWorkflowIds(member, {
				scopes,
			});
			const oldResult = await workflowRepository.getManyAndCount(sharedWorkflowIds, {});

			// ACT - New Approach (subquery)
			const newResult = await workflowRepository.getManyAndCountWithSharingSubquery(
				member,
				{ scopes, projectRoles, workflowRoles },
				{},
			);

			// ASSERT
			expect(newResult.count).toBe(oldResult.count);
			expect(newResult.workflows).toHaveLength(oldResult.workflows.length);
			expectWorkflowsMatch(oldResult.workflows, newResult.workflows);
		});

		it('should return identical results for personal project with both approaches', async () => {
			// ARRANGE
			const { createOwner } = await import('../../shared/db/users');
			const { getPersonalProject } = await import('@n8n/backend-test-utils');
			const { WorkflowSharingService } = await import('@/workflows/workflow-sharing.service');

			const owner = await createOwner();
			const personalProject = await getPersonalProject(owner);

			const workflows = await Promise.all([
				createWorkflow({ name: 'Personal A' }),
				createWorkflow({ name: 'Personal B' }),
			]);

			await shareWorkflowsToProject(workflows, personalProject.id, 'workflow:owner');

			const workflowSharingService = Container.get(WorkflowSharingService);
			const scopes: Scope[] = ['workflow:read'];

			// ACT - Old Approach
			const sharedWorkflowIds = await workflowSharingService.getSharedWorkflowIds(owner, {
				scopes,
				projectId: personalProject.id,
			});
			const oldResult = await workflowRepository.getManyAndCount(sharedWorkflowIds, {
				filter: { projectId: personalProject.id },
			});

			// ACT - New Approach
			const newResult = await workflowRepository.getManyAndCountWithSharingSubquery(
				owner,
				{ isPersonalProject: true, personalProjectOwnerId: owner.id },
				{ filter: { projectId: personalProject.id } },
			);

			// ASSERT
			expect(newResult.count).toBe(oldResult.count);
			expect(newResult.workflows).toHaveLength(oldResult.workflows.length);
			expectWorkflowsMatch(oldResult.workflows, newResult.workflows);
		});

		it('should return identical results with filters and pagination', async () => {
			// ARRANGE
			const { createOwner } = await import('../../shared/db/users');
			const { getPersonalProject } = await import('@n8n/backend-test-utils');
			const { WorkflowSharingService } = await import('@/workflows/workflow-sharing.service');

			const owner = await createOwner();
			const personalProject = await getPersonalProject(owner);

			const workflows = await Promise.all([
				createWorkflow({ name: 'Alpha Test' }),
				createWorkflow({ name: 'Beta Test' }),
				createWorkflow({ name: 'Gamma Production' }),
				createWorkflow({ name: 'Delta Test' }),
			]);

			await shareWorkflowsToProject(workflows, personalProject.id, 'workflow:owner');

			const workflowSharingService = Container.get(WorkflowSharingService);
			const scopes: Scope[] = ['workflow:read'];

			const options = {
				filter: { projectId: personalProject.id, query: 'Test' },
				take: 2,
				skip: 0,
				sortBy: 'name:asc' as const,
			};

			// ACT - Old Approach
			const sharedWorkflowIds = await workflowSharingService.getSharedWorkflowIds(owner, {
				scopes,
				projectId: personalProject.id,
			});
			const oldResult = await workflowRepository.getManyAndCount(sharedWorkflowIds, options);

			// ACT - New Approach
			const newResult = await workflowRepository.getManyAndCountWithSharingSubquery(
				owner,
				{ isPersonalProject: true, personalProjectOwnerId: owner.id },
				options,
			);

			// ASSERT
			expect(newResult.count).toBe(oldResult.count);
			expect(newResult.workflows).toHaveLength(oldResult.workflows.length);

			// Check same workflows in same order (sorting should be consistent)
			const oldIds = oldResult.workflows.map((w) => w.id);
			const newIds = newResult.workflows.map((w) => w.id);
			expect(newIds).toEqual(oldIds);
		});

		it('should correctly filter workflows by project when workflows belong to multiple projects', async () => {
			// ARRANGE
			const { createMember } = await import('../../shared/db/users');
			const { createTeamProject, linkUserToProject } = await import('@n8n/backend-test-utils');
			const { WorkflowSharingService } = await import('@/workflows/workflow-sharing.service');
			const { RoleService } = await import('@/services/role.service');

			const member = await createMember();

			// Create two different projects
			const projectA = await createTeamProject('project-a');
			const projectB = await createTeamProject('project-b');
			await linkUserToProject(member, projectA, 'project:editor');
			await linkUserToProject(member, projectB, 'project:editor');

			// Create workflows in project A
			const workflowsA = await Promise.all([
				createWorkflow({ name: 'Project A Workflow 1' }),
				createWorkflow({ name: 'Project A Workflow 2' }),
				createWorkflow({ name: 'Project A Workflow 3' }),
			]);
			await shareWorkflowsToProject(workflowsA, projectA.id, 'workflow:editor');

			// Create workflows in project B
			const workflowsB = await Promise.all([
				createWorkflow({ name: 'Project B Workflow 1' }),
				createWorkflow({ name: 'Project B Workflow 2' }),
			]);
			await shareWorkflowsToProject(workflowsB, projectB.id, 'workflow:editor');

			const roleService = Container.get(RoleService);
			const workflowSharingService = Container.get(WorkflowSharingService);

			const scopes: Scope[] = ['workflow:read'];
			const projectRoles = await roleService.rolesWithScope('project', scopes);
			const workflowRoles = await roleService.rolesWithScope('workflow', scopes);

			// ACT - Filter by project A using old approach
			const sharedWorkflowIdsA = await workflowSharingService.getSharedWorkflowIds(member, {
				scopes,
				projectId: projectA.id,
			});
			const oldResultA = await workflowRepository.getManyAndCount(sharedWorkflowIdsA, {
				filter: { projectId: projectA.id },
			});

			// ACT - Filter by project A using new approach
			const newResultA = await workflowRepository.getManyAndCountWithSharingSubquery(
				member,
				{ scopes, projectRoles, workflowRoles },
				{ filter: { projectId: projectA.id } },
			);

			// ACT - Filter by project B using old approach
			const sharedWorkflowIdsB = await workflowSharingService.getSharedWorkflowIds(member, {
				scopes,
				projectId: projectB.id,
			});
			const oldResultB = await workflowRepository.getManyAndCount(sharedWorkflowIdsB, {
				filter: { projectId: projectB.id },
			});

			// ACT - Filter by project B using new approach
			const newResultB = await workflowRepository.getManyAndCountWithSharingSubquery(
				member,
				{ scopes, projectRoles, workflowRoles },
				{ filter: { projectId: projectB.id } },
			);

			// ASSERT - Project A results
			expect(newResultA.count).toBe(3);
			expect(oldResultA.count).toBe(3);
			expect(newResultA.workflows).toHaveLength(3);
			expectWorkflowsMatch(oldResultA.workflows, newResultA.workflows);

			// ASSERT - Project B results
			expect(newResultB.count).toBe(2);
			expect(oldResultB.count).toBe(2);
			expect(newResultB.workflows).toHaveLength(2);
			expectWorkflowsMatch(oldResultB.workflows, newResultB.workflows);
		});

		it('should correctly isolate workflows by user - each user sees only their workflows', async () => {
			// ARRANGE
			const { createMember } = await import('../../shared/db/users');
			const { createTeamProject, linkUserToProject } = await import('@n8n/backend-test-utils');
			const { WorkflowSharingService } = await import('@/workflows/workflow-sharing.service');
			const { RoleService } = await import('@/services/role.service');

			// Create two separate users
			const userA = await createMember();
			const userB = await createMember();

			// Create separate projects for each user
			const projectA = await createTeamProject('user-a-project');
			const projectB = await createTeamProject('user-b-project');
			await linkUserToProject(userA, projectA, 'project:editor');
			await linkUserToProject(userB, projectB, 'project:editor');

			// Create workflows for User A
			const workflowsUserA = await Promise.all([
				createWorkflow({ name: 'User A Workflow 1' }),
				createWorkflow({ name: 'User A Workflow 2' }),
			]);
			await shareWorkflowsToProject(workflowsUserA, projectA.id, 'workflow:editor');

			// Create workflows for User B
			const workflowsUserB = await Promise.all([
				createWorkflow({ name: 'User B Workflow 1' }),
				createWorkflow({ name: 'User B Workflow 2' }),
				createWorkflow({ name: 'User B Workflow 3' }),
			]);
			await shareWorkflowsToProject(workflowsUserB, projectB.id, 'workflow:editor');

			const roleService = Container.get(RoleService);
			const workflowSharingService = Container.get(WorkflowSharingService);

			const scopes: Scope[] = ['workflow:read'];
			const projectRoles = await roleService.rolesWithScope('project', scopes);
			const workflowRoles = await roleService.rolesWithScope('workflow', scopes);

			// ACT - Query workflows for User A (old approach)
			const sharedWorkflowIdsA = await workflowSharingService.getSharedWorkflowIds(userA, {
				scopes,
			});
			const oldResultA = await workflowRepository.getManyAndCount(sharedWorkflowIdsA, {});

			// ACT - Query workflows for User A (new approach)
			const newResultA = await workflowRepository.getManyAndCountWithSharingSubquery(
				userA,
				{ scopes, projectRoles, workflowRoles },
				{},
			);

			// ACT - Query workflows for User B (old approach)
			const sharedWorkflowIdsB = await workflowSharingService.getSharedWorkflowIds(userB, {
				scopes,
			});
			const oldResultB = await workflowRepository.getManyAndCount(sharedWorkflowIdsB, {});

			// ACT - Query workflows for User B (new approach)
			const newResultB = await workflowRepository.getManyAndCountWithSharingSubquery(
				userB,
				{ scopes, projectRoles, workflowRoles },
				{},
			);

			// ASSERT - User A should only see their 2 workflows
			expect(newResultA.count).toBe(2);
			expect(oldResultA.count).toBe(2);
			expect(newResultA.workflows).toHaveLength(2);
			expectWorkflowsMatch(oldResultA.workflows, newResultA.workflows);

			// ASSERT - User B should only see their 3 workflows
			expect(newResultB.count).toBe(3);
			expect(oldResultB.count).toBe(3);
			expect(newResultB.workflows).toHaveLength(3);
			expectWorkflowsMatch(oldResultB.workflows, newResultB.workflows);

			// ASSERT - Verify no cross-contamination: User A workflows should not appear in User B results
			const userBWorkflowIds = newResultB.workflows.map((w) => w.id);
			const userAWorkflowIds = workflowsUserA.map((w) => w.id);
			const contamination = userAWorkflowIds.filter((id) => userBWorkflowIds.includes(id));
			expect(contamination).toHaveLength(0);

			// ASSERT - Verify no cross-contamination: User B workflows should not appear in User A results
			const userAResultIds = newResultA.workflows.map((w) => w.id);
			const userBWorkflowIdsOriginal = workflowsUserB.map((w) => w.id);
			const reverseContamination = userBWorkflowIdsOriginal.filter((id) =>
				userAResultIds.includes(id),
			);
			expect(reverseContamination).toHaveLength(0);
		});
	});
});
