import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { JwtService } from '@/services/jwt.service';
import { createOwner, createMember } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import type { OAuthClient } from '../database/entities/oauth-client.entity';
import { OAuthClientRepository } from '../database/repositories/oauth-client.repository';
import type { OAuthSessionPayload } from '../oauth-session.service';

const testServer = setupTestServer({ endpointGroups: ['mcp'], modules: ['mcp'] });

let owner: User;
let member: User;
let jwtService: JwtService;

const createSessionToken = (payload: OAuthSessionPayload): string => {
	return jwtService.sign(payload, { expiresIn: '10m' });
};
let oauthClientRepository: OAuthClientRepository;

beforeAll(async () => {
	owner = await createOwner();
	member = await createMember();
	jwtService = Container.get(JwtService);
	oauthClientRepository = Container.get(OAuthClientRepository);
});

afterEach(async () => {
	await testDb.truncate(['OAuthClient', 'AuthorizationCode', 'UserConsent']);
});

describe('GET /rest/consent/details', () => {
	test('should return consent details for valid session', async () => {
		const client = await oauthClientRepository.save({
			id: 'test-client-id',
			name: 'Test OAuth Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		const sessionPayload = {
			clientId: client.id,
			redirectUri: 'https://example.com/callback',
			codeChallenge: 'test-challenge',
			state: 'test-state',
		};

		const sessionToken = createSessionToken(sessionPayload);

		const response = await testServer
			.authAgentFor(owner)
			.get('/consent/details')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({
			clientName: 'Test OAuth Client',
			clientId: 'test-client-id',
		});
	});

	test('should return 400 when session cookie is missing', async () => {
		const response = await testServer.authAgentFor(owner).get('/consent/details');

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
		expect(response.body).toEqual({
			status: 'error',
			message: 'Invalid or expired authorization session',
		});
	});

	test('should return 400 when session token is invalid', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.get('/consent/details')
			.set('Cookie', 'n8n-oauth-session=invalid-token');

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
		expect(response.body).toEqual({
			status: 'error',
			message: 'Invalid or expired authorization session',
		});
	});

	test('should return 400 when client does not exist', async () => {
		const sessionPayload = {
			clientId: 'non-existent-client',
			redirectUri: 'https://example.com/callback',
			codeChallenge: 'test-challenge',
			state: 'test-state',
		};

		const sessionToken = createSessionToken(sessionPayload);

		const response = await testServer
			.authAgentFor(owner)
			.get('/consent/details')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`);

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
		expect(response.body).toEqual({
			status: 'error',
			message: 'Invalid or expired authorization session',
		});
	});

	test('should clear session cookie on invalid token', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.get('/consent/details')
			.set('Cookie', 'n8n-oauth-session=invalid-token');

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
		const setCookieHeader = response.headers['set-cookie'];
		expect(setCookieHeader).toBeDefined();
		expect(setCookieHeader[0]).toContain('n8n-oauth-session=');
		expect(setCookieHeader[0]).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
	});

	test('should require authentication', async () => {
		const response = await testServer.authlessAgent.get('/consent/details');

		expect(response.statusCode).toBe(401);
	});

	test('should work for different users', async () => {
		const client = await oauthClientRepository.save({
			id: 'test-client-id-2',
			name: 'Test Client 2',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		const sessionPayload = {
			clientId: client.id,
			redirectUri: 'https://example.com/callback',
			codeChallenge: 'test-challenge',
			state: 'test-state',
		};

		const sessionToken = createSessionToken(sessionPayload);

		const ownerResponse = await testServer
			.authAgentFor(owner)
			.get('/consent/details')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`);

		expect(ownerResponse.statusCode).toBe(200);
		expect(ownerResponse.body.data.clientName).toBe('Test Client 2');

		const memberResponse = await testServer
			.authAgentFor(member)
			.get('/consent/details')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`);

		expect(memberResponse.statusCode).toBe(200);
		expect(memberResponse.body.data.clientName).toBe('Test Client 2');
	});
});

describe('POST /rest/consent/approve', () => {
	let client: OAuthClient;
	let sessionToken: string;

	beforeEach(async () => {
		client = await oauthClientRepository.save({
			id: `test-client-${Date.now()}`,
			name: 'Test OAuth Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		const sessionPayload = {
			clientId: client.id,
			redirectUri: 'https://example.com/callback',
			codeChallenge: 'test-challenge-string-that-is-long-enough',
			state: 'test-state',
		};

		sessionToken = createSessionToken(sessionPayload);
	});

	test('should handle consent approval and return redirect URL with authorization code', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.post('/consent/approve')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`)
			.send({ approved: true });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({
			status: 'success',
			redirectUrl: expect.stringContaining('https://example.com/callback?code='),
		});

		const redirectUrl = new URL(response.body.data.redirectUrl);
		expect(redirectUrl.searchParams.get('code')).toBeTruthy();
		expect(redirectUrl.searchParams.get('code')?.length).toBeGreaterThan(32);
		expect(redirectUrl.searchParams.get('state')).toBe('test-state');
	});

	test('should handle consent denial and return error redirect URL', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.post('/consent/approve')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`)
			.send({ approved: false });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({
			status: 'success',
			redirectUrl: expect.stringContaining('https://example.com/callback?error=access_denied'),
		});

		const redirectUrl = new URL(response.body.data.redirectUrl);
		expect(redirectUrl.searchParams.get('error')).toBe('access_denied');
		expect(redirectUrl.searchParams.get('error_description')).toBeTruthy();
		expect(redirectUrl.searchParams.get('state')).toBe('test-state');
	});

	test('should clear session cookie after processing consent', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.post('/consent/approve')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`)
			.send({ approved: true });

		expect(response.statusCode).toBe(200);

		const setCookieHeader = response.headers['set-cookie'];
		expect(setCookieHeader).toBeDefined();
		expect(setCookieHeader[0]).toContain('n8n-oauth-session=');
		expect(setCookieHeader[0]).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
	});

	test('should return 400 when approved field is missing', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.post('/consent/approve')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`)
			.send({});

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
		expect(response.body).toMatchObject({
			code: 'invalid_type',
			expected: 'boolean',
			path: ['approved'],
		});
	});

	test('should return 400 when approved field is not boolean', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.post('/consent/approve')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`)
			.send({ approved: 'yes' });

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
		expect(response.body).toMatchObject({
			code: 'invalid_type',
			expected: 'boolean',
			received: 'string',
			path: ['approved'],
		});
	});

	test('should return 400 when session cookie is missing', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.post('/consent/approve')
			.send({ approved: true });

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
		expect(response.body).toEqual({
			status: 'error',
			message: 'Invalid or expired authorization session',
		});
	});

	test('should return 400 when session token is invalid', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.post('/consent/approve')
			.set('Cookie', 'n8n-oauth-session=invalid-token')
			.send({ approved: true });

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
		expect(response.body.status).toBe('error');
	});

	test('should clear session cookie even on error', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.post('/consent/approve')
			.set('Cookie', 'n8n-oauth-session=invalid-token')
			.send({ approved: true });

		const setCookieHeader = response.headers['set-cookie'];
		expect(setCookieHeader).toBeDefined();
		expect(setCookieHeader[0]).toContain('n8n-oauth-session=');
		expect(setCookieHeader[0]).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
	});

	test('should require authentication', async () => {
		const response = await testServer.authlessAgent
			.post('/consent/approve')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`)
			.send({ approved: true });

		expect(response.statusCode).toBe(401);
	});

	test('should create user consent record on approval', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.post('/consent/approve')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`)
			.send({ approved: true });

		expect(response.statusCode).toBe(200);

		const { UserConsentRepository } = await import(
			'../database/repositories/oauth-user-consent.repository'
		);
		const userConsentRepository = Container.get(UserConsentRepository);
		const consent = await userConsentRepository.findOne({
			where: { userId: owner.id, clientId: client.id },
		});

		expect(consent).toBeDefined();
		expect(consent?.userId).toBe(owner.id);
		expect(consent?.clientId).toBe(client.id);
		expect(consent?.grantedAt).toBeDefined();
	});

	test('should not create user consent record on denial', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.post('/consent/approve')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`)
			.send({ approved: false });

		expect(response.statusCode).toBe(200);

		const { UserConsentRepository } = await import(
			'../database/repositories/oauth-user-consent.repository'
		);
		const userConsentRepository = Container.get(UserConsentRepository);
		const consent = await userConsentRepository.findOne({
			where: { userId: owner.id, clientId: client.id },
		});

		expect(consent).toBeNull();
	});

	test('should handle consent from different users', async () => {
		const ownerResponse = await testServer
			.authAgentFor(owner)
			.post('/consent/approve')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`)
			.send({ approved: true });

		expect(ownerResponse.statusCode).toBe(200);
		expect(ownerResponse.body.data.redirectUrl).toContain('code=');

		const newSessionToken = createSessionToken({
			clientId: client.id,
			redirectUri: 'https://example.com/callback',
			codeChallenge: 'test-challenge-string-that-is-long-enough',
			state: 'test-state-2',
		});

		const memberResponse = await testServer
			.authAgentFor(member)
			.post('/consent/approve')
			.set('Cookie', `n8n-oauth-session=${newSessionToken}`)
			.send({ approved: false });

		expect(memberResponse.statusCode).toBe(200);
		expect(memberResponse.body.data.redirectUrl).toContain('error=access_denied');
	});
});

