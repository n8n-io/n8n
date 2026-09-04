import {
	createTeamProject,
	createWorkflow,
	shareWorkflowWithProjects,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

describe('WorkflowRepository.findRecentForProjects', () => {
	let repository: WorkflowRepository;
	let project: Project;
	let otherProject: Project;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(WorkflowRepository);
		project = await createTeamProject();
		otherProject = await createTeamProject();
	});

	beforeEach(async () => await testDb.truncate(['WorkflowEntity']));
	afterAll(async () => await testDb.terminate());

	it('names the most recently updated workflows first, with the total in scope', async () => {
		await createWorkflow({ name: 'Older', updatedAt: new Date('2026-01-01') }, project);
		await createWorkflow({ name: 'Newer', updatedAt: new Date('2026-06-01') }, project);

		const inventory = await repository.findRecentForProjects([project.id], 10);

		expect(inventory.total).toBe(2);
		expect(inventory.workflows.map((workflow) => workflow.name)).toEqual(['Newer', 'Older']);
	});

	/**
	 * Read back as a boolean whichever driver is underneath. Aggregating the column itself would
	 * fail on Postgres, which has no `max(boolean)`, while passing on sqlite.
	 */
	it('reports whether a workflow is published', async () => {
		await createWorkflow({ name: 'Live', active: true }, project);
		await createWorkflow({ name: 'Draft', active: false }, project);

		const inventory = await repository.findRecentForProjects([project.id], 10);

		expect(inventory.workflows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'Live', active: true }),
				expect.objectContaining({ name: 'Draft', active: false }),
			]),
		);
	});

	it('counts everything in scope while naming only the page asked for', async () => {
		for (const name of ['One', 'Two', 'Three']) await createWorkflow({ name }, project);

		const inventory = await repository.findRecentForProjects([project.id], 2);

		expect(inventory.total).toBe(3);
		expect(inventory.workflows).toHaveLength(2);
	});

	it('leaves out archived workflows', async () => {
		await createWorkflow({ name: 'Archived', isArchived: true }, project);
		await createWorkflow({ name: 'Live' }, project);

		const inventory = await repository.findRecentForProjects([project.id], 10);

		expect(inventory.total).toBe(1);
		expect(inventory.workflows.map((workflow) => workflow.name)).toEqual(['Live']);
	});

	it("does not name another project's workflows", async () => {
		await createWorkflow({ name: 'Theirs' }, otherProject);

		const inventory = await repository.findRecentForProjects([project.id], 10);

		expect(inventory).toEqual({ total: 0, workflows: [] });
	});

	/** The join multiplies rows for a workflow shared into two projects in scope. */
	it('counts a workflow shared into two projects in scope once', async () => {
		const workflow = await createWorkflow({ name: 'Shared' }, project);
		await shareWorkflowWithProjects(workflow, [{ project: otherProject }]);

		const inventory = await repository.findRecentForProjects([project.id, otherProject.id], 10);

		expect(inventory.total).toBe(1);
		expect(inventory.workflows).toHaveLength(1);
	});

	it('reads nothing when no project is in scope', async () => {
		await createWorkflow({ name: 'Mine' }, project);

		expect(await repository.findRecentForProjects([], 10)).toEqual({ total: 0, workflows: [] });
	});
});
