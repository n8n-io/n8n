'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const feature_not_licensed_error_1 = require('@/errors/feature-not-licensed.error');
const users_1 = require('@test-integration/db/users');
const variables_1 = require('@test-integration/db/variables');
const utils_1 = require('@test-integration/utils');
describe('Variables in Public API', () => {
	let owner;
	const testServer = (0, utils_1.setupTestServer)({ endpointGroups: ['publicApi'] });
	const licenseErrorMessage = new feature_not_licensed_error_1.FeatureNotLicensedError(
		'feat:variables',
	).message;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
	});
	beforeEach(async () => {
		await backend_test_utils_1.testDb.truncate(['Variables', 'User']);
		owner = await (0, users_1.createOwnerWithApiKey)();
	});
	describe('GET /variables', () => {
		it('if licensed, should return all variables with pagination', async () => {
			testServer.license.enable('feat:variables');
			const variables = await Promise.all([
				(0, variables_1.createVariable)(),
				(0, variables_1.createVariable)(),
				(0, variables_1.createVariable)(),
			]);
			const response = await testServer.publicApiAgentFor(owner).get('/variables');
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
			const response = await testServer.publicApiAgentFor(owner).get('/variables');
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});
	});
	describe('POST /variables', () => {
		it('if licensed, should create a new variable', async () => {
			testServer.license.enable('feat:variables');
			const variablePayload = { key: 'key', value: 'value' };
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/variables')
				.send(variablePayload);
			expect(response.status).toBe(201);
			await expect((0, variables_1.getVariableByIdOrFail)(response.body.id)).resolves.toEqual(
				expect.objectContaining(variablePayload),
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
		let variable;
		beforeEach(async () => {
			variable = await (0, variables_1.createVariable)();
		});
		it('if licensed, should update a variable', async () => {
			testServer.license.enable('feat:variables');
			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/variables/${variable.id}`)
				.send(variablePayload);
			expect(response.status).toBe(204);
			const updatedVariable = await (0, variables_1.getVariableByIdOrFail)(variable.id);
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
		let variable;
		beforeEach(async () => {
			variable = await (0, variables_1.createVariable)();
		});
		it('if licensed, should delete a variable', async () => {
			testServer.license.enable('feat:variables');
			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/variables/${variable.id}`);
			expect(response.status).toBe(204);
			await expect((0, variables_1.getVariableByIdOrFail)(variable.id)).rejects.toThrow();
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
//# sourceMappingURL=variables.test.js.map
