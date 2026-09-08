import {
	testDb,
	createWorkflow,
	createTeamProject,
	linkUserToProject,
} from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import {
	SharedWorkflowRepository,
	WorkflowDependencyRepository,
	WorkflowDependencies,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { createMember, createOwner } from '../../shared/db/users';

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
			const workflow = await createWorkflow({ versionId: 'v1', nodes: [] });
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
			const result = await workflowDependencyRepository.removeDependenciesForWorkflow(workflow.id);

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
			const workflow = await createWorkflow({ versionId: 'v1', nodes: [] });

			//
			// ACT
			//
			const result = await workflowDependencyRepository.removeDependenciesForWorkflow(workflow.id);

			//
			// ASSERT
			//
			expect(result).toBe(false);
		});
	});
});

const ANTHROPIC = '@n8n/n8n-nodes-langchain.lmChatAnthropic';
const OPENAI = '@n8n/n8n-nodes-langchain.lmChatOpenAi';
const SLACK = 'n8n-nodes-base.slack';

/**
 * These back a context surface the agent reads to learn what a project is built out of, so the
 * thing worth asserting is the scoping: an aggregate that quietly spans projects the caller
 * cannot open would disclose what other teams use.
 */
describe('WorkflowDependencyRepository node usage', () => {
	let repository: WorkflowDependencyRepository;

	/** Roles carrying `workflow:read`, as the caller derives them from scopes. */
	const readerScope = {
		projectRoles: ['project:admin', 'project:editor'],
		workflowRoles: ['workflow:owner', 'workflow:editor'],
	};

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(WorkflowDependencyRepository);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'WorkflowDependency',
			'SharedWorkflow',
			'WorkflowEntity',
			'ProjectRelation',
			'Project',
			'User',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** A workflow holding one node per given type. `createWorkflow` indexes it on the way in, so
	 *  these tests read rows the real indexer would have written. */
	const seedWorkflow = async (
		project: Project,
		nodeTypes: string[],
		attributes: Partial<Parameters<typeof createWorkflow>[0]> = {},
	) =>
		await createWorkflow(
			{
				nodes: nodeTypes.map((type, index) => ({
					id: `node-${index}-${type}`,
					name: `${type}-${index}`,
					parameters: {},
					position: [0, 0] as [number, number],
					type,
					typeVersion: 1,
				})),
				...attributes,
			},
			project,
		);

	describe('countNodeTypeUsage()', () => {
		it('counts only workflows in projects the user belongs to', async () => {
			//
			// ARRANGE
			//
			const member = await createMember();
			const theirs = await createTeamProject('theirs');
			await linkUserToProject(member, theirs, 'project:editor');
			const someoneElses = await createTeamProject('someone-elses');

			await seedWorkflow(theirs, [ANTHROPIC]);
			await seedWorkflow(theirs, [ANTHROPIC, SLACK]);
			await seedWorkflow(someoneElses, [OPENAI]);

			//
			// ACT
			//
			const result = await repository.countNodeTypeUsage(member, readerScope, 50);

			//
			// ASSERT
			//
			expect(result.workflowsInScope).toBe(2);
			expect(result.nodeTypes).toEqual([
				{ nodeType: ANTHROPIC, workflowCount: 2 },
				{ nodeType: SLACK, workflowCount: 1 },
			]);
			// The whole point of the scoping: the other project's choice must not leak.
			expect(result.nodeTypes.map((row) => row.nodeType)).not.toContain(OPENAI);
		});

		it('narrows to one project when given a projectId', async () => {
			const member = await createMember();
			const first = await createTeamProject('first');
			const second = await createTeamProject('second');
			await linkUserToProject(member, first, 'project:editor');
			await linkUserToProject(member, second, 'project:editor');

			await seedWorkflow(first, [ANTHROPIC]);
			await seedWorkflow(second, [OPENAI]);

			const result = await repository.countNodeTypeUsage(
				member,
				{ ...readerScope, projectId: first.id },
				50,
			);

			expect(result.workflowsInScope).toBe(1);
			expect(result.nodeTypes).toEqual([{ nodeType: ANTHROPIC, workflowCount: 1 }]);
		});

		it('counts a node type once per workflow however many instances it holds', async () => {
			const member = await createMember();
			const project = await createTeamProject('project');
			await linkUserToProject(member, project, 'project:editor');

			await seedWorkflow(project, [SLACK, SLACK, SLACK]);

			const result = await repository.countNodeTypeUsage(member, readerScope, 50);

			expect(result.nodeTypes).toEqual([{ nodeType: SLACK, workflowCount: 1 }]);
		});

		it('excludes archived workflows from the counts and the denominator', async () => {
			const member = await createMember();
			const project = await createTeamProject('project');
			await linkUserToProject(member, project, 'project:editor');

			await seedWorkflow(project, [ANTHROPIC]);
			await seedWorkflow(project, [OPENAI], { isArchived: true });

			const result = await repository.countNodeTypeUsage(member, readerScope, 50);

			expect(result.workflowsInScope).toBe(1);
			expect(result.nodeTypes).toEqual([{ nodeType: ANTHROPIC, workflowCount: 1 }]);
		});

		it('reads draft rows, not published ones', async () => {
			const member = await createMember();
			const project = await createTeamProject('project');
			await linkUserToProject(member, project, 'project:editor');

			const workflow = await seedWorkflow(project, [ANTHROPIC]);
			// A published snapshot of the same workflow, which must not double-count or override
			// what the draft says the workflow currently contains.
			const published = new WorkflowDependencies(workflow.id, 2, 'published-version-id');
			published.add({ dependencyType: 'nodeType', dependencyKey: OPENAI, dependencyInfo: null });
			await repository.updateDependenciesForWorkflow(workflow.id, published);

			const result = await repository.countNodeTypeUsage(member, readerScope, 50);

			expect(result.nodeTypes).toEqual([{ nodeType: ANTHROPIC, workflowCount: 1 }]);
		});

		it('counts every project for a user with global workflow:read', async () => {
			const owner = await createOwner();
			const first = await createTeamProject('first');
			const second = await createTeamProject('second');

			await seedWorkflow(first, [ANTHROPIC]);
			await seedWorkflow(second, [OPENAI]);

			const result = await repository.countNodeTypeUsage(owner, readerScope, 50);

			expect(result.workflowsInScope).toBe(2);
			expect(result.nodeTypes).toEqual([
				{ nodeType: ANTHROPIC, workflowCount: 1 },
				{ nodeType: OPENAI, workflowCount: 1 },
			]);
		});

		it('returns nothing for a user who belongs to no project', async () => {
			const member = await createMember();
			const someoneElses = await createTeamProject('someone-elses');
			await seedWorkflow(someoneElses, [ANTHROPIC]);

			const result = await repository.countNodeTypeUsage(member, readerScope, 50);

			expect(result).toEqual({ workflowsInScope: 0, nodeTypes: [], truncated: false });
		});

		it('caps the histogram at the limit and says the list is cut', async () => {
			const member = await createMember();
			const project = await createTeamProject('project');
			await linkUserToProject(member, project, 'project:editor');

			// One workflow per type, so every type has the same count and only the limit decides
			// how many come back.
			await seedWorkflow(project, [ANTHROPIC]);
			await seedWorkflow(project, [OPENAI]);
			await seedWorkflow(project, [SLACK]);

			const capped = await repository.countNodeTypeUsage(member, readerScope, 2);
			const complete = await repository.countNodeTypeUsage(member, readerScope, 50);

			expect(capped.nodeTypes).toHaveLength(2);
			expect(capped.truncated).toBe(true);
			// The denominator still describes the whole scope, not the shown rows.
			expect(capped.workflowsInScope).toBe(3);

			expect(complete.nodeTypes).toHaveLength(3);
			expect(complete.truncated).toBe(false);
		});

		it('keeps the most-used types when it cuts', async () => {
			const member = await createMember();
			const project = await createTeamProject('project');
			await linkUserToProject(member, project, 'project:editor');

			await seedWorkflow(project, [ANTHROPIC, SLACK]);
			await seedWorkflow(project, [ANTHROPIC]);
			await seedWorkflow(project, [OPENAI]);

			const result = await repository.countNodeTypeUsage(member, readerScope, 1);

			expect(result.nodeTypes).toEqual([{ nodeType: ANTHROPIC, workflowCount: 2 }]);
			expect(result.truncated).toBe(true);
		});
	});

	describe('findWorkflowsUsingNodeType()', () => {
		it('returns the workflows using a type, most recently updated first, and scopes them', async () => {
			const member = await createMember();
			const theirs = await createTeamProject('theirs');
			await linkUserToProject(member, theirs, 'project:editor');
			const someoneElses = await createTeamProject('someone-elses');

			const older = await seedWorkflow(theirs, [ANTHROPIC], { name: 'older' });
			const newer = await seedWorkflow(theirs, [ANTHROPIC], { name: 'newer' });
			await seedWorkflow(theirs, [OPENAI], { name: 'different type' });
			await seedWorkflow(someoneElses, [ANTHROPIC], { name: 'out of scope' });

			// Make the ordering deterministic rather than relying on insertion timing.
			await Container.get(WorkflowRepository).update(older.id, {
				updatedAt: new Date('2020-01-01T00:00:00.000Z'),
			});
			await Container.get(WorkflowRepository).update(newer.id, {
				updatedAt: new Date('2030-01-01T00:00:00.000Z'),
			});

			const rows = await repository.findWorkflowsUsingNodeType(member, readerScope, ANTHROPIC, 10);

			expect(rows.map((row) => row.name)).toEqual(['newer', 'older']);
			expect(rows[0].workflowId).toBe(newer.id);
			expect(rows[0].updatedAt).toBeInstanceOf(Date);
		});

		it('respects the limit', async () => {
			const member = await createMember();
			const project = await createTeamProject('project');
			await linkUserToProject(member, project, 'project:editor');

			await seedWorkflow(project, [SLACK]);
			await seedWorkflow(project, [SLACK]);
			await seedWorkflow(project, [SLACK]);

			const rows = await repository.findWorkflowsUsingNodeType(member, readerScope, SLACK, 2);

			expect(rows).toHaveLength(2);
		});
	});

	describe('scale', () => {
		// The design this replaces passed the workflow ids in as bind parameters, which caps out at
		// SQLite's 999-variable limit. Scope is a subquery here, so the assertion is that the counts
		// are exact past that point — not merely that nothing threw.
		it('returns exact counts for a project larger than the bind-parameter limit', async () => {
			const member = await createMember();
			const project = await createTeamProject('large');
			await linkUserToProject(member, project, 'project:editor');

			const workflowCount = 1_200;
			const anthropicCount = 700;

			const workflowRepository = Container.get(WorkflowRepository);
			const sharedWorkflowRepository = Container.get(SharedWorkflowRepository);

			// Built directly rather than through `createWorkflow` so the seed stays a few bulk
			// inserts instead of 1,200 round trips per table.
			const workflows = Array.from({ length: workflowCount }, (_, index) =>
				workflowRepository.create({
					name: `workflow-${index}`,
					active: false,
					isArchived: false,
					nodes: [],
					connections: {},
					nodeGroups: [],
					settings: {},
					versionId: `version-${index}`,
				}),
			);
			// Chunked: a single multi-row INSERT of this many rows exceeds SQLite's expression-tree
			// depth limit, which is a property of the seed, not of the query under test.
			const insertInChunks = async <T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) => {
				for (let index = 0; index < rows.length; index += 200) {
					await insert(rows.slice(index, index + 200));
				}
			};

			await insertInChunks(workflows, async (chunk) => await workflowRepository.insert(chunk));
			await insertInChunks(
				workflows.map((workflow) =>
					sharedWorkflowRepository.create({
						projectId: project.id,
						workflowId: workflow.id,
						role: 'workflow:owner',
					}),
				),
				async (chunk) => await sharedWorkflowRepository.insert(chunk),
			);
			await insertInChunks(
				workflows.map((workflow, index) => ({
					workflowId: workflow.id,
					workflowVersionId: 1,
					publishedVersionId: null,
					dependencyType: 'nodeType' as const,
					dependencyKey: index < anthropicCount ? ANTHROPIC : OPENAI,
					dependencyInfo: null,
					indexVersionId: 1,
				})),
				async (chunk) => await repository.insert(chunk),
			);

			const result = await repository.countNodeTypeUsage(member, readerScope, 50);

			expect(result.workflowsInScope).toBe(workflowCount);
			expect(result.nodeTypes).toEqual([
				{ nodeType: ANTHROPIC, workflowCount: anthropicCount },
				{ nodeType: OPENAI, workflowCount: workflowCount - anthropicCount },
			]);
		});
	});
});
