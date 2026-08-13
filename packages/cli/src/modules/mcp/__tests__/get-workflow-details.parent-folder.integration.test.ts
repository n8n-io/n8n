import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INodeTypes } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { createFolder } from '@test-integration/db/folders';
import { createTag } from '@test-integration/db/tags';
import { createMember, createOwner } from '@test-integration/db/users';

import { getWorkflowDetails } from '../tools/get-workflow-details.tool';

let owner: User;
let member: User;
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

	owner = await createOwner();
	project = await createTeamProject('Test project', owner);

	member = await createMember();
	await linkUserToProject(member, project, 'project:editor');
});

afterAll(async () => {
	await testDb.terminate();
});

const detailsFor = async (workflowId: string, user: User = owner) =>
	await getWorkflowDetails(
		user,
		'https://example.test',
		workflowFinderService,
		credentialsService,
		nodeTypes,
		endpoints,
		roleService,
		projectService,
		{ workflowId },
	);

/**
 * Relation-derived fields (`parentFolderId`, `tags`) serialize to a legal-looking
 * `null`/`[]` when the relation is simply not loaded, so only a real query proves
 * they are populated. Mock-level assertions on the finder options cannot: the
 * earlier `includeTags` guard was in place while `parentFolderId` was broken.
 */
describe('get_workflow_details against a real database', () => {
	test('returns the folder and tags for a workflow stored inside a folder', async () => {
		const folder = await createFolder(project, { name: 'My folder' });
		const workflow = await createWorkflow(
			{ settings: { availableInMCP: true }, parentFolder: folder },
			project,
		);
		const tag = await createTag({ name: 'my-tag' }, workflow);

		const payload = await detailsFor(workflow.id);

		expect(payload.workflow.parentFolderId).toBe(folder.id);
		expect(payload.workflow.tags).toEqual([{ id: tag.id, name: tag.name }]);
	});

	// An instance owner short-circuits the read filter to `{}`, so only a project
	// member exercises the query shape most MCP callers actually hit, where the
	// folder join sits alongside the shared/project/projectRelations joins.
	test('returns the folder id for a project member', async () => {
		const folder = await createFolder(project, { name: 'Member folder' });
		const workflow = await createWorkflow(
			{ settings: { availableInMCP: true }, parentFolder: folder },
			project,
		);

		const payload = await detailsFor(workflow.id, member);

		expect(payload.workflow.parentFolderId).toBe(folder.id);
	});

	test('returns null for a workflow in the project root', async () => {
		const workflow = await createWorkflow({ settings: { availableInMCP: true } }, project);

		const payload = await detailsFor(workflow.id);

		expect(payload.workflow.parentFolderId).toBeNull();
	});
});
