import type { User, UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { SlackEmailLookup } from '../slack-identity.service';
import { SlackIdentityService } from '../slack-identity.service';

describe('SlackIdentityService', () => {
	const emailLookup = mock<SlackEmailLookup>();
	const userRepository = mock<UserRepository>();
	const service = new SlackIdentityService(emailLookup, userRepository);

	const buildUser = (overrides: Partial<User>): User => Object.assign(mock<User>(), overrides);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('resolves a matching enabled user', async () => {
		emailLookup.getUserEmail.mockResolvedValue('a@acme.com');
		userRepository.findOne.mockResolvedValue(
			buildUser({ id: 'u1', disabled: false, password: 'hash' }),
		);

		await expect(service.resolve('xoxb', 'U1')).resolves.toEqual(
			expect.objectContaining({ id: 'u1' }),
		);
	});

	it('refuses when no n8n user has that email', async () => {
		emailLookup.getUserEmail.mockResolvedValue('nobody@x.com');
		userRepository.findOne.mockResolvedValue(null);

		await expect(service.resolve('xoxb', 'U1')).resolves.toBeNull();
	});

	it('refuses a disabled user', async () => {
		emailLookup.getUserEmail.mockResolvedValue('a@acme.com');
		userRepository.findOne.mockResolvedValue(
			buildUser({ id: 'u1', disabled: true, password: 'hash' }),
		);

		await expect(service.resolve('xoxb', 'U1')).resolves.toBeNull();
	});

	it('refuses a shell user who has never set a password', async () => {
		emailLookup.getUserEmail.mockResolvedValue('a@acme.com');
		userRepository.findOne.mockResolvedValue(
			buildUser({ id: 'u1', disabled: false, password: null }),
		);

		await expect(service.resolve('xoxb', 'U1')).resolves.toBeNull();
	});

	it('refuses when Slack returns no email', async () => {
		emailLookup.getUserEmail.mockResolvedValue(null);

		await expect(service.resolve('xoxb', 'U1')).resolves.toBeNull();
	});

	it('lowercases the email before matching', async () => {
		emailLookup.getUserEmail.mockResolvedValue('A@Acme.COM');
		userRepository.findOne.mockResolvedValue(
			buildUser({ id: 'u1', disabled: false, password: 'h' }),
		);

		await service.resolve('xoxb', 'U1');

		expect(userRepository.findOne).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ email: 'a@acme.com' }) }),
		);
	});
});
