import { createWorkflow, randomCredentialPayload, testDb } from '@n8n/backend-test-utils';
import type { User, WorkflowDependency } from '@n8n/db';
import { ProjectRepository, WorkflowDependencyRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { saveCredential } from '../shared/db/credentials';
import { createDataTable } from '../shared/db/data-tables';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['data-table'],
});

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	member = await createMemberWithApiKey();
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowDependency',
		'SharedWorkflow',
		'WorkflowEntity',
		'SharedCredentials',
		'CredentialsEntity',
		'DataTable',
	]);

	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);
});

async function seedDependency(
	workflowId: string,
	dependencyType: WorkflowDependency['dependencyType'],
	dependencyKey: string,
) {
	const repository = Container.get(WorkflowDependencyRepository);
	await repository.save(
		repository.create({
			workflowId,
			workflowVersionId: 1,
			publishedVersionId: null,
			dependencyType,
			dependencyKey,
			dependencyInfo: null,
			indexVersionId: 1,
		}),
	);
}

// The API key scope check runs before RBAC, so a key for an unrelated resource is rejected.
async function createUnscopedAgent() {
	const unscopedOwner = await createOwnerWithApiKey({ scopes: ['tag:list'] });
	return testServer.publicApiAgentFor(unscopedOwner);
}

describe('GET /workflows/:workflowId/dependencies', () => {
	test('should list what the workflow uses and what uses it', async () => {
		const workflow = await createWorkflow({ name: 'Main' }, owner);
		const subWorkflow = await createWorkflow({ name: 'Child' }, owner);
		const parentWorkflow = await createWorkflow({ name: 'Parent' }, owner);
		const credential = await saveCredential(
			{ ...randomCredentialPayload(), name: 'Slack' },
			{ user: owner, role: 'credential:owner' },
		);

		await seedDependency(workflow.id, 'credentialId', credential.id);
		await seedDependency(workflow.id, 'workflowCall', subWorkflow.id);
		await seedDependency(parentWorkflow.id, 'workflowCall', workflow.id);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}/dependencies`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			data: [
				{ type: 'credential', id: credential.id, name: 'Slack' },
				{ type: 'parentWorkflow', id: parentWorkflow.id, name: 'Parent' },
				{ type: 'subWorkflow', id: subWorkflow.id, name: 'Child' },
			],
			nextCursor: null,
			inaccessibleCount: 0,
		});
	});

	test('should return the dependencies page by page', async () => {
		const workflow = await createWorkflow({}, owner);
		const subWorkflows = await Promise.all(
			['A', 'B', 'C'].map(async (name) => await createWorkflow({ name }, owner)),
		);
		for (const subWorkflow of subWorkflows) {
			await seedDependency(workflow.id, 'workflowCall', subWorkflow.id);
		}

		const firstPage = await authOwnerAgent
			.get(`/workflows/${workflow.id}/dependencies`)
			.query({ limit: 2 });

		expect(firstPage.statusCode).toBe(200);
		expect(firstPage.body.data.map((d: { name: string }) => d.name)).toEqual(['A', 'B']);
		expect(firstPage.body.nextCursor).not.toBeNull();

		const secondPage = await authOwnerAgent
			.get(`/workflows/${workflow.id}/dependencies`)
			.query({ cursor: firstPage.body.nextCursor });

		expect(secondPage.statusCode).toBe(200);
		expect(secondPage.body.data.map((d: { name: string }) => d.name)).toEqual(['C']);
		expect(secondPage.body.nextCursor).toBeNull();
	});

	test('should count dependencies the user cannot access without listing them', async () => {
		const memberWorkflow = await createWorkflow({}, member);
		const ownerWorkflow = await createWorkflow({}, owner);
		await seedDependency(memberWorkflow.id, 'workflowCall', ownerWorkflow.id);

		const response = await authMemberAgent.get(`/workflows/${memberWorkflow.id}/dependencies`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ data: [], nextCursor: null, inaccessibleCount: 1 });
	});

	test('should return an empty list when the workflow has no dependencies', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}/dependencies`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ data: [], nextCursor: null, inaccessibleCount: 0 });
	});

	test('should return 404 for an unknown workflow', async () => {
		const response = await authOwnerAgent.get('/workflows/unknown-id/dependencies');

		expect(response.statusCode).toBe(404);
	});

	test('should reject a user without access to the workflow', async () => {
		const ownerWorkflow = await createWorkflow({}, owner);

		const response = await authMemberAgent.get(`/workflows/${ownerWorkflow.id}/dependencies`);

		expect(response.statusCode).toBe(403);
	});

	test('should reject an API key without workflow:read', async () => {
		const workflow = await createWorkflow({}, owner);
		const unscopedAgent = await createUnscopedAgent();

		const response = await unscopedAgent.get(`/workflows/${workflow.id}/dependencies`);

		expect(response.statusCode).toBe(403);
	});

	test('should reject an undecodable cursor', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent
			.get(`/workflows/${workflow.id}/dependencies`)
			.query({ cursor: 'not-a-cursor' });

		expect(response.statusCode).toBe(400);
	});
});

describe('GET /credentials/:credentialId/dependencies', () => {
	test('should list the workflows that use the credential', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});
		const workflow = await createWorkflow({ name: 'Uses Slack' }, owner);
		await seedDependency(workflow.id, 'credentialId', credential.id);
		const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);

		const response = await authOwnerAgent.get(`/credentials/${credential.id}/dependencies`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			data: [
				{ type: 'parentWorkflow', id: workflow.id, name: 'Uses Slack', projectId: project.id },
			],
			nextCursor: null,
			inaccessibleCount: 0,
		});
	});

	test('should return 404 for an unknown credential', async () => {
		const response = await authOwnerAgent.get('/credentials/unknown-id/dependencies');

		expect(response.statusCode).toBe(404);
	});

	test('should reject a user without access to the credential', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		const response = await authMemberAgent.get(`/credentials/${credential.id}/dependencies`);

		expect(response.statusCode).toBe(403);
	});

	test('should reject an API key without credential:read', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});
		const unscopedAgent = await createUnscopedAgent();

		const response = await unscopedAgent.get(`/credentials/${credential.id}/dependencies`);

		expect(response.statusCode).toBe(403);
	});
});

describe('GET /data-tables/:dataTableId/dependencies', () => {
	test('should list the workflows that use the data table', async () => {
		const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		const dataTable = await createDataTable(project);
		const workflow = await createWorkflow({ name: 'Writes orders' }, owner);
		await seedDependency(workflow.id, 'dataTableId', dataTable.id);

		const response = await authOwnerAgent.get(`/data-tables/${dataTable.id}/dependencies`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			data: [{ type: 'parentWorkflow', id: workflow.id, name: 'Writes orders' }],
			nextCursor: null,
			inaccessibleCount: 0,
		});
	});

	test('should return 404 for an unknown data table', async () => {
		const response = await authOwnerAgent.get('/data-tables/AAAAAAAAAAAAAAAA/dependencies');

		expect(response.statusCode).toBe(404);
	});

	test('should reject an API key without dataTable:read', async () => {
		const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		const dataTable = await createDataTable(project);
		const unscopedAgent = await createUnscopedAgent();

		const response = await unscopedAgent.get(`/data-tables/${dataTable.id}/dependencies`);

		expect(response.statusCode).toBe(403);
	});
});
