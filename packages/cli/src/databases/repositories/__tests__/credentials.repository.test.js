'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const mocking_1 = require('@test/mocking');
const entityManager = (0, mocking_1.mockEntityManager)(db_1.CredentialsEntity);
const repository = di_1.Container.get(db_1.CredentialsRepository);
describe('findMany', () => {
	const credentialsId = 'cred_123';
	const credential = (0, jest_mock_extended_1.mock)({ id: credentialsId });
	beforeEach(() => {
		jest.resetAllMocks();
	});
	test('return `data` property if `includeData:true` and select is using the record syntax', async () => {
		entityManager.find.mockResolvedValueOnce([credential]);
		const credentials = await repository.findMany({ includeData: true, select: { id: true } });
		expect(credentials).toHaveLength(1);
		expect(credentials[0]).toHaveProperty('data');
	});
	test('return `data` property if `includeData:true` and select is using the record syntax', async () => {
		entityManager.find.mockResolvedValueOnce([credential]);
		const credentials = await repository.findMany({
			includeData: true,
			select: ['id'],
		});
		expect(credentials).toHaveLength(1);
		expect(credentials[0]).toHaveProperty('data');
	});
});
//# sourceMappingURL=credentials.repository.test.js.map
