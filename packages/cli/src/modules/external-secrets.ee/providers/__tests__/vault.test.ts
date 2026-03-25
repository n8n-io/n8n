import { mockInstance } from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import nock from 'nock';

import { ExternalSecretsConfig } from '../../external-secrets.config';
import { VaultProvider } from '../vault';

const VAULT_BASE_URL = 'https://vault.test.com';
const VAULT_URL = `${VAULT_BASE_URL}/v1/`;

const vaultSettings = {
	connected: true,
	connectedAt: new Date(),
	settings: {
		url: VAULT_URL,
		authMethod: 'token',
		token: 'test-token',
		renewToken: false,
		namespace: '',
		username: '',
		password: '',
		roleId: '',
		secretId: '',
	},
};

function vaultSettingsWithKvPath(kvMountPath: string, kvVersion: string) {
	return {
		...vaultSettings,
		settings: {
			...vaultSettings.settings,
			kvMountPath,
			kvVersion,
		},
	};
}

function tokenLookupResponse() {
	return {
		data: {
			accessor: 'test',
			creation_time: 0,
			creation_ttl: 0,
			display_name: 'test',
			entity_id: '',
			expire_time: null,
			explicit_max_ttl: 0,
			id: 'test-token',
			issue_time: '',
			meta: {},
			num_uses: 0,
			orphan: false,
			path: 'auth/token/create',
			policies: ['default'],
			ttl: 0,
			renewable: false,
			type: 'service',
		},
	};
}

function mountsResponse(mounts: Record<string, object>) {
	return { data: mounts };
}

function kvV2SecretResponse(data: Record<string, unknown>) {
	return { data: { data } };
}

