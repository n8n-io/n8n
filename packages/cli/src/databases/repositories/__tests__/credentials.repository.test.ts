import { CredentialsEntity, CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { mockEntityManager } from '@test/mocking';

const entityManager = mockEntityManager(CredentialsEntity);
const repository = Container.get(CredentialsRepository);

describe('CredentialsRepository', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('findMany', () => {
		const credentialsId = 'cred_123';
		const credential = mock<CredentialsEntity>({ id: credentialsId });

		test('return `data` property if `includeData:true` and select is using the record syntax', async () => {
			// ARRANGE
			entityManager.find.mockResolvedValueOnce([credential]);

			// ACT
			const credentials = await repository.findMany({ includeData: true, select: { id: true } });

			// ASSERT
			expect(credentials).toHaveLength(1);
			expect(credentials[0]).toHaveProperty('data');
		});

		test('return `data` property if `includeData:true` and select is using the array syntax', async () => {
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

		test('should include isGlobal in default select', async () => {
			// ARRANGE
			entityManager.find.mockResolvedValueOnce([credential]);

			// ACT
			await repository.findMany();

			// ASSERT
			expect(entityManager.find).toHaveBeenCalledWith(
				CredentialsEntity,
				expect.objectContaining({
					select: expect.arrayContaining(['isGlobal']),
				}),
			);
		});
	});

	describe('findAllGlobalCredentials', () => {
		test('should find all global credentials without data by default', async () => {
			// ARRANGE
			const globalCred1 = mock<CredentialsEntity>({ id: 'global1', isGlobal: true });
			const globalCred2 = mock<CredentialsEntity>({ id: 'global2', isGlobal: true });
			entityManager.find.mockResolvedValueOnce([globalCred1, globalCred2]);

			// ACT
			const credentials = await repository.findAllGlobalCredentials();

			// ASSERT
			expect(entityManager.find).toHaveBeenCalledWith(
				CredentialsEntity,
				expect.objectContaining({
					where: expect.objectContaining({ isGlobal: true }),
					select: expect.arrayContaining([
						'id',
						'name',
						'type',
						'isManaged',
						'createdAt',
						'updatedAt',
						'isGlobal',
					]),
					relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				}),
			);
			expect(entityManager.find).toHaveBeenCalledWith(
				CredentialsEntity,
				expect.not.objectContaining({
					select: expect.arrayContaining(['data']),
				}),
			);
			expect(credentials).toHaveLength(2);
			expect(credentials).toEqual([globalCred1, globalCred2]);
		});

		test('should return empty array when no global credentials exist', async () => {
			// ARRANGE
			entityManager.find.mockResolvedValueOnce([]);

			// ACT
			const credentials = await repository.findAllGlobalCredentials();

			// ASSERT
			expect(credentials).toHaveLength(0);
		});

		test('should include shared relations for global credentials', async () => {
			// ARRANGE
			const globalCred = mock<CredentialsEntity>({
				id: 'global1',
				isGlobal: true,
				shared: [mock()],
			});
			entityManager.find.mockResolvedValueOnce([globalCred]);

			// ACT
			const credentials = await repository.findAllGlobalCredentials();

			// ASSERT
			expect(entityManager.find).toHaveBeenCalledWith(
				CredentialsEntity,
				expect.objectContaining({
					relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				}),
			);
			expect(credentials[0].shared).toBeDefined();
		});

		test('should include data when includeData is true', async () => {
			// ARRANGE
			const globalCred = mock<CredentialsEntity>({
				id: 'global1',
				isGlobal: true,
				data: 'encrypted-data',
			});
			entityManager.find.mockResolvedValueOnce([globalCred]);

			// ACT
			const credentials = await repository.findAllGlobalCredentials(true);

			// ASSERT
			expect(entityManager.find).toHaveBeenCalledWith(
				CredentialsEntity,
				expect.objectContaining({
					where: expect.objectContaining({ isGlobal: true }),
					select: expect.arrayContaining([
						'id',
						'name',
						'type',
						'isManaged',
						'createdAt',
						'updatedAt',
						'isGlobal',
						'data',
					]),
				}),
			);
			expect(credentials).toHaveLength(1);
			expect(credentials[0]).toHaveProperty('data');
		});

		test('should not include data when includeData is false', async () => {
			// ARRANGE
			const globalCred = mock<CredentialsEntity>({
				id: 'global1',
				isGlobal: true,
			});
			entityManager.find.mockResolvedValueOnce([globalCred]);

			// ACT
			const credentials = await repository.findAllGlobalCredentials(false);

			// ASSERT
			expect(entityManager.find).toHaveBeenCalledWith(
				CredentialsEntity,
				expect.not.objectContaining({
					select: expect.arrayContaining(['data']),
				}),
			);
			expect(credentials).toHaveLength(1);
		});
	});
});
