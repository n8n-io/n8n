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

function listSecretsResponse(secrets: Array<{ secretKey: string; secretValue: string }>) {
	return { secrets };
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
