import {
	CreatePromotionProviderDto,
	PromotionProviderListPublicDto,
	PromotionProviderPublicDto,
	UpdatePromotionProviderDto,
	promotionGitAuthInputSchemas,
	promotionGitAuthUpdateSchemas,
} from '../promotion-provider.dto';

const sshProvider = { name: 'Staging', type: 'git' as const, authType: 'ssh-key' as const };
const tokenProvider = { name: 'Staging', type: 'git' as const, authType: 'token' as const };
const credentials = { username: 'git-user', password: 'secret' };

const timestamp = '2026-09-07T08:00:00.000Z';
const publicProvider = {
	...sshProvider,
	id: 'prov-1',
	config: {
		schemaVersion: 1 as const,
		publicKey: 'ssh-ed25519 AAAAKEY',
		keyType: 'ed25519' as const,
	},
	createdAt: timestamp,
	updatedAt: timestamp,
};

describe('CreatePromotionProviderDto', () => {
	it('defaults an SSH key type to ed25519', () => {
		const result = CreatePromotionProviderDto.safeParse({ ...sshProvider, auth: {} });

		if (!result.success) throw result.error;
		expect(result.data.auth).toEqual({ keyType: 'ed25519' });
	});

	it('trims the username but stores the password as sent', () => {
		const result = CreatePromotionProviderDto.safeParse({
			...tokenProvider,
			auth: { username: '  git-user  ', password: '  secret  ' },
		});

		if (!result.success) throw result.error;
		expect(result.data.auth).toEqual({ username: 'git-user', password: '  secret  ' });
	});

	it('rejects a blank name, an over-long name, and a blank password', () => {
		expect(
			CreatePromotionProviderDto.safeParse({ ...tokenProvider, name: ' ', auth: credentials })
				.success,
		).toBe(false);
		expect(
			CreatePromotionProviderDto.safeParse({
				...tokenProvider,
				name: 'a'.repeat(129),
				auth: credentials,
			}).success,
		).toBe(false);
		expect(
			CreatePromotionProviderDto.safeParse({
				...tokenProvider,
				auth: { username: 'git-user', password: '' },
			}).success,
		).toBe(false);
	});

	it('rejects a config, because the backend generates the key material', () => {
		expect(
			CreatePromotionProviderDto.safeParse({
				...sshProvider,
				auth: {},
				config: { schemaVersion: 1, publicKey: 'ssh-ed25519 AAAAKEY', keyType: 'ed25519' },
			}).success,
		).toBe(false);
	});
});

describe('UpdatePromotionProviderDto', () => {
	it('keeps the stored credentials when auth is omitted', () => {
		expect(UpdatePromotionProviderDto.safeParse({ name: 'Renamed' }).success).toBe(true);
	});

	it('leaves the key type unset, so a rotation can keep the current algorithm', () => {
		const result = UpdatePromotionProviderDto.safeParse({ auth: {} });

		if (!result.success) throw result.error;
		expect(result.data.auth).toEqual({});
	});

	it('rejects a change to the type, the auth type, or the config', () => {
		expect(UpdatePromotionProviderDto.safeParse({ type: 'git' }).success).toBe(false);
		expect(UpdatePromotionProviderDto.safeParse({ authType: 'token' }).success).toBe(false);
		expect(UpdatePromotionProviderDto.safeParse({ config: { schemaVersion: 1 } }).success).toBe(
			false,
		);
	});
});

// The DTO unions cannot see the auth type, so the service parses `auth` again
// with the schema these maps hold for it.
describe('auth schemas per auth type', () => {
	it('rejects an empty payload for a token provider, on create and on update', () => {
		expect(promotionGitAuthInputSchemas.token.safeParse({}).success).toBe(false);
		expect(promotionGitAuthUpdateSchemas.token.safeParse({}).success).toBe(false);
	});

	it('rejects credentials sent to an ssh-key provider', () => {
		expect(promotionGitAuthInputSchemas['ssh-key'].safeParse(credentials).success).toBe(false);
		expect(promotionGitAuthUpdateSchemas['ssh-key'].safeParse(credentials).success).toBe(false);
	});

	it('requires a username and a password together', () => {
		expect(promotionGitAuthInputSchemas.token.safeParse({ username: 'git-user' }).success).toBe(
			false,
		);
		expect(promotionGitAuthInputSchemas.token.safeParse({ password: 'secret' }).success).toBe(
			false,
		);
		expect(promotionGitAuthInputSchemas.token.safeParse(credentials).success).toBe(true);
	});
});

describe('provider responses', () => {
	it('leaves out the encrypted credentials', () => {
		const result = PromotionProviderPublicDto.safeParse({ ...publicProvider, auth: 'encrypted' });

		if (!result.success) throw result.error;
		expect(result.data).not.toHaveProperty('auth');
	});

	it('drops the public key from list rows', () => {
		const result = PromotionProviderListPublicDto.safeParse({
			data: [publicProvider],
			nextCursor: null,
		});

		if (!result.success) throw result.error;
		expect(result.data.data[0]).not.toHaveProperty('config');
		expect(JSON.stringify(result.data)).not.toContain('AAAAKEY');
	});
});
