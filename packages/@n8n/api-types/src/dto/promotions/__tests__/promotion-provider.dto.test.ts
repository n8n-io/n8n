import {
	CreatePromotionProviderDto,
	PromotionProviderListPublicDto,
	PromotionProviderPublicDto,
	UpdatePromotionProviderDto,
} from '../promotion-provider.dto';

const provider = { name: 'Staging', type: 'git' as const };
const sshAuth = { authType: 'ssh-key' as const };
const tokenAuth = { authType: 'token' as const, username: 'git-user', password: 'secret' };

const timestamp = '2026-09-07T08:00:00.000Z';
const publicProvider = {
	...provider,
	id: 'prov-1',
	authType: 'ssh-key' as const,
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
		const result = CreatePromotionProviderDto.safeParse({ ...provider, auth: sshAuth });

		if (!result.success) throw result.error;
		expect(result.data.auth).toEqual({ authType: 'ssh-key', keyType: 'ed25519' });
	});

	it('trims the username but stores the password as sent', () => {
		const result = CreatePromotionProviderDto.safeParse({
			...provider,
			auth: { ...tokenAuth, username: '  git-user  ', password: '  secret  ' },
		});

		if (!result.success) throw result.error;
		expect(result.data.auth).toEqual({
			authType: 'token',
			username: 'git-user',
			password: '  secret  ',
		});
	});

	// The auth type lives inside `auth`, so credentials cannot be paired with
	// another auth type's fields.
	it('rejects an auth payload that mixes the two auth types', () => {
		expect(
			CreatePromotionProviderDto.safeParse({
				...provider,
				auth: { ...tokenAuth, keyType: 'rsa' },
			}).success,
		).toBe(false);
		expect(
			CreatePromotionProviderDto.safeParse({
				...provider,
				auth: { authType: 'ssh-key', username: 'git-user', password: 'secret' },
			}).success,
		).toBe(false);
	});

	it('rejects an auth payload with no auth type or no credentials', () => {
		expect(CreatePromotionProviderDto.safeParse({ ...provider, auth: {} }).success).toBe(false);
		expect(
			CreatePromotionProviderDto.safeParse({ ...provider, auth: { authType: 'token' } }).success,
		).toBe(false);
		expect(
			CreatePromotionProviderDto.safeParse({
				...provider,
				auth: { authType: 'token', username: 'git-user' },
			}).success,
		).toBe(false);
	});

	it('rejects a blank name, an over-long name, and a blank password', () => {
		expect(
			CreatePromotionProviderDto.safeParse({ ...provider, name: ' ', auth: tokenAuth }).success,
		).toBe(false);
		expect(
			CreatePromotionProviderDto.safeParse({
				...provider,
				name: 'a'.repeat(129),
				auth: tokenAuth,
			}).success,
		).toBe(false);
		expect(
			CreatePromotionProviderDto.safeParse({
				...provider,
				auth: { ...tokenAuth, password: '' },
			}).success,
		).toBe(false);
	});

	it('rejects a top-level auth type and a config', () => {
		expect(
			CreatePromotionProviderDto.safeParse({ ...provider, authType: 'token', auth: tokenAuth })
				.success,
		).toBe(false);
		expect(
			CreatePromotionProviderDto.safeParse({
				...provider,
				auth: sshAuth,
				config: { schemaVersion: 1, publicKey: 'ssh-ed25519 AAAAKEY', keyType: 'ed25519' },
			}).success,
		).toBe(false);
	});
});

describe('UpdatePromotionProviderDto', () => {
	it('rejects an empty update', () => {
		expect(UpdatePromotionProviderDto.safeParse({}).success).toBe(false);
	});

	it('keeps the stored credentials when auth is omitted', () => {
		expect(UpdatePromotionProviderDto.safeParse({ name: 'Renamed' }).success).toBe(true);
	});

	it('leaves the key type unset, so a rotation can keep the current algorithm', () => {
		const result = UpdatePromotionProviderDto.safeParse({ auth: sshAuth });

		if (!result.success) throw result.error;
		expect(result.data.auth).toEqual({ authType: 'ssh-key' });
	});

	it('still requires both credentials for a token provider', () => {
		expect(UpdatePromotionProviderDto.safeParse({ auth: { authType: 'token' } }).success).toBe(
			false,
		);
		expect(UpdatePromotionProviderDto.safeParse({ auth: tokenAuth }).success).toBe(true);
	});

	it('rejects a change to the provider type or the config', () => {
		expect(UpdatePromotionProviderDto.safeParse({ type: 'git' }).success).toBe(false);
		expect(UpdatePromotionProviderDto.safeParse({ config: { schemaVersion: 1 } }).success).toBe(
			false,
		);
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
