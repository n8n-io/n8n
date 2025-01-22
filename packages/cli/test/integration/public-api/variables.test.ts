import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { createOwnerWithApiKey } from '@test-integration/db/users';
import { createVariable, getVariableOrFail } from '@test-integration/db/variables';
import { setupTestServer } from '@test-integration/utils';

import * as testDb from '../shared/test-db';

describe('Variables in Public API', () => {
	const testServer = setupTestServer({ endpointGroups: ['publicApi'] });

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['Variables', 'User']);
	});

	describe('GET /variables', () => {
		it('if licensed, should return all variables with pagination', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');
			const owner = await createOwnerWithApiKey();
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
			 * Arrange
			 */

			const owner = await createOwnerWithApiKey();

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).get('/variables');

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new FeatureNotLicensedError('feat:variables').message,
			);
		});
	});

	describe('POST /variables', () => {
		it('if licensed, should create a new variable', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');
			const owner = await createOwnerWithApiKey();
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
			const owner = await createOwnerWithApiKey();
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
			expect(response.body).toHaveProperty(
				'message',
				new FeatureNotLicensedError('feat:variables').message,
			);
		});
	});

	describe('DELETE /variables/:id', () => {
		it('if licensed, should delete a variable', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:variables');
			const owner = await createOwnerWithApiKey();
			const variable = await createVariable();

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
			 * Arrange
			 */
			const owner = await createOwnerWithApiKey();
			const variable = await createVariable();

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
			expect(response.body).toHaveProperty(
				'message',
				new FeatureNotLicensedError('feat:variables').message,
			);
		});
	});
});
