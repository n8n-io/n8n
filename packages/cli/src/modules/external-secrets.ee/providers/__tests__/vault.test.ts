import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';

import { ExternalSecretsConfig } from '../../external-secrets.config';
import { VaultProvider } from '../vault';
import { createFakeOutboundHttp, type Route } from './fake-outbound-http';

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

	// Use preferGet so list requests are plain GETs with `?list=true`.
	mockInstance(ExternalSecretsConfig, { preferGet: true });

	function createProvider(routes: Route[], settings = vaultSettings) {
		const { outboundHttp, httpRequest, requests } = createFakeOutboundHttp(routes);
		const provider = new VaultProvider(logger, outboundHttp);
		return { provider, httpRequest, requests, outboundHttp, settings };
	}

	async function initProvider(routes: Route[], settings = vaultSettings) {
		const ctx = createProvider(routes, settings);
		await ctx.provider.init(settings);
		return ctx;
	}

	describe('request wiring', () => {
		it('binds the client to the configured URL and a Vault header factory', async () => {
			const { requests } = await initProvider([]);

			expect(requests).toHaveBeenCalledWith({
				baseURL: VAULT_URL,
				headers: expect.any(Function),
				ssrf: 'disabled',
			});
		});

		it('sends the token header and resolves paths against the configured URL', async () => {
			const { provider, httpRequest } = await initProvider([
				{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: tokenLookupResponse() },
				{
					method: 'GET',
					pathname: '/v1/sys/mounts',
					body: mountsResponse({ 'secret/': { type: 'kv', options: { version: '2' } } }),
				},
			]);

			await provider.connect();

			const [options] = httpRequest.mock.calls[0];
			expect(options.url).toBe(`${VAULT_URL}auth/token/lookup-self`);
			expect(options.method).toBe('GET');
			expect(options.returnFullResponse).toBe(true);
			expect(options.headers).toMatchObject({ 'X-Vault-Token': 'test-token' });
			expect(options.headers).not.toHaveProperty('X-Vault-Namespace');
		});

		it('sends the namespace header when configured', async () => {
			const settings = {
				...vaultSettings,
				settings: { ...vaultSettings.settings, namespace: 'admin' },
			};
			const { provider, httpRequest } = await initProvider(
				[
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: tokenLookupResponse() },
					{
						method: 'GET',
						pathname: '/v1/sys/mounts',
						body: mountsResponse({ 'secret/': { type: 'kv', options: { version: '2' } } }),
					},
				],
				settings,
			);

			await provider.connect();

			const [options] = httpRequest.mock.calls[0];
			expect(options.headers).toMatchObject({
				'X-Vault-Namespace': 'admin',
				'X-Vault-Token': 'test-token',
			});
		});

		it('logs in with username/password and maps the JSON body', async () => {
			const settings = {
				...vaultSettings,
				settings: {
					...vaultSettings.settings,
					authMethod: 'usernameAndPassword',
					username: 'alice',
					password: 's3cret',
				},
			};
			const { provider, httpRequest } = await initProvider(
				[
					{
						method: 'POST',
						pathname: '/v1/auth/userpass/login/alice',
						body: { auth: { client_token: 'issued-token' } },
					},
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: tokenLookupResponse() },
					{
						method: 'GET',
						pathname: '/v1/sys/mounts',
						body: mountsResponse({ 'secret/': { type: 'kv', options: { version: '2' } } }),
					},
				],
				settings,
			);

			await provider.connect();

			const loginCall = httpRequest.mock.calls
				.map(([options]) => options)
				.find((options) => options.url.endsWith('/auth/userpass/login/alice'));
			expect(loginCall).toMatchObject({
				method: 'POST',
				body: { password: 's3cret' },
				json: true,
			});
			expect(provider.state).toBe('connected');
		});

		it('uses the LIST verb when preferGet is disabled', async () => {
			mockInstance(ExternalSecretsConfig, { preferGet: false });

			const { provider, httpRequest } = await initProvider(
				[
					{ method: 'LIST', pathname: '/v1/secret/metadata/', body: { data: { keys: ['app'] } } },
					{
						method: 'GET',
						pathname: '/v1/secret/data/app',
						body: kvV2SecretResponse({ password: 'hunter2' }),
					},
				],
				vaultSettingsWithKvPath('secret/', '2'),
			);

			await provider.update();

			const listCall = httpRequest.mock.calls
				.map(([options]) => options)
				.find((options) => options.url.includes('/secret/metadata/'));
			expect(listCall?.method).toBe('LIST');
			expect(provider.getSecret('secret')).toEqual({ app: { password: 'hunter2' } });

			mockInstance(ExternalSecretsConfig, { preferGet: true });
		});
	});

	describe('update', () => {
		it('should cache secrets from a valid KV v2 mount', async () => {
			const { provider } = await initProvider([
				{
					method: 'GET',
					pathname: '/v1/sys/mounts',
					body: mountsResponse({ 'secret/': { type: 'kv', options: { version: '2' } } }),
				},
				{ method: 'GET', pathname: '/v1/secret/metadata/', body: { data: { keys: ['myapp'] } } },
				{
					method: 'GET',
					pathname: '/v1/secret/data/myapp',
					body: kvV2SecretResponse({ password: 'hunter2' }),
				},
			]);

			await provider.update();

			expect(provider.getSecret('secret')).toEqual({ myapp: { password: 'hunter2' } });
			expect(provider.hasSecret('secret')).toBe(true);
			expect(provider.getSecretNames()).toContain('secret.myapp.password');
		});

		it('should skip mounts created without an explicit KV version', async () => {
			const { provider } = await initProvider([
				{
					method: 'GET',
					pathname: '/v1/sys/mounts',
					body: mountsResponse({
						'bad-mount/': { type: 'kv', options: { version: null } },
						'secret/': { type: 'kv', options: { version: '2' } },
					}),
				},
				{ method: 'GET', pathname: '/v1/secret/metadata/', body: { data: { keys: ['myapp'] } } },
				{
					method: 'GET',
					pathname: '/v1/secret/data/myapp',
					body: kvV2SecretResponse({ password: 'hunter2' }),
				},
			]);

			await provider.update();

			expect(provider.hasSecret('bad-mount')).toBe(false);
			expect(provider.getSecret('secret')).toEqual({ myapp: { password: 'hunter2' } });
		});

		it('should skip mounts the token lacks permission to read', async () => {
			const { provider } = await initProvider([
				{
					method: 'GET',
					pathname: '/v1/sys/mounts',
					body: mountsResponse({ 'forbidden/': { type: 'kv', options: { version: '2' } } }),
				},
				{ method: 'GET', pathname: '/v1/forbidden/metadata/', status: 403, body: { errors: [] } },
			]);

			await provider.update();

			expect(provider.hasSecret('forbidden')).toBe(false);
			expect(provider.getSecretNames()).toHaveLength(0);
		});
	});

	describe('update with manual KV path', () => {
		it('should load secrets from a manually configured KV v2 path', async () => {
			const { provider } = await initProvider(
				[
					{ method: 'GET', pathname: '/v1/secret/metadata/', body: { data: { keys: ['myapp'] } } },
					{
						method: 'GET',
						pathname: '/v1/secret/data/myapp',
						body: kvV2SecretResponse({ password: 'hunter2' }),
					},
				],
				vaultSettingsWithKvPath('secret/', '2'),
			);

			await provider.update();

			expect(provider.getSecret('secret')).toEqual({ myapp: { password: 'hunter2' } });
			expect(provider.getSecretNames()).toContain('secret.myapp.password');
		});

		it('should load secrets from a manually configured KV v1 path', async () => {
			const { provider } = await initProvider(
				[
					{ method: 'GET', pathname: '/v1/kv/', body: { data: { keys: ['myapp'] } } },
					{ method: 'GET', pathname: '/v1/kv/myapp', body: { data: { password: 'hunter2' } } },
				],
				vaultSettingsWithKvPath('kv/', '1'),
			);

			await provider.update();

			expect(provider.getSecret('kv')).toEqual({ myapp: { password: 'hunter2' } });
			expect(provider.getSecretNames()).toContain('kv.myapp.password');
		});

		it('should append trailing slash to mount path when missing', async () => {
			const { provider } = await initProvider(
				[
					{ method: 'GET', pathname: '/v1/secret/metadata/', body: { data: { keys: ['myapp'] } } },
					{
						method: 'GET',
						pathname: '/v1/secret/data/myapp',
						body: kvV2SecretResponse({ password: 'hunter2' }),
					},
				],
				vaultSettingsWithKvPath('secret', '2'),
			);

			await provider.update();

			expect(provider.getSecret('secret')).toEqual({ myapp: { password: 'hunter2' } });
		});

		it('should return no secrets when the configured KV path returns 403', async () => {
			const { provider } = await initProvider(
				[{ method: 'GET', pathname: '/v1/secret/metadata/', status: 403, body: { errors: [] } }],
				vaultSettingsWithKvPath('secret/', '2'),
			);

			await provider.update();

			expect(provider.hasSecret('secret')).toBe(false);
			expect(provider.getSecretNames()).toHaveLength(0);
		});
	});

	describe('test with auto-discovery', () => {
		it('should validate access to sys/mounts when no manual KV path is configured', async () => {
			const { provider } = await initProvider([
				{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: tokenLookupResponse() },
				{
					method: 'GET',
					pathname: '/v1/sys/mounts',
					body: mountsResponse({ 'secret/': { type: 'kv', options: { version: '2' } } }),
				},
			]);

			const [success] = await provider.test();

			expect(success).toBe(true);
		});

		it('should return error when token lacks access to sys/mounts', async () => {
			const { provider } = await initProvider([
				{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: tokenLookupResponse() },
				{ method: 'GET', pathname: '/v1/sys/mounts', status: 403, body: { errors: [] } },
			]);

			const [success, message] = await provider.test();

			expect(success).toBe(false);
			expect(message).toBe(
				"Couldn't list mounts. Please give these credentials 'read' access to sys/mounts.",
			);
		});

		it('should return error when sys/mounts returns an unexpected status', async () => {
			const { provider } = await initProvider([
				{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: tokenLookupResponse() },
				{ method: 'GET', pathname: '/v1/sys/mounts', status: 500, body: { errors: [] } },
			]);

			const [success, message] = await provider.test();

			expect(success).toBe(false);
			expect(message).toBe(
				"Couldn't list mounts but it wasn't a permissions issue. Please consult your Vault admin.",
			);
		});

		it('should report invalid credentials when token lookup fails', async () => {
			const { provider } = await initProvider([
				{ method: 'GET', pathname: '/v1/auth/token/lookup-self', status: 403, body: {} },
			]);

			const [success, message] = await provider.test();

			expect(success).toBe(false);
			expect(message).toBe('Invalid credentials');
		});

		it('should hint about the auth path when token lookup returns 404', async () => {
			const { provider } = await initProvider([
				{ method: 'GET', pathname: '/v1/auth/token/lookup-self', status: 404, body: {} },
			]);

			const [success, message] = await provider.test();

			expect(success).toBe(false);
			expect(message).toBe(
				'Could not find auth path. Try adding /v1/ to the end of your base URL.',
			);
		});

		it('should report connection refused without a status', async () => {
			const { provider } = await initProvider([
				{ method: 'GET', pathname: '/v1/auth/token/lookup-self', networkError: 'ECONNREFUSED' },
			]);

			const [success, message] = await provider.test();

			expect(success).toBe(false);
			expect(message).toBe(
				'Connection refused. Please check the host and port of the server are correct.',
			);
		});
	});

	describe('test with manual KV path', () => {
		it('should validate access to the configured KV path instead of sys/mounts', async () => {
			const { provider } = await initProvider(
				[
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: tokenLookupResponse() },
					{ method: 'GET', pathname: '/v1/secret/metadata/', body: { data: { keys: [] } } },
				],
				vaultSettingsWithKvPath('secret/', '2'),
			);

			const [success] = await provider.test();

			expect(success).toBe(true);
		});

		it('should treat 404 as success for an empty KV mount', async () => {
			const { provider } = await initProvider(
				[
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: tokenLookupResponse() },
					{ method: 'GET', pathname: '/v1/secret/metadata/', status: 404, body: { errors: [] } },
				],
				vaultSettingsWithKvPath('secret/', '2'),
			);

			const [success] = await provider.test();

			expect(success).toBe(true);
		});

		it('should return error when token lacks access to the configured KV path', async () => {
			const { provider } = await initProvider(
				[
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: tokenLookupResponse() },
					{ method: 'GET', pathname: '/v1/secret/metadata/', status: 403, body: { errors: [] } },
				],
				vaultSettingsWithKvPath('secret/', '2'),
			);

			const [success, message] = await provider.test();

			expect(success).toBe(false);
			expect(message).toBe('Permission denied accessing secret/. Check your token policies.');
		});

		it('should return error when configured KV path returns an unexpected status', async () => {
			const { provider } = await initProvider(
				[
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: tokenLookupResponse() },
					{ method: 'GET', pathname: '/v1/secret/metadata/', status: 500, body: { errors: [] } },
				],
				vaultSettingsWithKvPath('secret/', '2'),
			);

			const [success, message] = await provider.test();

			expect(success).toBe(false);
			expect(message).toBe('Could not access KV mount at secret/ (status 500).');
		});

		it('should validate KV v1 path without metadata segment', async () => {
			const { provider } = await initProvider(
				[
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: tokenLookupResponse() },
					{ method: 'GET', pathname: '/v1/kv/', body: { data: { keys: [] } } },
				],
				vaultSettingsWithKvPath('kv/', '1'),
			);

			const [success] = await provider.test();

			expect(success).toBe(true);
		});
	});
});
