import { mock } from 'vitest-mock-extended';

import { User } from '../../entities';
import type { TransactionRunner } from '../../services/transaction';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { UserRepository } from '../user.repository';

describe('UserRepository updates', () => {
	const manager = mockEntityManager(User);
	const runner = mock<TransactionRunner>();
	const repository = new UserRepository(manager.connection, runner);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('changes only MFA columns when disabling MFA', async () => {
		vi.spyOn(repository, 'findOneByOrFail').mockResolvedValue(new User());
		manager.update.mockResolvedValue({ raw: [], generatedMaps: [], affected: 1 });

		await repository.disableMfa('user');

		expect(manager.update).toHaveBeenCalledWith(
			User,
			{ id: 'user' },
			{ mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: [] },
		);
	});

	it('changes only MFA credentials when setting them', async () => {
		vi.spyOn(repository, 'findOneByOrFail').mockResolvedValue(new User());
		manager.update.mockResolvedValue({ raw: [], generatedMaps: [], affected: 1 });

		await repository.setMfaCredentials('user', 'secret', ['code']);

		expect(manager.update).toHaveBeenCalledWith(
			User,
			{ id: 'user' },
			{ mfaSecret: 'secret', mfaRecoveryCodes: ['code'] },
		);
	});

	it('locks and reloads the user before saving profile names', async () => {
		Object.assign(manager.connection, { options: { type: 'postgres' } });
		const ctx = { trx: new TypeOrmTransaction(manager) };
		runner.run.mockImplementation(async (context, work) => await work(context));
		const user = Object.assign(new User(), { id: 'user', email: 'current@example.com' });
		manager.findOneOrFail.mockResolvedValue(user);

		await repository.updateProfileNames('user', { firstName: 'New' }, ctx);

		expect(runner.run).toHaveBeenCalledWith(ctx, expect.any(Function));
		expect(manager.transaction).not.toHaveBeenCalled();
		expect(manager.findOneOrFail).toHaveBeenCalledWith(User, {
			where: { id: 'user' },
			lock: { mode: 'pessimistic_write' },
		});
		expect(manager.save).toHaveBeenCalledWith(User, user);
		expect(user).toMatchObject({ email: 'current@example.com', firstName: 'New' });
	});
});
