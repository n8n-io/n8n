import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { IHttpRequestOptions } from 'n8n-workflow';

import { InfisicalProvider } from '../infisical';
import { createFakeOutboundHttp, type Route } from './fake-outbound-http';

const SITE_URL = 'https://app.infisical.com';
const PROJECT_ID = 'project-123';
const ENVIRONMENT = 'dev';
const SECRET_PATH = '/';

const universalAuthSettings = {
	connected: true,
	connectedAt: new Date(),
	settings: {
		siteURL: SITE_URL,
		projectId: PROJECT_ID,
		environment: ENVIRONMENT,
		secretPath: SECRET_PATH,
		authMethod: 'universalAuth',
		clientId: 'test-client-id',
		clientSecret: 'test-client-secret',
	},
};

function workspaceResponse() {
	return {
		workspace: {
			id: PROJECT_ID,
			name: 'Test Project',
			environments: [{ name: 'Development', slug: 'dev' }],
		},
	};
}

function universalAuthLoginResponse(accessToken = 'new-access-token', expiresIn = 7200) {
	return {
		accessToken,
		expiresIn,
		accessTokenMaxTTL: 43244,
		tokenType: 'Bearer',
	};
}

type ImportFixture = {
	secretPath: string;
	environment: string;
	secrets: Array<{ secretKey: string; secretValue: string }>;
};

function listSecretsResponse(
	secrets: Array<{ secretKey: string; secretValue: string }>,
	imports: ImportFixture[] = [],
) {
	return { secrets, imports };
}

const WORKSPACE_PATH = `/api/v1/workspace/${PROJECT_ID}`;
const LOGIN_PATH = '/api/v1/auth/universal-auth/login';
const SECRETS_PATH = '/api/v4/secrets';

