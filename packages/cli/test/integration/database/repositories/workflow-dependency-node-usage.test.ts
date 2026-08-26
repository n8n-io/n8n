import { testDb, createWorkflow, createTeamProject } from '@n8n/backend-test-utils';
import { WorkflowDependencies, WorkflowDependencyRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

const ANTHROPIC = '@n8n/n8n-nodes-langchain.lmChatAnthropic';
const OPENAI = '@n8n/n8n-nodes-langchain.lmChatOpenAi';
const LINEAR = 'n8n-nodes-base.linear';

/**
 * These back the cheap rung of preference discovery, so what matters is that the scoping is right:
 * an aggregate that quietly spans projects the caller cannot open would leak which node types other
 * teams use.
 */
describe('WorkflowDependencyRepository node usage', () => {
	let repository: WorkflowDependencyRepository;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(WorkflowDependencyRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowDependency', 'SharedWorkflow', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function seedWorkflow(
		project: Awaited<ReturnType<typeof createTeamProject>>,
		nodeTypes: string[],
		attributes: { isArchived?: boolean; name?: string } = {},
	) {
		const workflow = await createWorkflow({ versionId: 'v1', nodes: [], ...attributes }, project);
		const dependencies = new WorkflowDependencies(workflow.id, 1);
		for (const nodeType of nodeTypes) {
			dependencies.add({
				dependencyType: 'nodeType',
				dependencyKey: nodeType,
				dependencyInfo: null,
			});
		}
		await repository.updateDependenciesForWorkflow(workflow.id, dependencies);
		return workflow;
	}

	describe('countNodeTypesForProjects()', () => {
		it('counts workflows per node type, most-used first, with the scope total', async () => {
			const project = await createTeamProject();
			await seedWorkflow(project, [ANTHROPIC, LINEAR]);
			await seedWorkflow(project, [ANTHROPIC, LINEAR]);
			await seedWorkflow(project, [ANTHROPIC]);

			const result = await repository.countNodeTypesForProjects([project.id]);

			expect(result.workflowsInScope).toBe(3);
			expect(result.nodeTypes).toEqual([
				{ nodeType: ANTHROPIC, workflowCount: 3 },
				{ nodeType: LINEAR, workflowCount: 2 },
			]);
		});

		it('never reaches into a project that was not asked for', async () => {
			const mine = await createTeamProject();
			const theirs = await createTeamProject();
			await seedWorkflow(mine, [ANTHROPIC]);
			await seedWorkflow(theirs, [OPENAI]);

			const result = await repository.countNodeTypesForProjects([mine.id]);

			expect(result.nodeTypes.map((n) => n.nodeType)).toEqual([ANTHROPIC]);
			expect(result.workflowsInScope).toBe(1);
		});

		it('excludes archived workflows, which are what the project used to do', async () => {
			const project = await createTeamProject();
			await seedWorkflow(project, [ANTHROPIC]);
			await seedWorkflow(project, [OPENAI], { isArchived: true });

			const result = await repository.countNodeTypesForProjects([project.id]);

			expect(result.nodeTypes.map((n) => n.nodeType)).toEqual([ANTHROPIC]);
			expect(result.workflowsInScope).toBe(1);

			const withArchived = await repository.countNodeTypesForProjects([project.id], {
				includeArchived: true,
			});
			expect(withArchived.nodeTypes.map((n) => n.nodeType).sort()).toEqual([ANTHROPIC, OPENAI]);
		});

		it('reads nothing at all when no project is in scope', async () => {
			const project = await createTeamProject();
			await seedWorkflow(project, [ANTHROPIC]);

			expect(await repository.countNodeTypesForProjects([])).toEqual({
				workflowsInScope: 0,
				nodeTypes: [],
			});
		});
	});

	describe('findWorkflowsByNodeType()', () => {
		it('names the workflows using a type, most recently updated first', async () => {
			const project = await createTeamProject();
			const older = await seedWorkflow(project, [ANTHROPIC], { name: 'Older' });
			const newer = await seedWorkflow(project, [ANTHROPIC], { name: 'Newer' });
			await seedWorkflow(project, [OPENAI], { name: 'Unrelated' });

			// createWorkflow stamps updatedAt on save, so both rows land milliseconds apart and the
			// ordering assertion below would be a coin flip. Backdate one through a query builder:
			// entity save would trip the @BeforeUpdate hook and stamp it as now again, and raw SQL
			// would bake in one driver's parameter syntax.
			await Container.get(WorkflowRepository)
				.createQueryBuilder()
				.update()
				.set({ updatedAt: new Date('2026-01-01T00:00:00.000Z') })
				.where('id = :id', { id: older.id })
				.execute();

			const rows = await repository.findWorkflowsByNodeType([project.id], ANTHROPIC, 10);

			expect(rows.map((r) => r.name)).toEqual(['Newer', 'Older']);
			expect(rows[0].workflowId).toBe(newer.id);
			expect(rows[0].updatedAt).toBeInstanceOf(Date);
		});

		it('honours the limit, so a caller can detect truncation', async () => {
			const project = await createTeamProject();
			await seedWorkflow(project, [LINEAR]);
			await seedWorkflow(project, [LINEAR]);
			await seedWorkflow(project, [LINEAR]);

			expect(await repository.findWorkflowsByNodeType([project.id], LINEAR, 2)).toHaveLength(2);
		});

		it('stays inside the projects it was given', async () => {
			const mine = await createTeamProject();
			const theirs = await createTeamProject();
			await seedWorkflow(theirs, [ANTHROPIC], { name: 'Theirs' });

			expect(await repository.findWorkflowsByNodeType([mine.id], ANTHROPIC, 10)).toEqual([]);
		});
	});
});
