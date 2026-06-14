import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import nock from 'nock';

import { InfisicalProvider } from '../infisical';

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

describe('InfisicalProvider', () => {
	const logger = mockInstance(Logger);
	logger.scoped.mockReturnValue(logger);

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

	describe('test', () => {
		it('returns success when the workspace endpoint returns 200', async () => {
			const provider = new InfisicalProvider(logger);
			await provider.init(universalAuthSettings);

			const scope = nock(SITE_URL)
				.get(`/api/v1/workspace/${PROJECT_ID}`)
				.reply(200, workspaceResponse());

			const [success] = await provider.test();
			expect(success).toBe(true);
			scope.done();
		});

		it('returns "Invalid credentials" on 401', async () => {
			const provider = new InfisicalProvider(logger);
			await provider.init(universalAuthSettings);

			const scope = nock(SITE_URL)
				.get(`/api/v1/workspace/${PROJECT_ID}`)
				.reply(401, { message: 'Unauthorized' });

			const [success, message] = await provider.test();
			expect(success).toBe(false);
			expect(message).toBe('Invalid credentials');
			scope.done();
		});

		it('returns "Project not found" on 404', async () => {
			const provider = new InfisicalProvider(logger);
			await provider.init(universalAuthSettings);

			const scope = nock(SITE_URL)
				.get(`/api/v1/workspace/${PROJECT_ID}`)
				.reply(404, { message: 'Not found' });

			const [success, message] = await provider.test();
			expect(success).toBe(false);
			expect(message).toBe('Project not found. Check the Project ID and Site URL.');
			scope.done();
		});

		it('returns "Permission denied" on 403', async () => {
			const provider = new InfisicalProvider(logger);
			await provider.init(universalAuthSettings);

			const scope = nock(SITE_URL)
				.get(`/api/v1/workspace/${PROJECT_ID}`)
				.reply(403, { message: 'Forbidden' });

			const [success, message] = await provider.test();
			expect(success).toBe(false);
			expect(message).toBe(
				'Permission denied. Verify the machine identity has access to this project.',
			);
			scope.done();
		});
	});

	describe('doConnect with Universal Auth', () => {
		it('logs in with clientId/clientSecret and tests the workspace with the issued token', async () => {
			const provider = new InfisicalProvider(logger);
			await provider.init(universalAuthSettings);

			const scope = nock(SITE_URL)
				.post('/api/v1/auth/universal-auth/login', {
					clientId: 'test-client-id',
					clientSecret: 'test-client-secret',
				})
				.reply(200, universalAuthLoginResponse('issued-token'))
				.get(`/api/v1/workspace/${PROJECT_ID}`)
				.matchHeader('authorization', 'Bearer issued-token')
				.reply(200, workspaceResponse());

			await provider.connect();

			expect(provider.state).toBe('connected');
			scope.done();
		});

		it('transitions to error state when login fails', async () => {
			const provider = new InfisicalProvider(logger);
			await provider.init(universalAuthSettings);

			const scope = nock(SITE_URL)
				.post('/api/v1/auth/universal-auth/login')
				.reply(401, { message: 'Invalid client credentials' });

			await provider.connect();

			expect(provider.state).toBe('error');
			scope.done();
		});
	});

	describe('update', () => {
		it('caches secrets returned from the v4 list endpoint', async () => {
			const provider = new InfisicalProvider(logger);
			await provider.init(universalAuthSettings);

			const connectScope = nock(SITE_URL)
				.post('/api/v1/auth/universal-auth/login')
				.reply(200, universalAuthLoginResponse('connect-token'))
				.get(`/api/v1/workspace/${PROJECT_ID}`)
				.reply(200, workspaceResponse());

			await provider.connect();
			connectScope.done();

			const updateScope = nock(SITE_URL)
				.get('/api/v4/secrets')
				.query({
					projectId: PROJECT_ID,
					environment: ENVIRONMENT,
					secretPath: SECRET_PATH,
				})
				.matchHeader('authorization', 'Bearer connect-token')
				.reply(
					200,
					listSecretsResponse([
						{ secretKey: 'API_KEY', secretValue: 'secret-value' },
						{ secretKey: 'DB_PASSWORD', secretValue: 'hunter2' },
					]),
				);

			await provider.update();

			expect(provider.getSecret('API_KEY')).toBe('secret-value');
			expect(provider.getSecret('DB_PASSWORD')).toBe('hunter2');
			expect(provider.hasSecret('API_KEY')).toBe(true);
			expect(provider.hasSecret('UNKNOWN')).toBe(false);
			expect(provider.getSecretNames().sort()).toEqual(['API_KEY', 'DB_PASSWORD']);
			updateScope.done();
		});

		it('produces an empty cache when no secrets are returned', async () => {
			const provider = new InfisicalProvider(logger);
			await provider.init(universalAuthSettings);

			const connectScope = nock(SITE_URL)
				.post('/api/v1/auth/universal-auth/login')
				.reply(200, universalAuthLoginResponse('connect-token'))
				.get(`/api/v1/workspace/${PROJECT_ID}`)
				.reply(200, workspaceResponse());

			await provider.connect();
			connectScope.done();

			const updateScope = nock(SITE_URL)
				.get('/api/v4/secrets')
				.query(true)
				.reply(200, listSecretsResponse([]));

			await provider.update();

			expect(provider.getSecretNames()).toHaveLength(0);
			updateScope.done();
		});

		it('re-authenticates and retries once when the token is rejected during update', async () => {
			const provider = new InfisicalProvider(logger);
			await provider.init(universalAuthSettings);

			const connectScope = nock(SITE_URL)
				.post('/api/v1/auth/universal-auth/login')
				.reply(200, universalAuthLoginResponse('first-token'))
				.get(`/api/v1/workspace/${PROJECT_ID}`)
				.reply(200, workspaceResponse());

			await provider.connect();
			connectScope.done();

			const updateScope = nock(SITE_URL)
				.get('/api/v4/secrets')
				.query(true)
				.matchHeader('authorization', 'Bearer first-token')
				.reply(401, { message: 'Token expired' })
				.post('/api/v1/auth/universal-auth/login')
				.reply(200, universalAuthLoginResponse('refreshed-token'))
				.get('/api/v4/secrets')
				.query(true)
				.matchHeader('authorization', 'Bearer refreshed-token')
				.reply(200, listSecretsResponse([{ secretKey: 'KEY', secretValue: 'val' }]));

			await provider.update();

			expect(provider.getSecret('KEY')).toBe('val');
			updateScope.done();
		});
	});

	describe('update with imports', () => {
		const makeImport = (
			secrets: Array<{ secretKey: string; secretValue: string }>,
			secretPath = '/imported',
			environment = ENVIRONMENT,
		): ImportFixture => ({ secretPath, environment, secrets });

		async function setupConnectedProvider() {
			const provider = new InfisicalProvider(logger);
			await provider.init(universalAuthSettings);

			const connectScope = nock(SITE_URL)
				.post('/api/v1/auth/universal-auth/login')
				.reply(200, universalAuthLoginResponse('connect-token'))
				.get(`/api/v1/workspace/${PROJECT_ID}`)
				.reply(200, workspaceResponse());

			await provider.connect();
			connectScope.done();

			return provider;
		}

		it('caches secrets from imports alongside top-level secrets', async () => {
			const provider = await setupConnectedProvider();

			const updateScope = nock(SITE_URL)
				.get('/api/v4/secrets')
				.query(true)
				.reply(
					200,
					listSecretsResponse(
						[{ secretKey: 'API_KEY', secretValue: 'top-value' }],
						[
							makeImport([
								{ secretKey: 'IMPORTED_KEY', secretValue: 'from-import' },
								{ secretKey: 'ANOTHER', secretValue: 'also' },
							]),
						],
					),
				);

			await provider.update();

			expect(provider.getSecret('API_KEY')).toBe('top-value');
			expect(provider.getSecret('IMPORTED_KEY')).toBe('from-import');
			expect(provider.getSecret('ANOTHER')).toBe('also');
			expect(provider.getSecretNames().sort()).toEqual(['ANOTHER', 'API_KEY', 'IMPORTED_KEY']);
			updateScope.done();
		});

		it('prefers top-level secrets over imports when keys collide', async () => {
			const provider = await setupConnectedProvider();

			const updateScope = nock(SITE_URL)
				.get('/api/v4/secrets')
				.query(true)
				.reply(
					200,
					listSecretsResponse(
						[{ secretKey: 'SHARED_KEY', secretValue: 'wins' }],
						[makeImport([{ secretKey: 'SHARED_KEY', secretValue: 'loses' }])],
					),
				);

			await provider.update();

			expect(provider.getSecret('SHARED_KEY')).toBe('wins');
			expect(provider.getSecretNames()).toEqual(['SHARED_KEY']);
			updateScope.done();
		});

		it('keeps the value from the first import when later imports define the same key', async () => {
			const provider = await setupConnectedProvider();

			const updateScope = nock(SITE_URL)
				.get('/api/v4/secrets')
				.query(true)
				.reply(
					200,
					listSecretsResponse(
						[],
						[
							makeImport([{ secretKey: 'DUP', secretValue: 'first' }], '/imported-a'),
							makeImport([{ secretKey: 'DUP', secretValue: 'second' }], '/imported-b'),
						],
					),
				);

			await provider.update();

			expect(provider.getSecret('DUP')).toBe('first');
			updateScope.done();
		});

		it('caches keys sourced only from imports when top-level secrets is empty', async () => {
			const provider = await setupConnectedProvider();

			const updateScope = nock(SITE_URL)
				.get('/api/v4/secrets')
				.query(true)
				.reply(
					200,
					listSecretsResponse(
						[],
						[
							makeImport([{ secretKey: 'FROM_A', secretValue: 'a' }], '/imported-a'),
							makeImport([{ secretKey: 'FROM_B', secretValue: 'b' }], '/imported-b'),
						],
					),
				);

			await provider.update();

			expect(provider.getSecret('FROM_A')).toBe('a');
			expect(provider.getSecret('FROM_B')).toBe('b');
			expect(provider.getSecretNames().sort()).toEqual(['FROM_A', 'FROM_B']);
			updateScope.done();
		});

		it('handles imports with empty secrets arrays without affecting the cache', async () => {
			const provider = await setupConnectedProvider();

			const updateScope = nock(SITE_URL)
				.get('/api/v4/secrets')
				.query(true)
				.reply(
					200,
					listSecretsResponse(
						[],
						[
							makeImport([], '/empty'),
							makeImport([{ secretKey: 'REAL', secretValue: 'value' }], '/has-secrets'),
						],
					),
				);

			await provider.update();

			expect(provider.getSecret('REAL')).toBe('value');
			expect(provider.getSecretNames()).toEqual(['REAL']);
			updateScope.done();
		});
	});

	describe('disconnect', () => {
		it('clears cached secrets and the in-flight token', async () => {
			const provider = new InfisicalProvider(logger);
			await provider.init(universalAuthSettings);

			const scope = nock(SITE_URL)
				.post('/api/v1/auth/universal-auth/login')
				.reply(200, universalAuthLoginResponse('connect-token'))
				.get(`/api/v1/workspace/${PROJECT_ID}`)
				.reply(200, workspaceResponse())
				.get('/api/v4/secrets')
				.query(true)
				.reply(200, listSecretsResponse([{ secretKey: 'KEY', secretValue: 'val' }]));

			await provider.connect();
			await provider.update();
			expect(provider.getSecretNames()).toContain('KEY');

			await provider.disconnect();

			expect(provider.getSecretNames()).toHaveLength(0);
			expect(provider.hasSecret('KEY')).toBe(false);
			scope.done();
		});
	});
});