describe('InfisicalProvider', () => {
	const logger = mockInstance(Logger);
	logger.scoped.mockReturnValue(logger);

	function createProvider(routes: Route[]) {
		const { outboundHttp, httpRequest, requests } = createFakeOutboundHttp(routes);
		const provider = new InfisicalProvider(logger, outboundHttp);
		return { provider, httpRequest, requests, outboundHttp };
	}

	async function initProvider(routes: Route[]) {
		const ctx = createProvider(routes);
		await ctx.provider.init(universalAuthSettings);
		return ctx;
	}

	function findCall(httpRequest: jest.Mock, predicate: (options: IHttpRequestOptions) => boolean) {
		return httpRequest.mock.calls.map(([options]) => options).find(predicate);
	}

	describe('request wiring', () => {
		it('binds the client to the site URL and a token header factory', async () => {
			const { requests } = await initProvider([]);

			expect(requests).toHaveBeenCalledWith({
				baseURL: SITE_URL,
				headers: expect.any(Function),
				ssrf: 'disabled',
			});
		});

		it('maps the login request to an absolute URL with a JSON body', async () => {
			const { provider, httpRequest } = await initProvider([
				{ method: 'POST', pathname: LOGIN_PATH, body: universalAuthLoginResponse('issued-token') },
				{ method: 'GET', pathname: WORKSPACE_PATH, body: workspaceResponse() },
			]);

			await provider.connect();

			const loginCall = findCall(httpRequest, (options) => options.url.endsWith(LOGIN_PATH));
			expect(loginCall).toMatchObject({
				url: `${SITE_URL}${LOGIN_PATH}`,
				method: 'POST',
				body: { clientId: 'test-client-id', clientSecret: 'test-client-secret' },
				json: true,
			});
			expect(provider.state).toBe('connected');
		});

		it('sends the issued bearer token and query params when fetching secrets', async () => {
			const { provider, httpRequest } = await initProvider([
				{ method: 'POST', pathname: LOGIN_PATH, body: universalAuthLoginResponse('connect-token') },
				{ method: 'GET', pathname: WORKSPACE_PATH, body: workspaceResponse() },
				{
					method: 'GET',
					pathname: SECRETS_PATH,
					body: listSecretsResponse([{ secretKey: 'KEY', secretValue: 'val' }]),
				},
			]);

			await provider.connect();
			await provider.update();

			const secretsCall = findCall(httpRequest, (options) => options.url.endsWith(SECRETS_PATH));
			expect(secretsCall).toMatchObject({
				method: 'GET',
				qs: { projectId: PROJECT_ID, environment: ENVIRONMENT, secretPath: SECRET_PATH },
				json: true,
				headers: { Authorization: 'Bearer connect-token' },
			});
		});
	});

	describe('test', () => {
		it('returns success when the workspace endpoint returns 200', async () => {
			const { provider } = await initProvider([
				{ method: 'GET', pathname: WORKSPACE_PATH, body: workspaceResponse() },
			]);

			const [success] = await provider.test();
			expect(success).toBe(true);
		});

		it('returns "Invalid credentials" on 401', async () => {
			const { provider } = await initProvider([
				{ method: 'GET', pathname: WORKSPACE_PATH, status: 401, body: { message: 'Unauthorized' } },
			]);

			const [success, message] = await provider.test();
			expect(success).toBe(false);
			expect(message).toBe('Invalid credentials');
		});

		it('returns "Project not found" on 404', async () => {
			const { provider } = await initProvider([
				{ method: 'GET', pathname: WORKSPACE_PATH, status: 404, body: { message: 'Not found' } },
			]);

			const [success, message] = await provider.test();
			expect(success).toBe(false);
			expect(message).toBe('Project not found. Check the Project ID and Site URL.');
		});

		it('returns "Permission denied" on 403', async () => {
			const { provider } = await initProvider([
				{ method: 'GET', pathname: WORKSPACE_PATH, status: 403, body: { message: 'Forbidden' } },
			]);

			const [success, message] = await provider.test();
			expect(success).toBe(false);
			expect(message).toBe(
				'Permission denied. Verify the machine identity has access to this project.',
			);
		});

		it('returns a connection-refused message when the socket is refused', async () => {
			const { provider } = await initProvider([
				{ method: 'GET', pathname: WORKSPACE_PATH, networkError: 'ECONNREFUSED' },
			]);

			const [success, message] = await provider.test();
			expect(success).toBe(false);
			expect(message).toBe('Connection refused. Check the Site URL.');
		});
	});

	describe('doConnect with Universal Auth', () => {
		it('transitions to error state when login fails', async () => {
			const { provider } = await initProvider([
				{ method: 'POST', pathname: LOGIN_PATH, status: 401, body: { message: 'Invalid' } },
			]);

			await provider.connect();

			expect(provider.state).toBe('error');
		});
	});

	describe('update', () => {
		async function connectedProvider(routes: Route[]) {
			const ctx = await initProvider([
				{ method: 'POST', pathname: LOGIN_PATH, body: universalAuthLoginResponse('connect-token') },
				{ method: 'GET', pathname: WORKSPACE_PATH, body: workspaceResponse() },
				...routes,
			]);
			await ctx.provider.connect();
			return ctx;
		}

		it('caches secrets returned from the v4 list endpoint', async () => {
			const { provider } = await connectedProvider([
				{
					method: 'GET',
					pathname: SECRETS_PATH,
					body: listSecretsResponse([
						{ secretKey: 'API_KEY', secretValue: 'secret-value' },
						{ secretKey: 'DB_PASSWORD', secretValue: 'hunter2' },
					]),
				},
			]);

			await provider.update();

			expect(provider.getSecret('API_KEY')).toBe('secret-value');
			expect(provider.getSecret('DB_PASSWORD')).toBe('hunter2');
			expect(provider.hasSecret('API_KEY')).toBe(true);
			expect(provider.hasSecret('UNKNOWN')).toBe(false);
			expect(provider.getSecretNames().sort()).toEqual(['API_KEY', 'DB_PASSWORD']);
		});

		it('produces an empty cache when no secrets are returned', async () => {
			const { provider } = await connectedProvider([
				{ method: 'GET', pathname: SECRETS_PATH, body: listSecretsResponse([]) },
			]);

			await provider.update();

			expect(provider.getSecretNames()).toHaveLength(0);
		});

		it('re-authenticates and retries once when the token is rejected during update', async () => {
			const { provider, httpRequest } = await connectedProvider([
				{ method: 'GET', pathname: SECRETS_PATH, status: 401, body: { message: 'Token expired' } },
				{
					method: 'POST',
					pathname: LOGIN_PATH,
					body: universalAuthLoginResponse('refreshed-token'),
				},
				{
					method: 'GET',
					pathname: SECRETS_PATH,
					body: listSecretsResponse([{ secretKey: 'KEY', secretValue: 'val' }]),
				},
			]);

			await provider.update();

			expect(provider.getSecret('KEY')).toBe('val');
			// The retry must carry the freshly issued token.
			const secretsCalls = httpRequest.mock.calls
				.map(([options]) => options)
				.filter((options) => options.url.endsWith(SECRETS_PATH));
			expect(secretsCalls).toHaveLength(2);
			expect(secretsCalls[1].headers).toMatchObject({ Authorization: 'Bearer refreshed-token' });
		});

		it('caches secrets from imports alongside top-level secrets', async () => {
			const { provider } = await connectedProvider([
				{
					method: 'GET',
					pathname: SECRETS_PATH,
					body: listSecretsResponse(
						[{ secretKey: 'API_KEY', secretValue: 'top-value' }],
						[
							{
								secretPath: '/imported',
								environment: ENVIRONMENT,
								secrets: [
									{ secretKey: 'IMPORTED_KEY', secretValue: 'from-import' },
									{ secretKey: 'ANOTHER', secretValue: 'also' },
								],
							},
						],
					),
				},
			]);

			await provider.update();

			expect(provider.getSecret('API_KEY')).toBe('top-value');
			expect(provider.getSecret('IMPORTED_KEY')).toBe('from-import');
			expect(provider.getSecret('ANOTHER')).toBe('also');
			expect(provider.getSecretNames().sort()).toEqual(['ANOTHER', 'API_KEY', 'IMPORTED_KEY']);
		});

		it('prefers top-level secrets over imports when keys collide', async () => {
			const { provider } = await connectedProvider([
				{
					method: 'GET',
					pathname: SECRETS_PATH,
					body: listSecretsResponse(
						[{ secretKey: 'SHARED_KEY', secretValue: 'wins' }],
						[
							{
								secretPath: '/imported',
								environment: ENVIRONMENT,
								secrets: [{ secretKey: 'SHARED_KEY', secretValue: 'loses' }],
							},
						],
					),
				},
			]);

			await provider.update();

			expect(provider.getSecret('SHARED_KEY')).toBe('wins');
			expect(provider.getSecretNames()).toEqual(['SHARED_KEY']);
		});

		it('keeps the value from the first import when later imports define the same key', async () => {
			const { provider } = await connectedProvider([
				{
					method: 'GET',
					pathname: SECRETS_PATH,
					body: listSecretsResponse(
						[],
						[
							{
								secretPath: '/imported-a',
								environment: ENVIRONMENT,
								secrets: [{ secretKey: 'DUP', secretValue: 'first' }],
							},
							{
								secretPath: '/imported-b',
								environment: ENVIRONMENT,
								secrets: [{ secretKey: 'DUP', secretValue: 'second' }],
							},
						],
					),
				},
			]);

			await provider.update();

			expect(provider.getSecret('DUP')).toBe('first');
		});

		it('caches keys sourced only from imports when top-level secrets is empty', async () => {
			const { provider } = await connectedProvider([
				{
					method: 'GET',
					pathname: SECRETS_PATH,
					body: listSecretsResponse(
						[],
						[
							{
								secretPath: '/imported-a',
								environment: ENVIRONMENT,
								secrets: [{ secretKey: 'FROM_A', secretValue: 'a' }],
							},
							{
								secretPath: '/imported-b',
								environment: ENVIRONMENT,
								secrets: [{ secretKey: 'FROM_B', secretValue: 'b' }],
							},
						],
					),
				},
			]);

			await provider.update();

			expect(provider.getSecret('FROM_A')).toBe('a');
			expect(provider.getSecret('FROM_B')).toBe('b');
			expect(provider.getSecretNames().sort()).toEqual(['FROM_A', 'FROM_B']);
		});

		it('handles imports with empty secrets arrays without affecting the cache', async () => {
			const { provider } = await connectedProvider([
				{
					method: 'GET',
					pathname: SECRETS_PATH,
					body: listSecretsResponse(
						[],
						[
							{ secretPath: '/empty', environment: ENVIRONMENT, secrets: [] },
							{
								secretPath: '/has-secrets',
								environment: ENVIRONMENT,
								secrets: [{ secretKey: 'REAL', secretValue: 'value' }],
							},
						],
					),
				},
			]);

			await provider.update();

			expect(provider.getSecret('REAL')).toBe('value');
			expect(provider.getSecretNames()).toEqual(['REAL']);
		});
	});

	describe('disconnect', () => {
		it('clears cached secrets and the in-flight token', async () => {
			const { provider } = await initProvider([
				{ method: 'POST', pathname: LOGIN_PATH, body: universalAuthLoginResponse('connect-token') },
				{ method: 'GET', pathname: WORKSPACE_PATH, body: workspaceResponse() },
				{
					method: 'GET',
					pathname: SECRETS_PATH,
					body: listSecretsResponse([{ secretKey: 'KEY', secretValue: 'val' }]),
				},
			]);

			await provider.connect();
			await provider.update();
			expect(provider.getSecretNames()).toContain('KEY');

			await provider.disconnect();

			expect(provider.getSecretNames()).toHaveLength(0);
			expect(provider.hasSecret('KEY')).toBe(false);
		});
	});
});
