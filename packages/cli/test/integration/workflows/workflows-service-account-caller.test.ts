import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { GLOBAL_MEMBER_ROLE, SharedWorkflowRepository, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ProjectRole } from '@n8n/permissions';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { Telemetry } from '@/telemetry';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import { WorkflowService } from '@/workflows/workflow.service';

import { createMember, createOwner, createServiceAccountWithProject } from '../shared/db/users';

mockInstance(ActiveWorkflowManager);
mockInstance(MessageEventBus);
mockInstance(Telemetry);
mockInstance(LicenseState).isSharingLicensed.mockReturnValue(true);

/** A caller of each kind, with the same global role. */
const callers = [
	['person', async () => await createMember()],
	['service account', async () => await createServiceAccountWithProject(GLOBAL_MEMBER_ROLE)],
] as const;

describe('Workflows with a service account as the caller', () => {
	let workflowCreationService: WorkflowCreationService;
	let workflowService: WorkflowService;
	let enterpriseWorkflowService: EnterpriseWorkflowService;
	let project: Project;

	beforeAll(async () => {
		await testDb.init();
		workflowCreationService = Container.get(WorkflowCreationService);
		workflowService = Container.get(WorkflowService);
		enterpriseWorkflowService = Container.get(EnterpriseWorkflowService);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'SharedWorkflow',
			'WorkflowEntity',
			'ProjectRelation',
			'Project',
			'User',
		]);
		project = await createTeamProject('Team', await createOwner());
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function join(caller: User, role: ProjectRole, target = project) {
		await linkUserToProject(caller, target, role);
	}

	function newWorkflow(name: string) {
		return Object.assign(new WorkflowEntity(), { name, nodes: [], connections: {} });
	}

	it.each(callers)(
		'lets a %s with project:editor create, update, archive and delete a workflow',
		async (_kind, createCaller) => {
			const caller = await createCaller();
			await join(caller, 'project:editor');

			const created = await workflowCreationService.createWorkflow(caller, newWorkflow('Draft'), {
				projectId: project.id,
			});
			const owner = await Container.get(SharedWorkflowRepository).findOneByOrFail({
				workflowId: created.id,
			});
			expect(owner.projectId).toBe(project.id);

			const updated = await workflowService.update(
				caller,
				Object.assign(new WorkflowEntity(), { name: 'Renamed' }),
				created.id,
				{ forceSave: true },
			);
			expect(updated.name).toBe('Renamed');

			const archived = await workflowService.archive(caller, created.id);
			expect(archived?.isArchived).toBe(true);

			const deleted = await workflowService.delete(caller, created.id);
			expect(deleted?.id).toBe(created.id);
		},
	);

	it.each(callers)(
		'does not let a %s with project:viewer update or delete a workflow',
		async (_kind, createCaller) => {
			const caller = await createCaller();
			await join(caller, 'project:viewer');
			const workflow = await createWorkflow({ name: 'Read only' }, project);

			await expect(
				workflowService.update(
					caller,
					Object.assign(new WorkflowEntity(), { name: 'Renamed' }),
					workflow.id,
					{ forceSave: true },
				),
			).rejects.toThrow();
			expect(await workflowService.archive(caller, workflow.id)).toBeUndefined();
		},
	);

	it.each(callers)(
		'lets a %s with project:admin move a workflow to another of its projects',
		async (_kind, createCaller) => {
			const caller = await createCaller();
			const destination = await createTeamProject('Destination', await createOwner());
			await join(caller, 'project:admin');
			await join(caller, 'project:admin', destination);
			const workflow = await createWorkflow({ name: 'To move' }, project);

			await enterpriseWorkflowService.transferWorkflow(caller, workflow.id, destination.id);

			const owner = await Container.get(SharedWorkflowRepository).findOneByOrFail({
				workflowId: workflow.id,
				role: 'workflow:owner',
			});
			expect(owner.projectId).toBe(destination.id);
		},
	);
});