describe('VaultProvider', () => {
	const logger = mockInstance(Logger);
	logger.scoped.mockReturnValue(logger);

	// Use preferGet so nock can intercept GET requests instead of custom LIST method
	mockInstance(ExternalSecretsConfig, { preferGet: true });

	beforeAll(() => {
		nock.disableNetConnect();
	});

	beforeEach(() => {
		nock.cleanAll();
	});

	afterAll(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	describe('update', () => {
		it('should cache secrets from a valid KV v2 mount', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettings);

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/sys/mounts')
				.reply(200, mountsResponse({ 'secret/': { type: 'kv', options: { version: '2' } } }))
				.get('/v1/secret/metadata/?list=true')
				.reply(200, { data: { keys: ['myapp'] } })
				.get('/v1/secret/data/myapp')
				.reply(200, kvV2SecretResponse({ password: 'hunter2' }));

			await provider.update();

			expect(provider.getSecret('secret')).toEqual({ myapp: { password: 'hunter2' } });
			expect(provider.hasSecret('secret')).toBe(true);
			expect(provider.getSecretNames()).toContain('secret.myapp.password');
			scope.done();
		});

		it('should skip inaccessible mounts that return null metadata', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettings);

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/sys/mounts')
				.reply(
					200,
					mountsResponse({
						'inaccessible/': { type: 'kv', options: null },
						'secret/': { type: 'kv', options: { version: '2' } },
					}),
				)
				.get('/v1/secret/metadata/?list=true')
				.reply(200, { data: { keys: ['myapp'] } })
				.get('/v1/secret/data/myapp')
				.reply(200, kvV2SecretResponse({ password: 'hunter2' }));

			await provider.update();

			expect(provider.hasSecret('inaccessible')).toBe(false);
			expect(provider.getSecret('secret')).toEqual({ myapp: { password: 'hunter2' } });
			scope.done();
		});

		it('should skip mounts created without an explicit KV version', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettings);

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/sys/mounts')
				.reply(
					200,
					mountsResponse({
						'bad-mount/': { type: 'kv', options: { version: null } },
						'secret/': { type: 'kv', options: { version: '2' } },
					}),
				)
				.get('/v1/secret/metadata/?list=true')
				.reply(200, { data: { keys: ['myapp'] } })
				.get('/v1/secret/data/myapp')
				.reply(200, kvV2SecretResponse({ password: 'hunter2' }));

			await provider.update();

			expect(provider.hasSecret('bad-mount')).toBe(false);
			expect(provider.getSecret('secret')).toEqual({ myapp: { password: 'hunter2' } });
			scope.done();
		});

		it('should skip mounts with incomplete configuration', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettings);

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/sys/mounts')
				.reply(
					200,
					mountsResponse({
						'no-version/': { type: 'kv', options: {} },
						'secret/': { type: 'kv', options: { version: '2' } },
					}),
				)
				.get('/v1/secret/metadata/?list=true')
				.reply(200, { data: { keys: ['myapp'] } })
				.get('/v1/secret/data/myapp')
				.reply(200, kvV2SecretResponse({ password: 'hunter2' }));

			await provider.update();

			expect(provider.hasSecret('no-version')).toBe(false);
			expect(provider.getSecret('secret')).toEqual({ myapp: { password: 'hunter2' } });
			scope.done();
		});

		it('should skip mounts the token lacks permission to read', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettings);

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/sys/mounts')
				.reply(
					200,
					mountsResponse({
						'forbidden/': { type: 'kv', options: { version: '2' } },
					}),
				)
				.get('/v1/forbidden/metadata/?list=true')
				.reply(403, { errors: ['permission denied'] });

			await provider.update();

			expect(provider.hasSecret('forbidden')).toBe(false);
			expect(provider.getSecretNames()).toHaveLength(0);
			scope.done();
		});
	});

	describe('update with manual KV path', () => {
		it('should load secrets from a manually configured KV v2 path', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettingsWithKvPath('secret/', '2'));

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/secret/metadata/?list=true')
				.reply(200, { data: { keys: ['myapp'] } })
				.get('/v1/secret/data/myapp')
				.reply(200, kvV2SecretResponse({ password: 'hunter2' }));

			await provider.update();

			expect(provider.getSecret('secret')).toEqual({ myapp: { password: 'hunter2' } });
			expect(provider.hasSecret('secret')).toBe(true);
			expect(provider.getSecretNames()).toContain('secret.myapp.password');
			scope.done();
		});

		it('should load secrets from a manually configured KV v1 path', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettingsWithKvPath('kv/', '1'));

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/kv/?list=true')
				.reply(200, { data: { keys: ['myapp'] } })
				.get('/v1/kv/myapp')
				.reply(200, { data: { password: 'hunter2' } });

			await provider.update();

			expect(provider.getSecret('kv')).toEqual({ myapp: { password: 'hunter2' } });
			expect(provider.hasSecret('kv')).toBe(true);
			expect(provider.getSecretNames()).toContain('kv.myapp.password');
			scope.done();
		});

		it('should append trailing slash to mount path when missing', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettingsWithKvPath('secret', '2'));

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/secret/metadata/?list=true')
				.reply(200, { data: { keys: ['myapp'] } })
				.get('/v1/secret/data/myapp')
				.reply(200, kvV2SecretResponse({ password: 'hunter2' }));

			await provider.update();

			expect(provider.getSecret('secret')).toEqual({ myapp: { password: 'hunter2' } });
			scope.done();
		});

		it('should return no secrets when the configured KV path returns 403', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettingsWithKvPath('secret/', '2'));

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/secret/metadata/?list=true')
				.reply(403, { errors: ['permission denied'] });

			await provider.update();

			expect(provider.hasSecret('secret')).toBe(false);
			expect(provider.getSecretNames()).toHaveLength(0);
			scope.done();
		});
	});

	describe('test with auto-discovery', () => {
		it('should validate access to sys/mounts when no manual KV path is configured', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettings);

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/auth/token/lookup-self')
				.reply(200, tokenLookupResponse())
				.get('/v1/sys/mounts')
				.reply(200, mountsResponse({ 'secret/': { type: 'kv', options: { version: '2' } } }));

			const [success] = await provider.test();

			expect(success).toBe(true);
			scope.done();
		});

		it('should return error when token lacks access to sys/mounts', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettings);

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/auth/token/lookup-self')
				.reply(200, tokenLookupResponse())
				.get('/v1/sys/mounts')
				.reply(403, { errors: ['permission denied'] });

			const [success, message] = await provider.test();

			expect(success).toBe(false);
			expect(message).toBe(
				"Couldn't list mounts. Please give these credentials 'read' access to sys/mounts.",
			);
			scope.done();
		});

		it('should return error when sys/mounts returns an unexpected status', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettings);

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/auth/token/lookup-self')
				.reply(200, tokenLookupResponse())
				.get('/v1/sys/mounts')
				.reply(500, { errors: ['internal error'] });

			const [success, message] = await provider.test();

			expect(success).toBe(false);
			expect(message).toBe(
				"Couldn't list mounts but it wasn't a permissions issue. Please consult your Vault admin.",
			);
			scope.done();
		});
	});

	describe('test with manual KV path', () => {
		it('should validate access to the configured KV path instead of sys/mounts', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettingsWithKvPath('secret/', '2'));

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/auth/token/lookup-self')
				.reply(200, tokenLookupResponse())
				.get('/v1/secret/metadata/?list=true')
				.reply(200, { data: { keys: [] } });

			const [success] = await provider.test();

			expect(success).toBe(true);
			scope.done();
		});

		it('should treat 404 as success for an empty KV mount', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettingsWithKvPath('secret/', '2'));

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/auth/token/lookup-self')
				.reply(200, tokenLookupResponse())
				.get('/v1/secret/metadata/?list=true')
				.reply(404, { errors: [] });

			const [success] = await provider.test();

			expect(success).toBe(true);
			scope.done();
		});

		it('should return error when token lacks access to the configured KV path', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettingsWithKvPath('secret/', '2'));

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/auth/token/lookup-self')
				.reply(200, tokenLookupResponse())
				.get('/v1/secret/metadata/?list=true')
				.reply(403, { errors: ['permission denied'] });

			const [success, message] = await provider.test();

			expect(success).toBe(false);
			expect(message).toBe('Permission denied accessing secret/. Check your token policies.');
			scope.done();
		});

		it('should return error when configured KV path returns an unexpected status', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettingsWithKvPath('secret/', '2'));

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/auth/token/lookup-self')
				.reply(200, tokenLookupResponse())
				.get('/v1/secret/metadata/?list=true')
				.reply(500, { errors: ['internal error'] });

			const [success, message] = await provider.test();

			expect(success).toBe(false);
			expect(message).toBe('Could not access KV mount at secret/ (status 500).');
			scope.done();
		});

		it('should validate KV v1 path without metadata segment', async () => {
			const provider = new VaultProvider(logger);
			await provider.init(vaultSettingsWithKvPath('kv/', '1'));

			const scope = nock(VAULT_BASE_URL)
				.get('/v1/auth/token/lookup-self')
				.reply(200, tokenLookupResponse())
				.get('/v1/kv/?list=true')
				.reply(200, { data: { keys: [] } });

			const [success] = await provider.test();

			expect(success).toBe(true);
			scope.done();
		});
	});
});
