import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import type { Project, User, Variables } from '@n8n/db';
import { createOwnerWithApiKey } from '@test-integration/db/users';
import {
	createProjectVariable,
	createVariable,
	getVariableByIdOrFail,
} from '@test-integration/db/variables';
import { setupTestServer } from '@test-integration/utils';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';

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
		it('if licensed, should return all variables with pagination', async () => {
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

		it('if licensed, should be able to filter variables by projectId and state', async () => {
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
	});

	describe('POST /variables', () => {
		it('if licensed, should create a new variable', async () => {
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

		it('if licensed, should create a variable linked to a project', async () => {
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

		it('if licensed, should update a variable', async () => {
			testServer.license.enable('feat:variables');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/variables/${variable.id}`)
				.send(variablePayload);

			expect(response.status).toBe(204);
			const updatedVariable = await getVariableByIdOrFail(variable.id);
			expect(updatedVariable).toEqual(expect.objectContaining(variablePayload));
		});

		it('if licensed, should update a variable to link it to a project', async () => {
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

		it('if licensed, should delete a variable', async () => {
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
