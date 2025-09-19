import { CredentialsEntity, CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { mockEntityManager } from '@test/mocking';

const entityManager = mockEntityManager(CredentialsEntity);
const repository = Container.get(CredentialsRepository);

describe('findMany', () => {
	const credentialsId = 'cred_123';
	const credential = mock<CredentialsEntity>({ id: credentialsId });

	beforeEach(() => {
		jest.resetAllMocks();
	});

	test('return `data` property if `includeData:true` and select is using the record syntax', async () => {
		// ARRANGE
		entityManager.find.mockResolvedValueOnce([credential]);

		// ACT
		const credentials = await repository.findMany({ includeData: true, select: { id: true } });

		// ASSERT
		expect(credentials).toHaveLength(1);
		expect(credentials[0]).toHaveProperty('data');
	});

	test('return `data` property if `includeData:true` and select is using the record syntax', async () => {
		// ARRANGE
		entityManager.find.mockResolvedValueOnce([credential]);

		// ACT
		const credentials = await repository.findMany({
			includeData: true,
			//TODO: fix this
			// The function's type does not support this but this is what it
			// actually gets from the service because the middlewares are typed
			// loosely.
			select: ['id'] as never,
		});

		// ASSERT
		expect(credentials).toHaveLength(1);
		expect(credentials[0]).toHaveProperty('data');
	});
});
