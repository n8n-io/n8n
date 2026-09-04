import {
	createTeamProject,
	createWorkflow,
	shareWorkflowWithProjects,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createExecution } from '@test-integration/db/executions';

describe('ExecutionRepository.summariseRunsForProjects', () => {
	let repository: ExecutionRepository;
	let project: Project;
	let otherProject: Project;

	/** Well inside every window the tests use, so a run counts unless a test excludes it. */
	const recently = () => new Date(Date.now() - 60_000);
	const windowStart = () => new Date(Date.now() - 60 * 60_000);

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(ExecutionRepository);
		project = await createTeamProject();
		otherProject = await createTeamProject();
	});

	beforeEach(async () => await testDb.truncate(['ExecutionEntity', 'WorkflowEntity']));
	afterAll(async () => await testDb.terminate());

	it('folds every run of a workflow into one row, with the failure count', async () => {
		const workflow = await createWorkflow({ name: 'Lead enrichment' }, project);
		for (const status of ['success', 'success', 'error'] as const) {
			await createExecution({ status, stoppedAt: recently() }, workflow);
		}

		const [summary] = await repository.summariseRunsForProjects({
			projectIds: [project.id],
			stoppedAfter: windowStart(),
			workflowLimit: 10,
		});

		expect(summary).toMatchObject({
			workflowId: workflow.id,
			workflowName: 'Lead enrichment',
			total: 3,
			failed: 1,
		});
	});

	it('names the failed run rather than the newest one, so a recovered schedule still reports it', async () => {
		const workflow = await createWorkflow({}, project);
		const failed = await createExecution(
			{ status: 'error', stoppedAt: new Date(Date.now() - 120_000) },
			workflow,
		);
		await createExecution({ status: 'success', stoppedAt: recently() }, workflow);

		const [summary] = await repository.summariseRunsForProjects({
			projectIds: [project.id],
			stoppedAfter: windowStart(),
			workflowLimit: 10,
		});

		expect(summary.lastFailedExecutionId).toBe(failed.id);
	});

	it('counts a crash as a failure and a cancellation as neither', async () => {
		const workflow = await createWorkflow({}, project);
		await createExecution({ status: 'crashed', stoppedAt: recently() }, workflow);
		await createExecution({ status: 'canceled', stoppedAt: recently() }, workflow);

		const [summary] = await repository.summariseRunsForProjects({
			projectIds: [project.id],
			stoppedAfter: windowStart(),
			workflowLimit: 10,
		});

		expect(summary).toMatchObject({ total: 2, failed: 1 });
	});

	/** An evaluation suite is machine-paced and would bury everything a person did. */
	it('excludes evaluation runs', async () => {
		const workflow = await createWorkflow({}, project);
		await createExecution({ status: 'error', mode: 'evaluation', stoppedAt: recently() }, workflow);
		await createExecution({ status: 'success', mode: 'manual', stoppedAt: recently() }, workflow);

		const [summary] = await repository.summariseRunsForProjects({
			projectIds: [project.id],
			stoppedAfter: windowStart(),
			workflowLimit: 10,
		});

		expect(summary).toMatchObject({ total: 1, failed: 0 });
	});

	it("does not report another project's runs", async () => {
		const theirs = await createWorkflow({}, otherProject);
		await createExecution({ status: 'error', stoppedAt: recently() }, theirs);

		const summaries = await repository.summariseRunsForProjects({
			projectIds: [project.id],
			stoppedAfter: windowStart(),
			workflowLimit: 10,
		});

		expect(summaries).toEqual([]);
	});

	/**
	 * The join multiplies rows once a workflow is shared into more than one project in scope.
	 * Without distinct counting the same run is reported as several.
	 */
	it('counts a run once when the workflow is shared into two projects in scope', async () => {
		const workflow = await createWorkflow({}, project);
		await shareWorkflowWithProjects(workflow, [{ project: otherProject }]);
		await createExecution({ status: 'error', stoppedAt: recently() }, workflow);

		const summaries = await repository.summariseRunsForProjects({
			projectIds: [project.id, otherProject.id],
			stoppedAfter: windowStart(),
			workflowLimit: 10,
		});

		expect(summaries).toHaveLength(1);
		expect(summaries[0]).toMatchObject({ total: 1, failed: 1 });
	});

	it('ignores runs that stopped before the bound, and runs still going', async () => {
		const workflow = await createWorkflow({}, project);
		await createExecution(
			{ status: 'error', stoppedAt: new Date(Date.now() - 2 * 60 * 60_000) },
			workflow,
		);
		// The fixture always stamps a stop time, so the unfinished case is made by clearing it.
		const running = await createExecution({ status: 'running' }, workflow);
		await repository.update(running.id, { stoppedAt: null });

		const summaries = await repository.summariseRunsForProjects({
			projectIds: [project.id],
			stoppedAfter: windowStart(),
			workflowLimit: 10,
		});

		expect(summaries).toEqual([]);
	});

	it('caps how many workflows contribute, keeping the most recent', async () => {
		const older = await createWorkflow({ name: 'Older' }, project);
		const newer = await createWorkflow({ name: 'Newer' }, project);
		await createExecution({ stoppedAt: new Date(Date.now() - 600_000) }, older);
		await createExecution({ stoppedAt: recently() }, newer);

		const summaries = await repository.summariseRunsForProjects({
			projectIds: [project.id],
			stoppedAfter: windowStart(),
			workflowLimit: 1,
		});

		expect(summaries.map((summary) => summary.workflowName)).toEqual(['Newer']);
	});

	it('reads nothing when no project is in scope', async () => {
		const workflow = await createWorkflow({}, project);
		await createExecution({ stoppedAt: recently() }, workflow);

		expect(
			await repository.summariseRunsForProjects({
				projectIds: [],
				stoppedAfter: windowStart(),
				workflowLimit: 10,
			}),
		).toEqual([]);
	});
});
