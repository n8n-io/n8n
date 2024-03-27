import { UserService } from '@/services/user.service';
import { HooksService } from '@/services/hooks.service';
import { User } from '@/databases/entities/User';
import { mockInstance } from '../../shared/mocking';
import { v4 as uuid } from 'uuid';

describe('HooksService', () => {
	const userService = mockInstance(UserService);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('hooksService.inviteUsers should call userService.inviteUsers', async () => {
		const hooksService = new HooksService(userService);
		const usersToInvite: Parameters<typeof userService.inviteUsers>[1] = [
			{ email: 'test@n8n.io', role: 'global:member' },
		];

		const mockUser = Object.assign(new User(), {
			id: uuid(),
			password: 'passwordHash',
			mfaEnabled: false,
			mfaSecret: 'test',
			mfaRecoveryCodes: ['test'],
			updatedAt: new Date(),
			authIdentities: [],
		});

		await hooksService.inviteUsers(mockUser, usersToInvite);
		expect(userService.inviteUsers).toHaveBeenCalledWith(mockUser, usersToInvite);
	});
});
