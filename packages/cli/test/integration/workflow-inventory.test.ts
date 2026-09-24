import {
	createActiveWorkflow,
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
	 * Published means `activeVersionId`, not the deprecated `active` column — a workflow can carry
	 * `active: true` with no published version. Read back as a boolean whichever driver is
	 * underneath: aggregating the column itself would fail on Postgres, which has no
	 * `max(boolean)`, while passing on sqlite.
	 */
	it('reports whether a workflow is published', async () => {
		await createActiveWorkflow({ name: 'Live' }, project);
		await createWorkflow({ name: 'Draft' }, project);

		const inventory = await repository.findRecentForProjects([project.id], 10);

		expect(inventory.workflows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'Live', active: true }),
				expect.objectContaining({ name: 'Draft', active: false }),
			]),
		);
	});

	it('does not call a workflow published when only the deprecated flag is set', async () => {
		await createWorkflow({ name: 'Flagged but unpublished', active: true }, project);

		const inventory = await repository.findRecentForProjects([project.id], 10);

		expect(inventory.workflows).toEqual([
			expect.objectContaining({ name: 'Flagged but unpublished', active: false }),
		]);
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

	/**
	 * A whole-instance reader gets `'all-projects'` rather than a list, which drops the shared
	 * join entirely. That is the branch every instance owner takes, so it needs its own cases.
	 */
	describe("the 'all-projects' scope", () => {
		it('names a workflow whose project the list scope never mentions', async () => {
			await createWorkflow({ name: 'Elsewhere' }, otherProject);

			const scoped = await repository.findRecentForProjects([project.id], 10);
			const all = await repository.findRecentForProjects('all-projects', 10);

			expect(scoped.total).toBe(0);
			expect(all.total).toBe(1);
			expect(all.workflows.map((w) => w.name)).toEqual(['Elsewhere']);
		});

		/** Without the join there is no row multiplication left to guard against — prove it. */
		it('counts a workflow shared into two projects once', async () => {
			const workflow = await createWorkflow({ name: 'Shared' }, project);
			await shareWorkflowWithProjects(workflow, [{ project: otherProject }]);

			const all = await repository.findRecentForProjects('all-projects', 10);

			expect(all.total).toBe(1);
			expect(all.workflows).toHaveLength(1);
		});

		it('counts only what carries the MCP setting when asked to', async () => {
			await createWorkflow({ name: 'Exposed', settings: { availableInMCP: true } }, project);
			await createWorkflow({ name: 'Withheld' }, otherProject);

			const unfiltered = await repository.findRecentForProjects('all-projects', 10);
			const visible = await repository.findRecentForProjects('all-projects', 10, {
				mcpVisibleOnly: true,
			});

			expect(unfiltered.total).toBe(2);
			expect(visible.total).toBe(1);
			expect(visible.workflows.map((w) => w.name)).toEqual(['Exposed']);
		});

		/** Archived counts as withheld, matching every other MCP read. */
		it('excludes an archived workflow even when it carries the setting', async () => {
			await createWorkflow(
				{ name: 'Archived but flagged', isArchived: true, settings: { availableInMCP: true } },
				project,
			);

			const visible = await repository.findRecentForProjects('all-projects', 10, {
				mcpVisibleOnly: true,
			});

			expect(visible).toEqual({ total: 0, workflows: [] });
		});
	});
});
