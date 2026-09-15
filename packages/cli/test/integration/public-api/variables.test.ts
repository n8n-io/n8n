import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import type { Project, User, Variables } from '@n8n/db';
import { ProjectRepository, VariablesRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { createMemberWithApiKey, createOwnerWithApiKey } from '@test-integration/db/users';
import {
	createProjectVariable,
	createVariable,
	getVariableByIdOrFail,
	getVariableByKey,
} from '@test-integration/db/variables';
import { setupTestServer } from '@test-integration/utils';

describe('Variables in Public API', () => {
	let owner: User;
	let project: Project;
	const testServer = setupTestServer({ endpointGroups: ['publicApi'] });
	const licenseErrorMessage = new FeatureNotLicensedError('feat:variables').message;

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['Variables', 'User']);

		owner = await createOwnerWithApiKey();
		project = await createTeamProject();
	});

	describe('GET /variables', () => {
		it('should return all variables with pagination', async () => {
			testServer.license.enable('feat:variables');
			const variables = await Promise.all([
				createVariable(),
				createVariable(),
				createVariable(),
				createProjectVariable('projectKey', 'projectValue', project),
			]);

			const response = await testServer.publicApiAgentFor(owner).get('/variables');

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('data');
			expect(response.body).toHaveProperty('nextCursor');
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBe(variables.length);

			variables.forEach(({ id, key, value, project }) => {
				expect(response.body.data).toContainEqual(expect.objectContaining({ id, key, value }));
				if (project) {
					const projectResponse = response.body.data.find((v: Variables) => v.id === id).project;
					expect(projectResponse).toBeDefined();
					expect(projectResponse).toEqual(
						expect.objectContaining({ id: project.id, name: project.name }),
					);
				}
			});
		});

		it('should represent a variable with a NULL value as an empty string', async () => {
			testServer.license.enable('feat:variables');
			const variable = await createVariable();
			await Container.get(VariablesRepository).update(variable.id, { value: null } as never);
			await Container.get(VariablesService).updateCache();

			const response = await testServer.publicApiAgentFor(owner).get('/variables');

			expect(response.status).toBe(200);
			expect(response.body.data).toContainEqual(
				expect.objectContaining({ id: variable.id, value: '' }),
			);
		});

		it('should be able to filter variables by projectId and state', async () => {
			testServer.license.enable('feat:variables');
			await Promise.all([
				createVariable(),
				createProjectVariable('projectKey', 'projectValue', project),
				createProjectVariable('emptyVar', '', project),
				createVariable('emptyVar', ''),
			]);

			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/variables')
				.query({ projectId: project.id, state: 'empty' });

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('data');
			expect(response.body).toHaveProperty('nextCursor');
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBe(1);
			expect(response.body.data[0]).toEqual(
				expect.objectContaining({
					key: 'emptyVar',
					value: '',
					project: expect.objectContaining({ id: project.id }),
				}),
			);
		});

		it('should return only global variables for a "null" projectId', async () => {
			testServer.license.enable('feat:variables');
			const globalVariable = await createVariable();
			await createProjectVariable('projectKey', 'projectValue', project);

			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/variables')
				.query({ projectId: 'null' });

			expect(response.status).toBe(200);
			expect(response.body.data).toHaveLength(1);
			expect(response.body.data[0]).toEqual(
				expect.objectContaining({ id: globalVariable.id, key: globalVariable.key, project: null }),
			);
		});

		it('should clamp a limit above the maximum instead of rejecting it', async () => {
			testServer.license.enable('feat:variables');
			await createVariable();

			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/variables')
				.query({ limit: 1000 });

			expect(response.status).toBe(200);
			expect(response.body.data).toHaveLength(1);
		});

		it('should only return the documented variable fields', async () => {
			testServer.license.enable('feat:variables');
			await createVariable();
			await createProjectVariable('projectKey', 'projectValue', project);

			const response = await testServer.publicApiAgentFor(owner).get('/variables');

			expect(response.status).toBe(200);
			expect(response.body.data).toHaveLength(2);
			for (const variable of response.body.data) {
				expect(Object.keys(variable).sort()).toEqual(['id', 'key', 'project', 'type', 'value']);
				if (variable.project !== null) {
					expect(Object.keys(variable.project).sort()).toEqual([
						'createdAt',
						'creatorId',
						'customTelemetryTags',
						'description',
						'icon',
						'id',
						'name',
						'type',
						'updatedAt',
					]);
					expect(typeof variable.project.createdAt).toBe('string');
					expect(typeof variable.project.updatedAt).toBe('string');
				}
			}
			expect(response.body.data.filter((v: Variables) => v.project === null)).toHaveLength(1);
		});

		it('should return the stored project icon unchanged', async () => {
			testServer.license.enable('feat:variables');
			const icon = { type: 'emoji', value: '🚀', color: '#ff0000' } as Project['icon'];
			await Container.get(ProjectRepository).update(project.id, { icon });
			await createProjectVariable('projectKey', 'projectValue', project);

			const response = await testServer.publicApiAgentFor(owner).get('/variables');

			expect(response.status).toBe(200);
			expect(response.body.data).toHaveLength(1);
			expect(response.body.data[0].project.icon).toEqual(icon);
		});

		it('should paginate with an opaque cursor', async () => {
			testServer.license.enable('feat:variables');
			await Promise.all([createVariable(), createVariable(), createVariable()]);

			const first = await testServer.publicApiAgentFor(owner).get('/variables').query({ limit: 2 });
			const second = await testServer
				.publicApiAgentFor(owner)
				.get('/variables')
				.query({ cursor: first.body.nextCursor });

			expect(first.status).toBe(200);
			expect(first.body.data).toHaveLength(2);
			expect(first.body.nextCursor).not.toBeNull();
			expect(second.status).toBe(200);
			expect(second.body.data).toHaveLength(1);
			expect(second.body.nextCursor).toBeNull();
		});

		it('should reject a non-numeric limit', async () => {
			testServer.license.enable('feat:variables');

			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/variables')
				.query({ limit: 'abc' });

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty(
				'message',
				'request/query/limit Param `limit` must be a valid integer',
			);
		});

		it('should reject an invalid cursor', async () => {
			testServer.license.enable('feat:variables');

			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/variables')
				.query({ cursor: 'not-a-cursor' });

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty('message', 'An invalid cursor was provided');
		});

		it('should reject an API key without the "variable:list" scope', async () => {
			testServer.license.enable('feat:variables');
			const ownerWithoutScope = await createOwnerWithApiKey({ scopes: ['variable:create'] });
			await createVariable();

			const response = await testServer.publicApiAgentFor(ownerWithoutScope).get('/variables');

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});

		it('if not licensed, should reject', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/variables');

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});

		it('should not return variables from projects the user is not a member of', async () => {
			testServer.license.enable('feat:variables');
			const member = await createMemberWithApiKey();

			const memberProject = await createTeamProject('Member Project');
			await linkUserToProject(member, memberProject, 'project:admin');
			const otherProject = await createTeamProject('Other Project');

			const memberVar = await createProjectVariable('memberKey', 'memberValue', memberProject);
			await createProjectVariable('secretKey', 'secretValue', otherProject);

			const allResponse = await testServer.publicApiAgentFor(member).get('/variables');

			expect(allResponse.status).toBe(200);
			const returnedIds = allResponse.body.data.map((v: Variables) => v.id);
			expect(returnedIds).toContain(memberVar.id);
			expect(allResponse.body.data).toHaveLength(1);

			const crossProjectResponse = await testServer
				.publicApiAgentFor(member)
				.get('/variables')
				.query({ projectId: otherProject.id });

			expect(crossProjectResponse.status).toBe(200);
			expect(crossProjectResponse.body.data).toHaveLength(0);
		});
	});

	describe('POST /variables', () => {
		it('should create a new variable and answer with an empty body', async () => {
			testServer.license.enable('feat:variables');
			const variablePayload = { key: 'key', value: 'value' };

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/variables')
				.send(variablePayload);

			expect(response.status).toBe(201);
			expect(response.text).toBe('');
			const created = await getVariableByKey('key');
			expect(created).toEqual(expect.objectContaining(variablePayload));
		});

		it('should reject a body that is missing a required field', async () => {
			testServer.license.enable('feat:variables');

			const response = await testServer.publicApiAgentFor(owner).post('/variables').send({});

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty(
				'message',
				"request/body must have required property 'key'",
			);
		});

		it('should reject a read-only field', async () => {
			testServer.license.enable('feat:variables');

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/variables')
				.send({ id: 'someId', key: 'key', value: 'value' });

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty('message', 'request/body/id is read-only');
			await expect(getVariableByKey('key')).resolves.toBeNull();
		});

		it('should reject a null projectId', async () => {
			testServer.license.enable('feat:variables');

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/variables')
				.send({ key: 'key', value: 'value', projectId: null });

			expect(response.status).toBe(400);
			await expect(getVariableByKey('key')).resolves.toBeNull();
		});

		it('should reject an API key without the "variable:create" scope', async () => {
			testServer.license.enable('feat:variables');
			const ownerWithoutScope = await createOwnerWithApiKey({ scopes: ['variable:list'] });

			const response = await testServer
				.publicApiAgentFor(ownerWithoutScope)
				.post('/variables')
				.send({ key: 'key', value: 'value' });

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});

		it('should create a variable linked to a project', async () => {
			testServer.license.enable('feat:variables');
			const variablePayload = { key: 'key', value: 'value', projectId: project.id };

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/variables')
				.send(variablePayload);

			expect(response.status).toBe(201);
			await expect(getVariableByIdOrFail(response.body.id)).resolves.toEqual(
				expect.objectContaining({
					key: 'key',
					value: 'value',
					project: expect.objectContaining({ id: project.id }),
				}),
			);
		});

		it('if not licensed, should reject', async () => {
			const variablePayload = { key: 'key', value: 'value' };

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/variables')
				.send(variablePayload);

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});
	});

	describe('PUT /variables/:id', () => {
		const variablePayload = { key: 'updatedKey', value: 'updatedValue' };
		let variable: Variables;
		beforeEach(async () => {
			variable = await createVariable();
		});

		it('should update a variable', async () => {
			testServer.license.enable('feat:variables');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/variables/${variable.id}`)
				.send(variablePayload);

			expect(response.status).toBe(204);
			const updatedVariable = await getVariableByIdOrFail(variable.id);
			expect(updatedVariable).toEqual(expect.objectContaining(variablePayload));
		});

		it('should move a variable to the global scope for a null projectId', async () => {
			testServer.license.enable('feat:variables');
			const projectVariable = await createProjectVariable('projectKey', 'projectValue', project);

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/variables/${projectVariable.id}`)
				.send({ ...variablePayload, projectId: null });

			expect(response.status).toBe(204);
			const updatedVariable = await getVariableByIdOrFail(projectVariable.id);
			expect(updatedVariable).toEqual(
				expect.objectContaining({ ...variablePayload, project: null }),
			);
		});

		it('should reject a read-only field', async () => {
			testServer.license.enable('feat:variables');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/variables/${variable.id}`)
				.send({ ...variablePayload, type: 'string' });

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty('message', 'request/body/type is read-only');
		});

		it('should answer 404 for an unknown variable', async () => {
			testServer.license.enable('feat:variables');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/variables/unknownId')
				.send(variablePayload);

			expect(response.status).toBe(404);
		});

		it('should update a variable to link it to a project', async () => {
			testServer.license.enable('feat:variables');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/variables/${variable.id}`)
				.send({ ...variablePayload, projectId: project.id });

			expect(response.status).toBe(204);
			const updatedVariable = await getVariableByIdOrFail(variable.id);
			expect(updatedVariable).toEqual(
				expect.objectContaining({
					...variablePayload,
					project: expect.objectContaining({ id: project.id }),
				}),
			);
		});

		it('if not licensed, should reject', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/variables/${variable.id}`)
				.send(variablePayload);

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});
	});

	describe('DELETE /variables/:id', () => {
		let variable: Variables;
		beforeEach(async () => {
			variable = await createVariable();
		});

		it('should delete a variable', async () => {
			testServer.license.enable('feat:variables');

			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/variables/${variable.id}`);

			expect(response.status).toBe(204);
			await expect(getVariableByIdOrFail(variable.id)).rejects.toThrow();
		});

		it('should answer 204 for an unknown variable', async () => {
			testServer.license.enable('feat:variables');

			const response = await testServer.publicApiAgentFor(owner).delete('/variables/unknownId');

			expect(response.status).toBe(204);
		});

		it('if not licensed, should reject', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/variables/${variable.id}`);

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});
	});
});
