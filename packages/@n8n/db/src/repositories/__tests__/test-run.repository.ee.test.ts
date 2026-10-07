import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { TestRun } from '../../entities';
import { TransactionRunner } from '../../services/transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { TestRunRepository } from '../test-run.repository.ee';

describe('TestRunRepository', () => {
	const entityManager = mockEntityManager(TestRun);
	Container.set(TransactionRunner, mock<TransactionRunner>());
	const testRunRepository = Container.get(TestRunRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('findByConfigAndVersions', () => {
		it('returns an empty list without querying for an empty versions list', async () => {
			const result = await testRunRepository.findByConfigAndVersions('cfg-1', []);

			expect(result).toEqual([]);
			expect(entityManager.find).not.toHaveBeenCalled();
		});

		it('finds runs for the config pinned to any of the given versions, newest first', async () => {
			const runs = [{ id: 'run-1' }] as TestRun[];
			entityManager.find.mockResolvedValueOnce(runs);

			const result = await testRunRepository.findByConfigAndVersions('cfg-1', ['v1', 'v2']);

			expect(entityManager.find).toHaveBeenCalledWith(TestRun, {
				where: { evaluationConfigId: 'cfg-1', workflowVersionId: In(['v1', 'v2']) },
				order: { createdAt: 'DESC' },
			});
			expect(result).toEqual(runs);
		});
	});
});
