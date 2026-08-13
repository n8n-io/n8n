import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import { GLOBAL_OWNER_ROLE, WorkflowRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INodeTypes } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { createFolder } from '@test-integration/db/folders';
import { createUser } from '@test-integration/db/users';

import { getWorkflowDetails } from '../tools/get-workflow-details.tool';

let owner: User;
let project: Project;
let workflowFinderService: WorkflowFinderService;
let roleService: RoleService;
let projectService: ProjectService;

const credentialsService = mock<CredentialsService>();
const nodeTypes = mock<INodeTypes>();
const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

beforeAll(async () => {
	await testDb.init();

	workflowFinderService = Container.get(WorkflowFinderService);
	roleService = Container.get(RoleService);
	projectService = Container.get(ProjectService);
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'Folder', 'Project', 'User']);

	owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	project = await createTeamProject('Test project', owner);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('get_workflow_details against a real database', () => {
	test('returns the folder id for a workflow stored inside a folder', async () => {
		const folder = await createFolder(project, { name: 'My folder' });
		const workflow = await createWorkflow({ settings: { availableInMCP: true } }, project);
		await Container.get(WorkflowRepository).update(workflow.id, { parentFolder: folder });

		const payload = await getWorkflowDetails(
			owner,
			'https://example.test',
			workflowFinderService,
			credentialsService,
			nodeTypes,
			endpoints,
			roleService,
			projectService,
			{ workflowId: workflow.id },
		);

		expect(payload.workflow.parentFolderId).toBe(folder.id);
	});

	test('returns null for a workflow in the project root', async () => {
		const workflow = await createWorkflow({ settings: { availableInMCP: true } }, project);

		const payload = await getWorkflowDetails(
			owner,
			'https://example.test',
			workflowFinderService,
			credentialsService,
			nodeTypes,
			endpoints,
			roleService,
			projectService,
			{ workflowId: workflow.id },
		);

		expect(payload.workflow.parentFolderId).toBeNull();
	});
});
