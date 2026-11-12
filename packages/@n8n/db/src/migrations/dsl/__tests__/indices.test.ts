import type { QueryRunner } from '@n8n/typeorm';
import { TypeORMError } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { CreateIndex, DropIndex } from '../indices';

describe('Index operations', () => {
	it('should reject when creating the index fails', async () => {
		const queryRunner = mock<QueryRunner>();
		queryRunner.createIndex.mockRejectedValue(new Error('index exists'));

		await expect(
			new CreateIndex('test_table', ['name'], false, 'n8n_', queryRunner),
		).rejects.toThrow('index exists');
	});

	it('should reject when dropping a missing index', async () => {
		const queryRunner = mock<QueryRunner>();
		queryRunner.dropIndex.mockRejectedValue(new TypeORMError('Supplied index was not found'));

		await expect(new DropIndex('test_table', ['name'], 'n8n_', queryRunner)).rejects.toThrow(
			'not found',
		);
	});

	it('should resolve when dropping a missing index with skipIfMissing', async () => {
		const queryRunner = mock<QueryRunner>();
		queryRunner.dropIndex.mockRejectedValue(new TypeORMError('Supplied index was not found'));

		await expect(
			new DropIndex('test_table', ['name'], 'n8n_', queryRunner, undefined, true),
		).resolves.toBeUndefined();
	});
});
