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
});
