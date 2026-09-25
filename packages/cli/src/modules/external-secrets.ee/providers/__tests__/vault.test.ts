import { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import { createFakeOutboundHttp, type Route } from '@n8n/backend-network/testing';
import { mockInstance } from '@n8n/backend-test-utils';
import type { IHttpRequestOptions } from 'n8n-workflow';

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

function vaultSettingsWithKvPath(kvMountPath: string, kvVersion: string, kvSecretPath?: string) {
	return {
		...vaultSettings,
		settings: {
			...vaultSettings.settings,
			kvMountPath,
			kvVersion,
			kvSecretPath,
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
	mockInstance(ExternalSecretsConfig, { preferGet: true, connectTimeout: 20, refreshTimeout: 45 });

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		mockInstance(ExternalSecretsConfig, {
			preferGet: true,
			connectTimeout: 20,
			refreshTimeout: 45,
		});
	});

	function createProvider(routes: Route[], settings = vaultSettings) {
		const { outboundHttp, httpRequest, requests } = createFakeOutboundHttp(
			routes,
			vi.fn as unknown as Parameters<typeof createFakeOutboundHttp>[1],
		);
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
				useDefaultSsrfPolicy: 'unsafe',
				timeout: 45_000,
			});
		});

		it('rejects a malformed URL at init time', async () => {
			const settings = {
				...vaultSettings,
				settings: { ...vaultSettings.settings, url: 'not-a-valid-url' },
			};
			const ctx = createProvider([], settings);

			await expect(ctx.provider.init(settings)).rejects.toThrow();
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

		it('logs username/password authentication failures while preserving error state', async () => {
			const settings = {
				...vaultSettings,
				settings: {
					...vaultSettings.settings,
					authMethod: 'usernameAndPassword',
					username: 'alice',
					password: 's3cret',
				},
			};
			const { provider } = await initProvider(
				[
					{
						method: 'POST',
						pathname: '/v1/auth/userpass/login/alice',
						status: 401,
						body: { errors: [] },
					},
				],
				settings,
			);

			await provider.connect();

			expect(provider.state).toBe('error');
			expect(logger.warn).toHaveBeenCalledWith(
				'Vault provider username/password authentication failed',
				expect.objectContaining({
					operation: 'connect',
					authMethod: 'usernameAndPassword',
					providerName: 'vault',
					statusCode: 401,
				}),
			);
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

		it('should fail the pull when a secret read breaks at the transport', async () => {
			const { provider } = await initProvider([
				{
					method: 'GET',
					pathname: '/v1/sys/mounts',
					body: mountsResponse({ 'secret/': { type: 'kv', options: { version: '2' } } }),
				},
				{ method: 'GET', pathname: '/v1/secret/metadata/', body: { data: { keys: ['myapp'] } } },
				{ method: 'GET', pathname: '/v1/secret/data/myapp', networkError: 'ECONNREFUSED' },
			]);

			await expect(provider.update()).rejects.toThrow();
			expect(provider.hasSecret('secret')).toBe(false);
		});

		it('should drain every mount before a broken mount fails the pull', async () => {
			let releaseSlowRead!: () => void;
			const slowRead = new Promise<void>((resolve) => {
				releaseSlowRead = resolve;
			});
			const request = vi.fn(async (options: IHttpRequestOptions) => {
				if (options.url === 'sys/mounts') {
					return mountsResponse({
						'a/': { type: 'kv', options: { version: '2' } },
						'b/': { type: 'kv', options: { version: '2' } },
					});
				}
				if (options.url.includes('/metadata/')) return { data: { keys: ['x'] } };
				if (options.url.startsWith('a/')) {
					const error = new Error('connect ECONNREFUSED') as Error & { code: string };
					error.code = 'ECONNREFUSED';
					throw error;
				}
				await slowRead;
				return kvV2SecretResponse({ password: 'hunter2' });
			});
			const outboundHttp = { requests: () => ({ request }) } as unknown as OutboundHttp;
			const provider = new VaultProvider(logger, outboundHttp);
			await provider.init(vaultSettings);

			let settled = false;
			const pull = provider.update();
			pull.then(
				() => (settled = true),
				() => (settled = true),
			);
			await new Promise((resolve) => setImmediate(resolve));
			expect(settled).toBe(false);

			releaseSlowRead();
			await expect(pull).rejects.toThrow('connect ECONNREFUSED');
		});

		it('should read at most 50 secrets at a time', async () => {
			let inFlight = 0;
			let maxInFlight = 0;
			const request = vi.fn(async (options: IHttpRequestOptions) => {
				if (options.url.includes('/metadata/')) {
					return { data: { keys: Array.from({ length: 120 }, (_, i) => `s${i}`) } };
				}
				inFlight++;
				maxInFlight = Math.max(maxInFlight, inFlight);
				await new Promise((resolve) => setImmediate(resolve));
				inFlight--;
				return kvV2SecretResponse({ password: 'hunter2' });
			});
			const outboundHttp = { requests: () => ({ request }) } as unknown as OutboundHttp;
			const settings = vaultSettingsWithKvPath('secret/', '2');
			const provider = new VaultProvider(logger, outboundHttp);
			await provider.init(settings);

			await provider.update();

			expect(maxInFlight).toBe(50);
			expect(provider.getSecretNames()).toHaveLength(120);
		});

		it('should keep the existing key shape for nested folders', async () => {
			const { provider } = await initProvider([
				{
					method: 'GET',
					pathname: '/v1/sys/mounts',
					body: mountsResponse({ 'secret/': { type: 'kv', options: { version: '2' } } }),
				},
				{ method: 'GET', pathname: '/v1/secret/metadata/', body: { data: { keys: ['team/'] } } },
				{
					method: 'GET',
					pathname: '/v1/secret/metadata/team/',
					body: { data: { keys: ['app/'] } },
				},
				{
					method: 'GET',
					pathname: '/v1/secret/metadata/team/app/',
					body: { data: { keys: ['db'] } },
				},
				{
					method: 'GET',
					pathname: '/v1/secret/data/team/app/db',
					body: kvV2SecretResponse({ password: 'hunter2' }),
				},
			]);

			await provider.update();

			expect(provider.getSecret('secret')).toEqual({
				team: { 'team/app': { db: { password: 'hunter2' } } },
			});
			expect(provider.getSecretNames()).toContain('secret.team.team/app.db.password');
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
			expect(logger.debug).toHaveBeenCalledWith(
				'Vault provider failed to list KV secrets',
				expect.objectContaining({
					operation: 'update',
					mountPath: 'forbidden/',
					kvVersion: '2',
					vaultApiPath: 'forbidden/metadata/?list=true',
					statusCode: 403,
				}),
			);
		});

		it('should log and rethrow full update failures', async () => {
			const { provider } = await initProvider([
				{ method: 'GET', pathname: '/v1/sys/mounts', status: 500, body: { errors: [] } },
			]);

			await expect(provider.update()).rejects.toThrow('Request failed with status 500');

			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to update Vault provider secrets',
				expect.objectContaining({
					operation: 'update',
					providerName: 'vault',
					statusCode: 500,
				}),
			);
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

	describe('update with manual KV secret path', () => {
		it('should list and read a KV v2 sub-path after the metadata and data segments', async () => {
			const { provider } = await initProvider(
				[
					{
						method: 'GET',
						pathname: '/v1/example-kv/metadata/my-app/',
						body: { data: { keys: ['db', 'api/'] } },
					},
					{
						method: 'GET',
						pathname: '/v1/example-kv/data/my-app/db',
						body: kvV2SecretResponse({ password: 'hunter2' }),
					},
					{
						method: 'GET',
						pathname: '/v1/example-kv/metadata/my-app/api/',
						body: { data: { keys: ['token'] } },
					},
					{
						method: 'GET',
						pathname: '/v1/example-kv/data/my-app/api/token',
						body: kvV2SecretResponse({ value: 'abc' }),
					},
				],
				vaultSettingsWithKvPath('example-kv', '2', '/my-app/'),
			);

			await provider.update();

			expect(provider.getSecret('example-kv')).toEqual({
				'my-app': { db: { password: 'hunter2' }, api: { token: { value: 'abc' } } },
			});
			expect(provider.getSecretNames()).toEqual(
				expect.arrayContaining([
					'example-kv.my-app.db.password',
					'example-kv.my-app.api.token.value',
				]),
			);
		});

		it('should normalize the sub-path and nest each segment under the mount name', async () => {
			const { provider } = await initProvider(
				[
					{
						method: 'GET',
						pathname: '/v1/example-kv/metadata/team/app/',
						body: { data: { keys: ['db'] } },
					},
					{
						method: 'GET',
						pathname: '/v1/example-kv/data/team/app/db',
						body: kvV2SecretResponse({ password: 'hunter2' }),
					},
				],
				vaultSettingsWithKvPath('example-kv', '2', ' team//app '),
			);

			await provider.update();

			expect(provider.getSecret('example-kv')).toEqual({
				team: { app: { db: { password: 'hunter2' } } },
			});
			expect(provider.getSecretNames()).toContain('example-kv.team.app.db.password');
		});

		it('should read a KV v1 sub-path without a metadata segment', async () => {
			const { provider } = await initProvider(
				[
					{ method: 'GET', pathname: '/v1/kv/my-app/', body: { data: { keys: ['db'] } } },
					{ method: 'GET', pathname: '/v1/kv/my-app/db', body: { data: { password: 'hunter2' } } },
				],
				vaultSettingsWithKvPath('kv/', '1', 'my-app'),
			);

			await provider.update();

			expect(provider.getSecret('kv')).toEqual({ 'my-app': { db: { password: 'hunter2' } } });
			expect(provider.getSecretNames()).toContain('kv.my-app.db.password');
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
			expect(logger.warn).toHaveBeenCalledWith(
				'Vault provider test failed',
				expect.objectContaining({
					operation: 'test',
					vaultApiPath: 'auth/token/lookup-self',
					errorCode: 'ECONNREFUSED',
				}),
			);
		});

		it('logs connect failures with the connection test failure message', async () => {
			const { provider } = await initProvider([
				{ method: 'GET', pathname: '/v1/auth/token/lookup-self', status: 404, body: {} },
			]);

			await provider.connect();

			expect(provider.state).toBe('error');
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to connect Vault provider',
				expect.objectContaining({
					operation: 'connect',
					authMethod: 'token',
					providerName: 'vault',
				}),
			);
		});
	});

	describe('token refresh', () => {
		const appRoleSettings = {
			...vaultSettings,
			settings: {
				...vaultSettings.settings,
				authMethod: 'appRole',
				roleId: 'test-role',
				secretId: 'test-secret',
				kvMountPath: 'secret/',
				kvVersion: '2',
			},
		};

		function batchTokenLookupResponse(id: string, expireTime: string) {
			return {
				data: {
					...tokenLookupResponse().data,
					id,
					path: 'auth/approle/login',
					type: 'batch',
					creation_ttl: 1800,
					ttl: 1800,
					expire_time: expireTime,
				},
			};
		}

		it('authenticates with AppRole and reads secrets using a batch token', async () => {
			const token = batchTokenLookupResponse(
				'batch-token',
				new Date(Date.now() + 30 * 60 * 1000).toISOString(),
			);
			const { provider, httpRequest } = await initProvider(
				[
					{
						method: 'POST',
						pathname: '/v1/auth/approle/login',
						body: { auth: { client_token: 'batch-token' } },
					},
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: token },
					{ method: 'GET', pathname: '/v1/secret/metadata/', body: { data: { keys: ['app'] } } },
					{
						method: 'GET',
						pathname: '/v1/secret/data/app',
						body: kvV2SecretResponse({ value: 'available' }),
					},
				],
				appRoleSettings,
			);
			try {
				await provider.connect();
				await provider.update();

				expect(provider.state).toBe('connected');
				expect(provider.getSecret('secret')).toEqual({ app: { value: 'available' } });
				expect(httpRequest.mock.calls[0][0]).toMatchObject({
					method: 'POST',
					body: { role_id: 'test-role', secret_id: 'test-secret' },
				});
				expect(httpRequest.mock.calls.at(-1)?.[0].headers).toMatchObject({
					'X-Vault-Token': 'batch-token',
				});
			} finally {
				await provider.disconnect();
			}
		});

		it('reauthenticates with AppRole when a batch token expires', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-09-24T10:43:51Z'));
			const expiresAt = Date.now() + 30 * 60 * 1000;
			let replacementTokenIssued = false;
			const firstToken = batchTokenLookupResponse('batch-token', new Date(expiresAt).toISOString());
			const nextToken = batchTokenLookupResponse(
				'replacement-token',
				new Date(Date.now() + 60 * 60 * 1000).toISOString(),
			);
			const { provider, httpRequest } = await initProvider(
				[
					{
						method: 'POST',
						pathname: '/v1/auth/approle/login',
						body: { auth: { client_token: 'batch-token' } },
					},
					{
						method: 'POST',
						pathname: '/v1/auth/approle/login',
						get body() {
							replacementTokenIssued = true;
							return { auth: { client_token: 'replacement-token' } };
						},
					},
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: firstToken },
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: firstToken },
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: nextToken },
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: nextToken },
					{
						method: 'GET',
						pathname: '/v1/secret/metadata/',
						get status() {
							return Date.now() >= expiresAt && !replacementTokenIssued ? 403 : 200;
						},
						body: { data: { keys: ['app'] } },
					},
					{
						method: 'GET',
						pathname: '/v1/secret/data/app',
						body: kvV2SecretResponse({ value: 'available' }),
					},
				],
				appRoleSettings,
			);
			try {
				await provider.connect();
				await provider.update();
				expect(provider.getSecret('secret')).toEqual({ app: { value: 'available' } });

				// LIGO-1209: An AppRole batch token needs a new login when its TTL ends.
				await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
				await provider.update();

				const loginCalls = httpRequest.mock.calls.filter(
					([options]) => options.url === `${VAULT_URL}auth/approle/login`,
				);
				expect(loginCalls).toHaveLength(2);
				expect(httpRequest.mock.calls.at(-1)?.[0].headers).toMatchObject({
					'X-Vault-Token': 'replacement-token',
				});
				expect(provider.getSecret('secret')).toEqual({ app: { value: 'available' } });
			} finally {
				await provider.disconnect();
				vi.useRealTimers();
			}
		});

		it('keeps one renewal timer across reconnects and drops it once the token is not renewable', async () => {
			const renewable = {
				data: {
					...tokenLookupResponse().data,
					renewable: true,
					expire_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
				},
			};
			const { provider } = await initProvider([
				{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: renewable },
				{
					method: 'GET',
					pathname: '/v1/sys/mounts',
					body: mountsResponse({ 'secret/': { type: 'kv', options: { version: '2' } } }),
				},
			]);

			vi.useFakeTimers();
			try {
				await provider.connect();
				await provider.connect();
				expect(vi.getTimerCount()).toBe(1);

				renewable.data.renewable = false;
				await provider.connect();
				expect(vi.getTimerCount()).toBe(0);

				renewable.data.renewable = true;
				await provider.connect();
				expect(vi.getTimerCount()).toBe(1);

				await provider.disconnect();
				expect(vi.getTimerCount()).toBe(0);
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe('connection logging', () => {
		it('logs token refresh failures before attempting to reconnect', async () => {
			const { provider } = await initProvider([
				{ method: 'POST', pathname: '/v1/auth/token/renew-self', networkError: 'ECONNREFUSED' },
			]);
			const connect = vi.spyOn(provider, 'connect').mockResolvedValue();

			await (provider as unknown as { tokenRefresh: () => Promise<void> }).tokenRefresh();

			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to renew Vault token. Attempting to reconnect.',
				expect.objectContaining({
					operation: 'tokenRefresh',
					authMethod: 'token',
					errorCode: 'ECONNREFUSED',
				}),
			);
			expect(connect).toHaveBeenCalled();
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
			expect(message).toBe(
				'Permission denied accessing secret/metadata/. Check your token policies.',
			);
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
			expect(message).toBe('Could not access secret/metadata/ (status 500).');
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

		it('should probe with the LIST verb when preferGet is disabled', async () => {
			mockInstance(ExternalSecretsConfig, { preferGet: false });

			const { provider } = await initProvider(
				[
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: tokenLookupResponse() },
					{ method: 'LIST', pathname: '/v1/secret/metadata/', body: { data: { keys: [] } } },
				],
				vaultSettingsWithKvPath('secret/', '2'),
			);

			const [success] = await provider.test();

			expect(success).toBe(true);
		});

		it('should return error when the configured KV mount does not exist', async () => {
			const { provider } = await initProvider(
				[
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: tokenLookupResponse() },
					{
						method: 'GET',
						pathname: '/v1/exmaple-kv/metadata/',
						status: 404,
						body: {
							errors: ['no handler for route "exmaple-kv/metadata/". route entry not found.'],
						},
					},
				],
				vaultSettingsWithKvPath('exmaple-kv', '2'),
			);

			const [success, message] = await provider.test();

			expect(success).toBe(false);
			expect(message).toBe('Could not access exmaple-kv/metadata/ (status 404).');
		});

		it('should name the requested path when the token lacks access to the sub-path', async () => {
			const { provider, httpRequest } = await initProvider(
				[
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: tokenLookupResponse() },
					{
						method: 'GET',
						pathname: '/v1/example-kv/metadata/my-app/',
						status: 403,
						body: { errors: [] },
					},
				],
				vaultSettingsWithKvPath('example-kv', '2', 'my-app'),
			);

			const [success, message] = await provider.test();

			expect(success).toBe(false);
			expect(message).toBe(
				'Permission denied accessing example-kv/metadata/my-app/. Check your token policies.',
			);
			expect(httpRequest.mock.calls.map(([options]) => options.url)).toContain(
				`${VAULT_URL}example-kv/metadata/my-app/?list=true`,
			);
		});

		it('should return error when the configured KV secret path does not exist', async () => {
			const { provider } = await initProvider(
				[
					{ method: 'GET', pathname: '/v1/auth/token/lookup-self', body: tokenLookupResponse() },
					{
						method: 'GET',
						pathname: '/v1/example-kv/metadata/my-app/',
						status: 404,
						body: { errors: [] },
					},
				],
				vaultSettingsWithKvPath('example-kv', '2', 'my-app'),
			);

			const [success, message] = await provider.test();

			expect(success).toBe(false);
			expect(message).toBe(
				'No secrets found at example-kv/metadata/my-app/. Check the KV Secret Path.',
			);
		});
	});
});
