/* eslint-disable @typescript-eslint/unbound-method */

import { Container } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { In } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import { ExecutionData } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { BATCH_SIZE, ExecutionDataRepository } from '../execution-data.repository';

describe('ExecutionDataRepository', () => {
	const entityManager = mockEntityManager(ExecutionData);
	const executionDataRepository = Container.get(ExecutionDataRepository);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('deleteMany', () => {
		test('should return early without opening a transaction when given no ids', async () => {
			await executionDataRepository.deleteMany([]);

			expect(entityManager.transaction).not.toHaveBeenCalled();
			expect(entityManager.delete).not.toHaveBeenCalled();
		});

		describe('without a caller transaction', () => {
			beforeEach(() => {
				entityManager.transaction.mockImplementation(async (fn: unknown) => {
					return await (fn as (em: typeof entityManager) => Promise<unknown>)(entityManager);
				});
			});

			test('should open its own transaction and delete the rows', async () => {
				const executionIds = ['1', '2', '3'];

				await executionDataRepository.deleteMany(executionIds);

				expect(entityManager.transaction).toHaveBeenCalledTimes(1);
				expect(entityManager.delete).toHaveBeenCalledTimes(1);
				expect(entityManager.delete).toHaveBeenCalledWith(ExecutionData, {
					executionId: In(executionIds),
				});
			});

			test('should chunk ids by BATCH_SIZE', async () => {
				const executionIds = Array.from({ length: BATCH_SIZE + 1 }, (_, i) => i.toString());

				await executionDataRepository.deleteMany(executionIds);

				expect(entityManager.transaction).toHaveBeenCalledTimes(1);
				expect(entityManager.delete).toHaveBeenCalledTimes(2);
				expect(entityManager.delete).toHaveBeenNthCalledWith(1, ExecutionData, {
					executionId: In(executionIds.slice(0, BATCH_SIZE)),
				});
				expect(entityManager.delete).toHaveBeenNthCalledWith(2, ExecutionData, {
					executionId: In(executionIds.slice(BATCH_SIZE)),
				});
			});
		});

		describe('with a caller transaction', () => {
			test("should delete on the caller's transaction without opening a new one", async () => {
				const tx = mock<EntityManager>();
				const executionIds = ['1', '2', '3'];

				await executionDataRepository.deleteMany(executionIds, tx);

				expect(entityManager.transaction).not.toHaveBeenCalled();
				expect(tx.delete).toHaveBeenCalledTimes(1);
				expect(tx.delete).toHaveBeenCalledWith(ExecutionData, {
					executionId: In(executionIds),
				});
			});

			test('should chunk ids by BATCH_SIZE', async () => {
				const tx = mock<EntityManager>();
				const executionIds = Array.from({ length: BATCH_SIZE + 1 }, (_, i) => i.toString());

				await executionDataRepository.deleteMany(executionIds, tx);

				expect(entityManager.transaction).not.toHaveBeenCalled();
				expect(tx.delete).toHaveBeenCalledTimes(2);
				expect(tx.delete).toHaveBeenNthCalledWith(1, ExecutionData, {
					executionId: In(executionIds.slice(0, BATCH_SIZE)),
				});
				expect(tx.delete).toHaveBeenNthCalledWith(2, ExecutionData, {
					executionId: In(executionIds.slice(BATCH_SIZE)),
				});
			});
		});
	});
});
