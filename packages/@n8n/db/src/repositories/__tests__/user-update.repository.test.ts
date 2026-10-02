import type { EntityManager } from '@n8n/typeorm';

import { User } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { UserRepository } from '../user.repository';

describe('UserRepository updates', () => {
	const manager = mockEntityManager(User);
	const repository = new UserRepository(manager.connection);

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
		manager.transaction.mockImplementation(
			async (work) => await (work as unknown as (trx: EntityManager) => Promise<void>)(manager),
		);
		const user = Object.assign(new User(), { id: 'user', email: 'current@example.com' });
		manager.findOneOrFail.mockResolvedValue(user);

		await repository.updateProfileNames('user', { firstName: 'New' });

		expect(manager.findOneOrFail).toHaveBeenCalledWith(User, {
			where: { id: 'user' },
			lock: { mode: 'pessimistic_write' },
		});
		expect(manager.save).toHaveBeenCalledWith(User, user);
		expect(user).toMatchObject({ email: 'current@example.com', firstName: 'New' });
	});
});
