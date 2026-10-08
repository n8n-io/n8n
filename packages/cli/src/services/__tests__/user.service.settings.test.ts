import { mockInstance } from '@n8n/backend-test-utils';
import { UserRepository } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { UserService } from '@/services/user.service';

describe('UserService.updateSettings', () => {
	const userRepository = mockInstance(UserRepository);
	// Only the repository takes part in a settings update.
	const userService = new UserService(
		mock(),
		userRepository,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
	);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('merges the keys through the locked repository update in a new transaction', async () => {
		userRepository.updateSettingsLocked.mockResolvedValueOnce({
			isOnboarded: true,
			experienceMode: 'power',
		});

		await expect(
			userService.updateSettings('user-1', { experienceMode: 'power' }),
		).resolves.toBeUndefined();

		// An empty context makes the repository open its own transaction.
		expect(userRepository.updateSettingsLocked).toHaveBeenCalledWith(
			'user-1',
			{ experienceMode: 'power' },
			{},
		);
	});

	it('throws a not-found error when no user has the id', async () => {
		userRepository.updateSettingsLocked.mockResolvedValueOnce(null);

		const result = userService.updateSettings('missing', { isOnboarded: true });

		await expect(result).rejects.toThrow(NotFoundError);
		await expect(result).rejects.toThrow('User not found');
	});

	it('passes a database error on to the caller', async () => {
		const failure = new Error('database is locked');
		userRepository.updateSettingsLocked.mockRejectedValueOnce(failure);

		await expect(userService.updateSettings('user-1', { isOnboarded: true })).rejects.toBe(failure);
	});
});
