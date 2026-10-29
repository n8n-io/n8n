import { LicenseState } from '@n8n/backend-common';
import { CacheService } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	shareWorkflowWithProjects,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { CredentialsRepository, SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { InstanceAiContext } from '@n8n/instance-ai';
import { OutsideThreadProjectError } from '@n8n/instance-ai/errors';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { License } from '@/license';
import { mockDataTableSizeValidator } from '@/modules/data-table/__tests__/test-helpers';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { Push } from '@/push';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
import { createCredentials } from '@test-integration/db/credentials';
import { createDataTable } from '@test-integration/db/data-tables';
import { createMember } from '@test-integration/db/users';

import { InstanceAiAdapterService } from '../instance-ai.adapter.service';

describe('Instance AI writes outside the bound project (integration)', () => {
	mockInstance(ActiveWorkflowManager);
	mockInstance(Telemetry);
	mockInstance(Push, new Push(mock(), mock(), mock(), mock(), mock()));
	const workflowRunner = mockInstance(WorkflowRunner);

	let member: User;
	let boundProject: Project;
	let otherProject: Project;
	let context: InstanceAiContext;

	const workflowJson = (name: string): WorkflowJSON => ({ name, nodes: [], connections: {} });

	const storedWorkflow = async (id: string) =>
		await Container.get(WorkflowRepository).findOneByOrFail({ id });

	const expectPermissionError = async (write: Promise<unknown>) => {
		await expect(write).rejects.toThrow(OutsideThreadProjectError);
	};

	beforeAll(async () => {
		await testModules.loadModules(['data-table']);
		await testDb.init();
		mockDataTableSizeValidator();
		Container.get(LicenseState).setLicenseProvider(Container.get(License));
		await Container.get(CacheService).init();

		member = await createMember();
		[boundProject, otherProject] = await Promise.all([createTeamProject(), createTeamProject()]);
		await linkUserToProject(member, boundProject, 'project:editor');
		await linkUserToProject(member, otherProject, 'project:editor');

		context = Container.get(InstanceAiAdapterService).createContext(member, {
			threadId: 'thread-1',
			projectId: boundProject.id,
		});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('creates a workflow in the bound project', async () => {
		const created = await context.workflowService.createFromWorkflowJSON(
			workflowJson('Created by AI'),
		);

		const owningProject = await Container.get(SharedWorkflowRepository).getWorkflowOwningProject(
			created.id,
		);
		expect(owningProject?.id).toBe(boundProject.id);
	});

	it('updates a workflow from the bound project', async () => {
		const workflow = await createWorkflow({ name: 'Original name' }, boundProject);

		await context.workflowService.updateFromWorkflowJSON(
			workflow.id,
			workflowJson('Renamed by AI'),
		);

		expect((await storedWorkflow(workflow.id)).name).toBe('Renamed by AI');
	});

	it('updates a workflow shared into the bound project', async () => {
		const workflow = await createWorkflow({ name: 'Original name' }, otherProject);
		await shareWorkflowWithProjects(workflow, [{ project: boundProject, role: 'workflow:editor' }]);

		await context.workflowService.updateFromWorkflowJSON(
			workflow.id,
			workflowJson('Renamed by AI'),
		);

		expect((await storedWorkflow(workflow.id)).name).toBe('Renamed by AI');
	});

	it('reads a workflow from another project', async () => {
		const workflow = await createWorkflow({ name: 'Other project workflow' }, otherProject);

		await expect(context.workflowService.get(workflow.id)).resolves.toMatchObject({
			id: workflow.id,
			name: 'Other project workflow',
		});
	});

	it('rejects updating a workflow from another project', async () => {
		const workflow = await createWorkflow({ name: 'Original name' }, otherProject);

		await expectPermissionError(
			context.workflowService.updateFromWorkflowJSON(workflow.id, workflowJson('Renamed by AI')),
		);

		expect((await storedWorkflow(workflow.id)).name).toBe('Original name');
	});

	it('rejects archiving a workflow from another project', async () => {
		const workflow = await createWorkflow({}, otherProject);

		await expectPermissionError(context.workflowService.archive(workflow.id));

		expect((await storedWorkflow(workflow.id)).isArchived).toBe(false);
	});

	it('rejects running a workflow from another project', async () => {
		const workflow = await createWorkflow({}, otherProject);

		await expectPermissionError(context.executionService.run(workflow.id));

		expect(workflowRunner.run).not.toHaveBeenCalled();
	});

	it('rejects changing a data table from another project', async () => {
		const dataTable = await createDataTable(otherProject);

		await expectPermissionError(context.dataTableService.insertRows(dataTable.id, [{}]));
		await expectPermissionError(context.dataTableService.delete(dataTable.id));

		expect(await Container.get(DataTableRepository).existsBy({ id: dataTable.id })).toBe(true);
	});

	it('rejects deleting a credential from another project', async () => {
		const credential = await createCredentials(
			{ name: 'Other', type: 'test', data: '' },
			otherProject,
		);

		await expectPermissionError(context.credentialService.delete(credential.id));

		expect(await Container.get(CredentialsRepository).existsBy({ id: credential.id })).toBe(true);
	});
});
