import type { Logger } from '@n8n/backend-common';
import { Person, type PersonRepository, type SettingsRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ChannelIdentityService, type ChannelActor } from '../channel-identity.service';

const actor: ChannelActor = { platform: 'slack', tenantId: 'T1', externalUserId: 'U1' };
const KEY = 'agents.channelIdentity.slack.T1.U1';

function person(overrides: Partial<Person> = {}): Person {
	return Object.assign(new Person(), {
		id: 'user-1',
		email: 'sam@example.com',
		disabled: false,
		isPending: false,
		...overrides,
	});
}

function setup() {
	const settings = mock<SettingsRepository>();
	settings.findByKey.mockResolvedValue(null);
	const people = mock<PersonRepository>();
	const service = new ChannelIdentityService(mock<Logger>(), settings, people);
	return { service, settings, people };
}

const emailOptions = (email?: { email: string; confirmed: boolean }) => ({
	emailLinking: true,
	lookupEmail: vi.fn().mockResolvedValue(email),
});

describe('ChannelIdentityService', () => {
	describe('a stored link', () => {
		it('returns the linked user and never reads the email', async () => {
			const { service, settings, people } = setup();
			settings.findByKey.mockResolvedValue({
				key: KEY,
				value: JSON.stringify({
					userId: 'user-1',
					linkedAt: '2026-01-01T00:00:00.000Z',
					method: 'email',
				}),
				loadOnStartup: false,
			});
			people.findByIdWithRole.mockResolvedValue(person());
			const options = emailOptions();

			await expect(service.resolve(actor, options)).resolves.toMatchObject({ id: 'user-1' });
			expect(options.lookupEmail).not.toHaveBeenCalled();
		});

		it('refuses a disabled user', async () => {
			const { service, settings, people } = setup();
			settings.findByKey.mockResolvedValue({
				key: KEY,
				value: JSON.stringify({ userId: 'user-1', linkedAt: 'x', method: 'explicit' }),
				loadOnStartup: false,
			});
			people.findByIdWithRole.mockResolvedValue(person({ disabled: true }));

			await expect(service.resolve(actor, emailOptions())).resolves.toBeNull();
		});

		it('treats a link to a deleted user as no link, and does not link by email', async () => {
			const { service, settings, people } = setup();
			settings.findByKey.mockResolvedValue({
				key: KEY,
				value: JSON.stringify({ userId: 'gone', linkedAt: 'x', method: 'email' }),
				loadOnStartup: false,
			});
			people.findByIdWithRole.mockResolvedValue(null);

			await expect(service.resolve(actor, emailOptions())).resolves.toBeNull();
			expect(people.findByEmailWithAuthIdentities).not.toHaveBeenCalled();
		});

		it('ignores a stored value that is not a link', async () => {
			const { service, settings } = setup();
			settings.findByKey.mockResolvedValue({ key: KEY, value: 'not json', loadOnStartup: false });

			await expect(
				service.resolve(actor, { emailLinking: false, lookupEmail: vi.fn() }),
			).resolves.toBeNull();
		});
	});

	describe('linking by email', () => {
		it('links a confirmed email to the n8n user with that email, and stores the link', async () => {
			const { service, settings, people } = setup();
			people.findByEmailWithAuthIdentities.mockResolvedValue(person());

			const user = await service.resolve(
				actor,
				emailOptions({ email: 'Sam@Example.com', confirmed: true }),
			);

			expect(user?.id).toBe('user-1');
			expect(people.findByEmailWithAuthIdentities).toHaveBeenCalledWith('sam@example.com');
			expect(settings.upsertByKey).toHaveBeenCalledWith(
				KEY,
				expect.stringContaining('"method":"email"'),
				false,
				{},
			);
		});

		it('does not link an email that the platform does not confirm', async () => {
			const { service, settings, people } = setup();

			await expect(
				service.resolve(actor, emailOptions({ email: 'sam@example.com', confirmed: false })),
			).resolves.toBeNull();
			expect(people.findByEmailWithAuthIdentities).not.toHaveBeenCalled();
			expect(settings.upsertByKey).not.toHaveBeenCalled();
		});

		it('does nothing when email linking is off', async () => {
			const { service, people } = setup();
			const lookupEmail = vi.fn();

			await expect(
				service.resolve(actor, { emailLinking: false, lookupEmail }),
			).resolves.toBeNull();
			expect(lookupEmail).not.toHaveBeenCalled();
			expect(people.findByEmailWithAuthIdentities).not.toHaveBeenCalled();
		});

		it.each([
			['a disabled user', { disabled: true }],
			['a pending invite', { isPending: true }],
		])('does not link %s', async (_name, overrides) => {
			const { service, settings, people } = setup();
			people.findByEmailWithAuthIdentities.mockResolvedValue(person(overrides));

			await expect(
				service.resolve(actor, emailOptions({ email: 'sam@example.com', confirmed: true })),
			).resolves.toBeNull();
			expect(settings.upsertByKey).not.toHaveBeenCalled();
		});

		it('returns no user when no n8n user has the email', async () => {
			const { service, people } = setup();
			people.findByEmailWithAuthIdentities.mockResolvedValue(null);

			await expect(
				service.resolve(actor, emailOptions({ email: 'sam@example.com', confirmed: true })),
			).resolves.toBeNull();
		});

		it('returns no user when the platform has no email', async () => {
			const { service } = setup();

			await expect(service.resolve(actor, emailOptions(undefined))).resolves.toBeNull();
		});

		it('returns no user when reading the email fails', async () => {
			const { service } = setup();

			await expect(
				service.resolve(actor, {
					emailLinking: true,
					lookupEmail: vi.fn().mockRejectedValue(new Error('slack down')),
				}),
			).resolves.toBeNull();
		});
	});

	describe('keys', () => {
		it('keeps links of different workspaces apart', async () => {
			const { service, settings } = setup();

			await service.link({ ...actor, tenantId: 'T2' }, 'user-1', 'explicit');

			expect(settings.upsertByKey).toHaveBeenCalledWith(
				'agents.channelIdentity.slack.T2.U1',
				expect.any(String),
				false,
				{},
			);
		});
	});
});