describe('Consent Flow - End-to-End', () => {
	test('should complete full consent flow from details to approval', async () => {
		const client = await oauthClientRepository.save({
			id: 'e2e-test-client',
			name: 'End-to-End Test Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		const sessionPayload = {
			clientId: client.id,
			redirectUri: 'https://example.com/callback',
			codeChallenge: 'e2e-test-challenge-string-that-is-long-enough',
			state: 'e2e-state',
		};

		const sessionToken = createSessionToken(sessionPayload);

		const detailsResponse = await testServer
			.authAgentFor(owner)
			.get('/consent/details')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`);

		expect(detailsResponse.statusCode).toBe(200);
		expect(detailsResponse.body.data.clientName).toBe('End-to-End Test Client');

		const approvalResponse = await testServer
			.authAgentFor(owner)
			.post('/consent/approve')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`)
			.send({ approved: true });

		expect(approvalResponse.statusCode).toBe(200);
		expect(approvalResponse.body.data.status).toBe('success');
		expect(approvalResponse.body.data.redirectUrl).toContain('code=');
		expect(approvalResponse.body.data.redirectUrl).toContain('state=e2e-state');

		const setCookieHeader = approvalResponse.headers['set-cookie'];
		expect(setCookieHeader).toBeDefined();
		expect(setCookieHeader[0]).toContain('n8n-oauth-session=');
		expect(setCookieHeader[0]).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
	});
});
