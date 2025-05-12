import type { User, Variables } from '@n8n/db';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { createOwnerWithApiKey } from '@test-integration/db/users';
import { createVariable, getVariableOrFail } from '@test-integration/db/variables';
import { setupTestServer } from '@test-integration/utils';

import * as testDb from '../shared/test-db';

describe('Variables in Public API', () => {
	let owner: User;
	const testServer = setupTestServer({ endpointGroups: ['publicApi'] });
	const licenseErrorMessage = new FeatureNotLicensedError('feat:variables').message;

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['Variables', 'User']);

		owner = await createOwnerWithApiKey();
	});

	describe('GET /variables', () => {
		it('if licensed, should return all variables with pagination', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');
			const variables = await Promise.all([createVariable(), createVariable(), createVariable()]);

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

			variables.forEach(({ id, key, value }) => {
				expect(response.body.data).toContainEqual(expect.objectContaining({ id, key, value }));
			});
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
			await expect(getVariableOrFail(response.body.id)).resolves.toEqual(
				expect.objectContaining(variablePayload),
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
			const updatedVariable = await getVariableOrFail(variable.id);
			expect(updatedVariable).toEqual(expect.objectContaining(variablePayload));
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
			await expect(getVariableOrFail(variable.id)).rejects.toThrow();
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
