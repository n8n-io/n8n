import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Person, Project } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { Telemetry } from '@/telemetry';

import { addApiKey, createMember, createMemberWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

mockInstance(Telemetry);

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

let project: Project;
let admin: Person;
let editor: Person;
let otherEditor: Person;
let outsider: Person;
let adminAgent: SuperAgentTest;
let editorAgent: SuperAgentTest;

const createOwnedWorkflow = async (ownerUserId: string | null) => {
	const workflow = await createWorkflow({}, project);
	await Container.get(WorkflowRepository).setOwnerUserId([workflow.id], ownerUserId, {});
	return workflow;
};

const storedOwnerUserId = async (workflowId: string) => {
	const workflow = await Container.get(WorkflowRepository).findOneByOrFail({ id: workflowId });
	return workflow.ownerUserId;
};

const workflowPayload = { name: 'testing', nodes: [], connections: {}, settings: {} };

beforeAll(async () => {
	admin = await createMemberWithApiKey();
	editor = await createMemberWithApiKey();
	otherEditor = await createMember();
	outsider = await createMember();

	project = await createTeamProject('Owner project', admin);
	await linkUserToProject(editor, project, 'project:editor');
	await linkUserToProject(otherEditor, project, 'project:editor');

	adminAgent = testServer.publicApiAgentFor(admin);
	editorAgent = testServer.publicApiAgentFor(editor);
});

beforeEach(async () => {
	await testDb.truncate(['SharedWorkflow', 'WorkflowEntity']);
});

describe('GET /workflows', () => {
	test('should return the owner in the list and in the single read', async () => {
		const workflow = await createOwnedWorkflow(editor.id);

		const list = await adminAgent.get('/workflows');
		const single = await adminAgent.get(`/workflows/${workflow.id}`);

		expect(list.body.data).toEqual([expect.objectContaining({ ownerUserId: editor.id })]);
		expect(single.body.ownerUserId).toBe(editor.id);
	});

	test('should filter by owner', async () => {
		const owned = await createOwnedWorkflow(editor.id);
		await createOwnedWorkflow(admin.id);
		await createOwnedWorkflow(null);

		const response = await adminAgent.get('/workflows').query({ ownerUserId: editor.id });

		expect(response.statusCode).toBe(200);
		expect(response.body.data.map(({ id }: { id: string }) => id)).toEqual([owned.id]);
	});

	test('should page through the workflows with no owner', async () => {
		await createOwnedWorkflow(editor.id);
		const unowned = [await createOwnedWorkflow(null), await createOwnedWorkflow(null)];
		const query = { ownerUserId: 'none', projectId: project.id };

		const first = await adminAgent.get('/workflows').query({ ...query, limit: 1 });
		const second = await adminAgent
			.get('/workflows')
			.query({ ...query, cursor: first.body.nextCursor });

		const ids = [...first.body.data, ...second.body.data].map(({ id }: { id: string }) => id);
		expect(ids.sort()).toEqual(unowned.map(({ id }) => id).sort());
		expect(second.body.nextCursor).toBeNull();
	});

	test('should reject an owner filter that is not a user ID', async () => {
		const response = await adminAgent.get('/workflows').query({ ownerUserId: 'nobody' });

		expect(response.statusCode).toBe(400);
	});
});

describe('PUT /workflows/:workflowId/owner', () => {
	test('should set the owner as project admin', async () => {
		const workflow = await createOwnedWorkflow(null);

		const response = await adminAgent
			.put(`/workflows/${workflow.id}/owner`)
			.send({ ownerUserId: editor.id });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ ownerUserId: editor.id });
		expect(await storedOwnerUserId(workflow.id)).toBe(editor.id);
	});

	test('should clear the owner as project admin', async () => {
		const workflow = await createOwnedWorkflow(editor.id);

		const response = await adminAgent
			.put(`/workflows/${workflow.id}/owner`)
			.send({ ownerUserId: null });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ ownerUserId: null });
		expect(await storedOwnerUserId(workflow.id)).toBeNull();
	});

	test('should let the current owner give the workflow to another member', async () => {
		const workflow = await createOwnedWorkflow(editor.id);

		const response = await editorAgent
			.put(`/workflows/${workflow.id}/owner`)
			.send({ ownerUserId: otherEditor.id });

		expect(response.statusCode).toBe(200);
		expect(await storedOwnerUserId(workflow.id)).toBe(otherEditor.id);
	});

	test('should not let the current owner clear the owner', async () => {
		const workflow = await createOwnedWorkflow(editor.id);

		const response = await editorAgent
			.put(`/workflows/${workflow.id}/owner`)
			.send({ ownerUserId: null });

		expect(response.statusCode).toBe(403);
		expect(await storedOwnerUserId(workflow.id)).toBe(editor.id);
	});

	test('should not let an editor who is not the owner set the owner', async () => {
		const workflow = await createOwnedWorkflow(otherEditor.id);

		const response = await editorAgent
			.put(`/workflows/${workflow.id}/owner`)
			.send({ ownerUserId: editor.id });

		expect(response.statusCode).toBe(403);
		expect(await storedOwnerUserId(workflow.id)).toBe(otherEditor.id);
	});

	test('should reject a new owner who is not a member of the project', async () => {
		const workflow = await createOwnedWorkflow(null);

		const response = await adminAgent
			.put(`/workflows/${workflow.id}/owner`)
			.send({ ownerUserId: outsider.id });

		expect(response.statusCode).toBe(400);
		expect(await storedOwnerUserId(workflow.id)).toBeNull();
	});

	test('should reject a body without a user ID or null', async () => {
		const workflow = await createOwnedWorkflow(null);

		const response = await adminAgent
			.put(`/workflows/${workflow.id}/owner`)
			.send({ ownerUserId: 'nobody' });

		expect(response.statusCode).toBe(400);
	});

	test('should return 404 for a workflow that does not exist', async () => {
		const response = await adminAgent
			.put('/workflows/does-not-exist/owner')
			.send({ ownerUserId: editor.id });

		expect(response.statusCode).toBe(404);
	});

	test('should reject an API key without the workflow:manageOwner scope', async () => {
		const workflow = await createOwnedWorkflow(null);
		const keyOwner = await createMember();
		await linkUserToProject(keyOwner, project, 'project:admin');
		keyOwner.apiKeys = [await addApiKey(keyOwner, { scopes: ['workflow:read'] })];

		const response = await testServer
			.publicApiAgentFor(keyOwner)
			.put(`/workflows/${workflow.id}/owner`)
			.send({ ownerUserId: editor.id });

		expect(response.statusCode).toBe(403);
		expect(await storedOwnerUserId(workflow.id)).toBeNull();
	});
});

describe('PUT /workflows/:workflowId', () => {
	test('should reject ownerUserId on update and keep the owner', async () => {
		const workflow = await createOwnedWorkflow(admin.id);

		const response = await adminAgent
			.put(`/workflows/${workflow.id}`)
			.send({ ...workflowPayload, ownerUserId: editor.id });

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('request/body/ownerUserId is read-only');
		expect(await storedOwnerUserId(workflow.id)).toBe(admin.id);
	});
});
