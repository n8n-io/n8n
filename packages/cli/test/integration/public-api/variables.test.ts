import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import type { Project, User, Variables } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { createMemberWithApiKey, createOwnerWithApiKey } from '@test-integration/db/users';
import {
	createProjectVariable,
	createVariable,
	getVariableByIdOrFail,
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
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');
			const variables = await Promise.all([
				createVariable(),
				createVariable(),
				createVariable(),
				createProjectVariable('projectKey', 'projectValue', project),
			]);

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).get('/variables');

			/**
			 * Assert
			 */
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

		it('should be able to filter variables by projectId and state', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');
			await Promise.all([
				createVariable(),
				createProjectVariable('projectKey', 'projectValue', project),
				createProjectVariable('emptyVar', '', project),
				createVariable('emptyVar', ''),
			]);

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/variables')
				.query({ projectId: project.id, state: 'empty' });

			/**
			 * Assert
			 */
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
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');
			const globalVariable = await createVariable();
			await createProjectVariable('projectKey', 'projectValue', project);

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/variables')
				.query({ projectId: 'null' });

			/**
			 * Assert
			 */
			expect(response.status).toBe(200);
			expect(response.body.data).toHaveLength(1);
			expect(response.body.data[0]).toEqual(
				expect.objectContaining({ id: globalVariable.id, key: globalVariable.key, project: null }),
			);
		});

		it('should clamp a limit above the maximum instead of rejecting it', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');
			await createVariable();

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/variables')
				.query({ limit: 1000 });

			/**
			 * Assert
			 */
			expect(response.status).toBe(200);
			expect(response.body.data).toHaveLength(1);
		});

		it('should only return the documented variable fields', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');
			await createVariable();
			await createProjectVariable('projectKey', 'projectValue', project);

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).get('/variables');

			/**
			 * Assert
			 */
			expect(response.status).toBe(200);
			expect(response.body.data).toHaveLength(2);
			for (const variable of response.body.data) {
				expect(Object.keys(variable).sort()).toEqual(['id', 'key', 'project', 'type', 'value']);
				if (variable.project !== null) {
					// Same nine fields `GET /workflows` publishes for a nested project.
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
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');
			// A stored icon can carry a `color` the entity type does not name.
			const icon = { type: 'emoji', value: '🚀', color: '#ff0000' } as Project['icon'];
			await Container.get(ProjectRepository).update(project.id, { icon });
			await createProjectVariable('projectKey', 'projectValue', project);

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).get('/variables');

			/**
			 * Assert
			 */
			expect(response.status).toBe(200);
			expect(response.body.data).toHaveLength(1);
			expect(response.body.data[0].project.icon).toEqual(icon);
		});

		it('should paginate with an opaque cursor', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');
			await Promise.all([createVariable(), createVariable(), createVariable()]);

			/**
			 * Act
			 */
			const first = await testServer.publicApiAgentFor(owner).get('/variables').query({ limit: 2 });
			const second = await testServer
				.publicApiAgentFor(owner)
				.get('/variables')
				.query({ cursor: first.body.nextCursor });

			/**
			 * Assert
			 */
			expect(first.status).toBe(200);
			expect(first.body.data).toHaveLength(2);
			expect(first.body.nextCursor).not.toBeNull();
			expect(second.status).toBe(200);
			expect(second.body.data).toHaveLength(1);
			expect(second.body.nextCursor).toBeNull();
		});

		it('should reject a non-numeric limit', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/variables')
				.query({ limit: 'abc' });

			/**
			 * Assert
			 */
			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty(
				'message',
				'request/query/limit Param `limit` must be a valid integer',
			);
		});

		it('should reject an invalid cursor', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/variables')
				.query({ cursor: 'not-a-cursor' });

			/**
			 * Assert
			 */
			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty('message', 'An invalid cursor was provided');
		});

		it('should reject an API key without the "variable:list" scope', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');
			const ownerWithoutScope = await createOwnerWithApiKey({ scopes: ['variable:create'] });
			await createVariable();

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(ownerWithoutScope).get('/variables');

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});

		it('if not licensed, should reject', async () => {
			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).get('/variables');

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});

		it('should not return variables from projects the user is not a member of', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');
			const member = await createMemberWithApiKey();

			const memberProject = await createTeamProject('Member Project');
			await linkUserToProject(member, memberProject, 'project:admin');
			const otherProject = await createTeamProject('Other Project');

			const memberVar = await createProjectVariable('memberKey', 'memberValue', memberProject);
			await createProjectVariable('secretKey', 'secretValue', otherProject);

			/**
			 * Act
			 */
			const allResponse = await testServer.publicApiAgentFor(member).get('/variables');

			/**
			 * Assert
			 */
			expect(allResponse.status).toBe(200);
			const returnedIds = allResponse.body.data.map((v: Variables) => v.id);
			expect(returnedIds).toContain(memberVar.id);
			expect(allResponse.body.data).toHaveLength(1);

			/**
			 * Act
			 */
			const crossProjectResponse = await testServer
				.publicApiAgentFor(member)
				.get('/variables')
				.query({ projectId: otherProject.id });

			/**
			 * Assert
			 */
			expect(crossProjectResponse.status).toBe(200);
			expect(crossProjectResponse.body.data).toHaveLength(0);
		});
	});

	describe('POST /variables', () => {
		it('should create a new variable', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');
			const variablePayload = { key: 'key', value: 'value' };

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/variables')
				.send(variablePayload);

			/**
			 * Assert
			 */
			expect(response.status).toBe(201);
			await expect(getVariableByIdOrFail(response.body.id)).resolves.toEqual(
				expect.objectContaining(variablePayload),
			);
		});

		it('should create a variable linked to a project', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');
			const variablePayload = { key: 'key', value: 'value', projectId: project.id };

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/variables')
				.send(variablePayload);

			/**
			 * Assert
			 */
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
			/**
			 * Arrange
			 */
			const variablePayload = { key: 'key', value: 'value' };

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/variables')
				.send(variablePayload);

			/**
			 * Assert
			 */
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
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/variables/${variable.id}`);

			/**
			 * Assert
			 */
			expect(response.status).toBe(204);
			await expect(getVariableByIdOrFail(variable.id)).rejects.toThrow();
		});

		it('if not licensed, should reject', async () => {
			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/variables/${variable.id}`);

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});
	});
});
