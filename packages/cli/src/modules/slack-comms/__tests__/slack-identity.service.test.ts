import type { User, UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { SlackUserLookup } from '../slack-identity.service';
import { SlackIdentityService } from '../slack-identity.service';

describe('SlackIdentityService', () => {
	const userLookup = mock<SlackUserLookup>();
	const userRepository = mock<UserRepository>();
	const service = new SlackIdentityService(userLookup, userRepository);

	const buildUser = (overrides: Partial<User>): User => Object.assign(mock<User>(), overrides);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('resolves a matching enabled user, alongside their timezone', async () => {
		userLookup.getUserInfo.mockResolvedValue({ email: 'a@acme.com', tz: 'Europe/Lisbon' });
		userRepository.findOne.mockResolvedValue(
			buildUser({ id: 'u1', disabled: false, password: 'hash' }),
		);

		await expect(service.resolve('xoxb', 'U1')).resolves.toEqual({
			user: expect.objectContaining({ id: 'u1' }),
			tz: 'Europe/Lisbon',
		});
	});

	it('resolves with a null timezone when Slack has none', async () => {
		userLookup.getUserInfo.mockResolvedValue({ email: 'a@acme.com', tz: null });
		userRepository.findOne.mockResolvedValue(
			buildUser({ id: 'u1', disabled: false, password: 'hash' }),
		);

		await expect(service.resolve('xoxb', 'U1')).resolves.toEqual({
			user: expect.objectContaining({ id: 'u1' }),
			tz: null,
		});
	});

	it('refuses when no n8n user has that email', async () => {
		userLookup.getUserInfo.mockResolvedValue({ email: 'nobody@x.com', tz: null });
		userRepository.findOne.mockResolvedValue(null);

		await expect(service.resolve('xoxb', 'U1')).resolves.toBeNull();
	});

	it('refuses a disabled user', async () => {
		userLookup.getUserInfo.mockResolvedValue({ email: 'a@acme.com', tz: null });
		userRepository.findOne.mockResolvedValue(
			buildUser({ id: 'u1', disabled: true, password: 'hash' }),
		);

		await expect(service.resolve('xoxb', 'U1')).resolves.toBeNull();
	});

	it('refuses a shell user who has never set a password', async () => {
		userLookup.getUserInfo.mockResolvedValue({ email: 'a@acme.com', tz: null });
		userRepository.findOne.mockResolvedValue(
			buildUser({ id: 'u1', disabled: false, password: null }),
		);

		await expect(service.resolve('xoxb', 'U1')).resolves.toBeNull();
	});

	it('refuses when Slack returns no email', async () => {
		userLookup.getUserInfo.mockResolvedValue({ email: null, tz: 'Europe/Lisbon' });

		await expect(service.resolve('xoxb', 'U1')).resolves.toBeNull();
	});

	it('lowercases the email before matching', async () => {
		userLookup.getUserInfo.mockResolvedValue({ email: 'A@Acme.COM', tz: null });
		userRepository.findOne.mockResolvedValue(
			buildUser({ id: 'u1', disabled: false, password: 'h' }),
		);

		await service.resolve('xoxb', 'U1');

		expect(userRepository.findOne).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ email: 'a@acme.com' }) }),
		);
	});
});
