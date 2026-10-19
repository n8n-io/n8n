import type { TransactionRunner } from '@n8n/db';
import { QueryFailedError, type DataSource, type EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { ScimTokenConflictError } from '../../scim.errors';
import { ScimToken } from '../scim-token.entity';
import { ScimTokenRepository } from '../scim-token.repository';

describe('ScimTokenRepository', () => {
	const ctx = {};
	let manager: ReturnType<typeof mock<EntityManager>>;
	let transactionRunner: ReturnType<typeof mock<TransactionRunner>>;
	let repository: ScimTokenRepository;

	const uniqueViolation = () =>
		new QueryFailedError(
			'INSERT',
			[],
			Object.assign(new Error('UNIQUE constraint failed: scim_token.slot'), {
				code: 'SQLITE_CONSTRAINT_UNIQUE',
			}),
		);

	beforeEach(() => {
		manager = mock<EntityManager>();
		transactionRunner = mock<TransactionRunner>();
		// No ambient transaction, so the runner hands back the same context.
		transactionRunner.run.mockImplementation(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
			(async (c: any, fn: any) => await fn(c)) as any,
		);
		repository = new ScimTokenRepository(mock<DataSource>({ manager }), transactionRunner);
		manager.findOneByOrFail.mockResolvedValue(mock<ScimToken>({ tokenHash: 'new-hash' }));
	});

	const newToken = { tokenHash: 'new-hash', tokenHint: 'wxyz', createdById: 'user-1' };

	it('reads the one instance token', async () => {
		await repository.findInstanceToken(ctx);

		expect(manager.findOneBy).toHaveBeenCalledWith(ScimToken, { slot: 'instance' });
	});

	it('finds the token by its hash', async () => {
		await repository.findByTokenHash('a-hash', ctx);

		expect(manager.findOneBy).toHaveBeenCalledWith(ScimToken, { tokenHash: 'a-hash' });
	});

	it('revokes the instance token, whoever created it', async () => {
		await repository.deleteInstanceToken(ctx);

		expect(manager.delete).toHaveBeenCalledWith(ScimToken, { slot: 'instance' });
	});

	describe('replace', () => {
		it('replaces the expected token in one transaction', async () => {
			manager.delete.mockResolvedValue({ raw: [], affected: 1 });

			await repository.replace('old-hash', newToken, ctx);

			expect(transactionRunner.run).toHaveBeenCalledTimes(1);
			expect(manager.delete).toHaveBeenCalledWith(ScimToken, { tokenHash: 'old-hash' });
			expect(manager.insert).toHaveBeenCalledWith(ScimToken, newToken);
			expect(manager.findOneByOrFail).toHaveBeenCalledWith(ScimToken, { tokenHash: 'new-hash' });
		});

		it('creates the first token without a delete', async () => {
			await repository.replace(null, newToken, ctx);

			expect(manager.delete).not.toHaveBeenCalled();
			expect(manager.insert).toHaveBeenCalled();
		});

		it('fails with a conflict when another request replaced the expected token', async () => {
			manager.delete.mockResolvedValue({ raw: [], affected: 0 });

			await expect(repository.replace('old-hash', newToken, ctx)).rejects.toThrow(
				ScimTokenConflictError,
			);
			expect(manager.insert).not.toHaveBeenCalled();
		});

		it('fails with a conflict when another request created a token first', async () => {
			manager.insert.mockRejectedValue(uniqueViolation());

			await expect(repository.replace(null, newToken, ctx)).rejects.toThrow(ScimTokenConflictError);
		});

		it('propagates other insert failures', async () => {
			manager.insert.mockRejectedValue(new Error('db down'));

			await expect(repository.replace(null, newToken, ctx)).rejects.toThrow('db down');
		});
	});
});
