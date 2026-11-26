import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User, WorkflowEntity } from '@n8n/db';
import { SharedWorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import { claimAllLedgerRows } from '@n8n/backend-module-execution-ledger/testing';
import { ExecutionLedgerModule } from '@n8n/backend-module-execution-ledger/module';
import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { packagedModules } from '@/modules/modules.manifest';
import { OwnershipService } from '@/services/ownership.service';
import { Telemetry } from '@/telemetry';
import { PollCursorService } from '@/workflows/triggers/poll-cursor.service';
import { getWorkflowProjectDetailsSafe } from '@/workflows/utils';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

import { createOwner } from '../shared/db/users';

mockInstance(ActiveWorkflowManager);
mockInstance(MessageEventBus);
mockInstance(Telemetry);
mockInstance(LicenseState).isSharingLicensed.mockReturnValue(true);

describe('owner project of execution ledger started rows', () => {
	let owner: User;
	let project: Project;
	let workflow: WorkflowEntity;
	let ownerProjectRead: ReturnType<typeof vi.spyOn>;

	beforeAll(async () => {
		await testModules.loadModules(['execution-ledger'], packagedModules);
		await testDb.init();
		await new ExecutionLedgerModule().init();
	});

	beforeEach(async () => {
		await testDb.truncate([
			'ExecutionEntity',
			'SharedWorkflow',
			'WorkflowEntity',
			'ProjectRelation',
			'Project',
			'User',
		]);
		await claimAllLedgerRows();
		owner = await createOwner();
		project = await createTeamProject('Ledger project', owner);
		workflow = await createWorkflow({ name: 'Ledger workflow' }, project);
		ownerProjectRead = vi.spyOn(
			Container.get(SharedWorkflowRepository),
			'getWorkflowOwningProjectId',
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const runData = (
		overrides: Partial<IWorkflowExecutionDataProcess> = {},
	): IWorkflowExecutionDataProcess => ({
		executionMode: 'trigger',
		workflowData: workflow,
		executionData: createEmptyRunExecutionData(),
		...overrides,
	});

	const startedProjectIds = async () =>
		(await claimAllLedgerRows())
			.filter((row) => row.event === 'started')
			.map((row) => row.projectId);

	it('writes the project of the starter without a read of the owner project', async () => {
		await Container.get(ActiveExecutions).add(runData({ projectId: project.id }));

		expect(await startedProjectIds()).toEqual([project.id]);
		expect(ownerProjectRead).not.toHaveBeenCalled();
	});

	it('writes the project of a poll commit without a read of the owner project', async () => {
		const pollCursorService = Container.get(PollCursorService);
		await pollCursorService.resolveCursor(workflow.id, 'node-1', { lastItemId: 'a' });

		const result = await pollCursorService.commitWithExecution({
			workflowId: workflow.id,
			nodeId: 'node-1',
			cursor: { lastItemId: 'b' },
			payload: {
				workflowId: workflow.id,
				data: createEmptyRunExecutionData(),
				workflowData: workflow,
				mode: 'trigger',
				status: 'new',
				finished: false,
			},
			projectId: project.id,
		});

		expect(result).not.toBeNull();
		expect(await startedProjectIds()).toEqual([project.id]);
		expect(ownerProjectRead).not.toHaveBeenCalled();
	});

	it.each([
		['no project', undefined],
		['an empty project', ''],
	])('looks up the project when the starter has %s', async (_case, projectId) => {
		await Container.get(ActiveExecutions).add(runData({ projectId }));

		expect(await startedProjectIds()).toEqual([project.id]);
		expect(ownerProjectRead).toHaveBeenCalledTimes(1);
	});

	it('looks up the project of an error workflow run', async () => {
		const failedWorkflowProject = await createTeamProject('Failed workflow project', owner);

		await Container.get(ActiveExecutions).add(
			runData({ executionMode: 'error', projectId: failedWorkflowProject.id }),
		);

		expect(await startedProjectIds()).toEqual([project.id]);
	});

	describe('after the workflow moves to another project', () => {
		let destination: Project;

		beforeEach(async () => {
			destination = await createTeamProject('Destination', owner);
			const ownershipService = Container.get(OwnershipService);
			// The move must replace an entry that is already in the cache.
			await ownershipService.getWorkflowProjectCached(workflow.id);

			await Container.get(EnterpriseWorkflowService).transferWorkflow(
				owner,
				workflow.id,
				destination.id,
			);
		});

		it('writes the new project when the starter reads it from the cache', async () => {
			const { projectId } = await getWorkflowProjectDetailsSafe(
				Container.get(OwnershipService),
				workflow.id,
			);

			await Container.get(ActiveExecutions).add(runData({ projectId }));

			expect(await startedProjectIds()).toEqual([destination.id]);
			expect(ownerProjectRead).not.toHaveBeenCalled();
		});

		it('writes the new project when the starter has no project', async () => {
			await Container.get(ActiveExecutions).add(runData());

			expect(await startedProjectIds()).toEqual([destination.id]);
		});
	});
});
