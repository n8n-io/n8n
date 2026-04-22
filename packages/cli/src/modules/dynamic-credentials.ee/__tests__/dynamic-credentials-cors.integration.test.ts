import { LicenseState } from '@n8n/backend-common';
import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { CredentialsRepository } from '@n8n/db';
import type { ICredentialResolver } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { Cipher } from 'n8n-core';

import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { OauthService } from '@/oauth/oauth.service';
import * as utils from '@test-integration/utils';

import { DynamicCredentialResolverRepository } from '../database/repositories/credential-resolver.repository';
import { DynamicCredentialsConfig } from '../dynamic-credentials.config';
import { DynamicCredentialResolverRegistry } from '../services';

// Enable dynamic credentials feature flag
process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS = 'true';

// Mock license
const licenseMock = mock<LicenseState>();
licenseMock.isLicensed.mockReturnValue(true);
Container.set(LicenseState, licenseMock);

// Mock DynamicCredentialsConfig before test server is created
mockInstance(DynamicCredentialsConfig, {
	corsOrigin: 'https://app.example.com',
	corsAllowCredentials: false,
	endpointAuthToken: 'test-static-token',
});

const testServer = utils.setupTestServer({
	endpointGroups: ['credentials'],
	enabledFeatures: ['feat:externalSecrets'],
	modules: ['dynamic-credentials'],
});

let credentialsRepository: CredentialsRepository;
let resolverRepository: DynamicCredentialResolverRepository;
let cipher: Cipher;
let oauthService: OauthService;

// Mock resolver for testing
const mockResolver: ICredentialResolver = {
	metadata: {
		name: 'test-resolver',
		description: 'Test resolver for CORS integration tests',
	},
	async setSecret() {
		return;
	},
	async getSecret() {
		return { token: 'test-token', refreshToken: 'test-refresh-token' };
	},
	async deleteSecret() {},
	async validateIdentity() {},
	validateOptions: jest.fn(),
};

beforeAll(async () => {
	credentialsRepository = Container.get(CredentialsRepository);
	resolverRepository = Container.get(DynamicCredentialResolverRepository);
	cipher = Container.get(Cipher);
	oauthService = Container.get(OauthService);

	// Mock OAuth service to avoid actual OAuth flow
	oauthService.generateAOauth2AuthUri = jest
		.fn()
		.mockResolvedValue('https://oauth.example.com/authorize');
	mockInstance(EnterpriseCredentialsService);
});

beforeEach(async () => {
	await testDb.truncate(['CredentialsEntity', 'DynamicCredentialResolver']);
});

function randomId() {
	return Math.random().toString(36).substring(2, 15);
}

describe('POST /credentials/:id/authorize - CORS Integration', () => {
	let credentialId: string;
	let resolverId: string;

	async function setupTestData() {
		// Create test credential
		const credential = await credentialsRepository.save(
			credentialsRepository.create({
				id: randomId(),
				name: 'Test OAuth2 Credential',
				type: 'oAuth2Api',
				data: cipher.encrypt({ clientId: 'test-client-id' }),
			}),
		);
		credentialId = credential.id;

		// Create test resolver
		const resolver = await resolverRepository.save({
			id: randomId(),
			name: 'Test Resolver',
			type: 'test-resolver',
			config: cipher.encrypt(JSON.stringify({ apiKey: 'test-api-key' })),
		});
		resolverId = resolver.id;

		// Register mock resolver - access private property using array notation
		const registry = Container.get(DynamicCredentialResolverRegistry);
		registry['resolverMap'].set('test-resolver', mockResolver);
	}

	beforeEach(async () => {
		await setupTestData();
	});

	test('should return 204 on OPTIONS preflight with allowed origin', async () => {
		const response = await testServer.authlessAgent
			.options(`/credentials/${credentialId}/authorize?resolverId=${resolverId}`)
			.set('Origin', 'https://app.example.com')
			.set('Access-Control-Request-Method', 'POST')
			.set('Access-Control-Request-Headers', 'Authorization, Content-Type');

		expect(response.status).toBe(204);
		expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
		expect(response.headers['access-control-allow-methods']).toContain('POST');
		expect(response.headers['access-control-allow-methods']).toContain('OPTIONS');
		expect(response.headers['access-control-allow-headers']).toBeDefined();
		expect(response.headers['access-control-allow-headers']).toContain('Authorization');
		expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
		expect(response.headers['access-control-allow-headers']).toContain('X-Requested-With');
		expect(response.headers['access-control-max-age']).toBe('86400');
	});

	test('should set CORS headers on POST request with allowed origin', async () => {
		const response = await testServer.authlessAgent
			.post(`/credentials/${credentialId}/authorize?resolverId=${resolverId}`)
			.set('Origin', 'https://app.example.com')
			.set('Authorization', 'Bearer test-token')
			.set('X-Authorization', 'Bearer test-static-token')
			.send();

		// Note: The test doesn't verify the full OAuth2 flow, just CORS headers
		// A 400 may occur if validateIdentity fails, but we still check CORS headers
		expect([200, 400]).toContain(response.status);
		expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
		expect(response.headers['access-control-allow-methods']).toContain('POST');
		expect(response.headers['access-control-allow-methods']).toContain('OPTIONS');
	});

	test('should succeed without CORS headers when Origin header is absent', async () => {
		const response = await testServer.authlessAgent
			.post(`/credentials/${credentialId}/authorize?resolverId=${resolverId}`)
			.set('Authorization', 'Bearer test-token')
			.set('X-Authorization', 'Bearer test-static-token')
			.send();
		// Explicitly NOT setting Origin header

		// Request should succeed
		expect([200, 400]).toContain(response.status);

		// CORS headers should not be present when no Origin header is sent
		expect(response.headers['access-control-allow-origin']).toBeUndefined();
		expect(response.headers['access-control-allow-methods']).toBeUndefined();
		expect(response.headers['access-control-allow-headers']).toBeUndefined();
		expect(response.headers['access-control-max-age']).toBeUndefined();
	});

	test('should return 404 on OPTIONS preflight with disallowed origin', async () => {
		const response = await testServer.authlessAgent
			.options(`/credentials/${credentialId}/authorize?resolverId=${resolverId}`)
			.set('Origin', 'https://evil.com')
			.set('Access-Control-Request-Method', 'POST')
			.set('Access-Control-Request-Headers', 'Authorization, Content-Type');

		// Disallowed origin should result in 404 (route not matched by custom-cors middleware)
		expect(response.status).toBe(404);
		expect(response.headers['access-control-allow-origin']).toBeUndefined();
		expect(response.headers['access-control-allow-methods']).toBeUndefined();
		expect(response.headers['access-control-allow-headers']).toBeUndefined();
	});

	test('should not set CORS headers with disallowed origin', async () => {
		const response = await testServer.authlessAgent
			.post(`/credentials/${credentialId}/authorize?resolverId=${resolverId}`)
			.set('Origin', 'https://evil.com')
			.set('Authorization', 'Bearer test-token')
			.set('X-Authorization', 'Bearer test-static-token')
			.send();

		// With disallowed origin, request may succeed but CORS headers should not be set
		// The request reaches the actual handler since POST doesn't require preflight match
		expect([200, 400]).toContain(response.status);

		// No CORS headers should be present for disallowed origin
		expect(response.headers['access-control-allow-origin']).toBeUndefined();
		expect(response.headers['access-control-allow-methods']).toBeUndefined();
	});
});

describe('DELETE /credentials/:id/revoke - CORS Integration', () => {
	let credentialId: string;
	let resolverId: string;

	async function setupTestData() {
		// Create test credential
		const credential = await credentialsRepository.save(
			credentialsRepository.create({
				id: randomId(),
				name: 'Test OAuth2 Credential',
				type: 'oAuth2Api',
				data: cipher.encrypt({ clientId: 'test-client-id' }),
			}),
		);
		credentialId = credential.id;

		// Create test resolver
		const resolver = await resolverRepository.save({
			id: randomId(),
			name: 'Test Resolver',
			type: 'test-resolver',
			config: cipher.encrypt(JSON.stringify({ apiKey: 'test-api-key' })),
		});
		resolverId = resolver.id;

		// Register mock resolver
		const registry = Container.get(DynamicCredentialResolverRegistry);
		registry['resolverMap'].set('test-resolver', mockResolver);
	}

	beforeEach(async () => {
		await setupTestData();
	});

	test('should handle CORS preflight correctly', async () => {
		const response = await testServer.authlessAgent
			.options(`/credentials/${credentialId}/revoke?resolverId=${resolverId}`)
			.set('Origin', 'https://app.example.com')
			.set('Access-Control-Request-Method', 'DELETE')
			.set('Access-Control-Request-Headers', 'Authorization, Content-Type');

		expect(response.status).toBe(204);
		expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
		expect(response.headers['access-control-allow-methods']).toContain('DELETE');
		expect(response.headers['access-control-allow-methods']).toContain('OPTIONS');
		expect(response.headers['access-control-allow-methods']).not.toContain('POST');
		expect(response.headers['access-control-allow-headers']).toBeDefined();
		expect(response.headers['access-control-allow-headers']).toContain('Authorization');
		expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
		expect(response.headers['access-control-allow-headers']).toContain('X-Requested-With');
		expect(response.headers['access-control-max-age']).toBe('86400');
	});

	test('should set CORS headers on DELETE request', async () => {
		const response = await testServer.authlessAgent
			.delete(`/credentials/${credentialId}/revoke?resolverId=${resolverId}`)
			.set('Origin', 'https://app.example.com')
			.set('Authorization', 'Bearer test-token')
			.set('X-Authorization', 'Bearer test-static-token');

		// Note: The test doesn't verify the full deletion flow, just CORS headers
		// A 400 may occur if validation fails, but we still check CORS headers
		expect([204, 400]).toContain(response.status);
		expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
		expect(response.headers['access-control-allow-methods']).toContain('DELETE');
		expect(response.headers['access-control-allow-methods']).toContain('OPTIONS');
	});
});

describe('GET /workflows/:workflowId/execution-status - CORS Integration', () => {
	let workflowId: string;

	async function setupTestData() {
		// Create a simple test workflow ID
		workflowId = randomId();

		// Register mock resolver
		const registry = Container.get(DynamicCredentialResolverRegistry);
		registry['resolverMap'].set('test-resolver', mockResolver);
	}

	beforeEach(async () => {
		await setupTestData();
	});

	test('should handle CORS preflight correctly', async () => {
		const response = await testServer.authlessAgent
			.options(`/workflows/${workflowId}/execution-status`)
			.set('Origin', 'https://app.example.com')
			.set('Access-Control-Request-Method', 'GET')
			.set('Access-Control-Request-Headers', 'Authorization, Content-Type');

		expect(response.status).toBe(204);
		expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
		expect(response.headers['access-control-allow-methods']).toContain('GET');
		expect(response.headers['access-control-allow-methods']).toContain('OPTIONS');
		expect(response.headers['access-control-allow-methods']).not.toContain('POST');
		expect(response.headers['access-control-allow-methods']).not.toContain('DELETE');
		expect(response.headers['access-control-allow-headers']).toBeDefined();
		expect(response.headers['access-control-allow-headers']).toContain('Authorization');
		expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
		expect(response.headers['access-control-allow-headers']).toContain('X-Requested-With');
		expect(response.headers['access-control-max-age']).toBe('86400');
	});

	test('should set CORS headers on GET request', async () => {
		// Mock the workflow status service to return a valid response
		const { CredentialResolverWorkflowService } = await import(
			'../services/credential-resolver-workflow.service'
		);
		const workflowService = Container.get(CredentialResolverWorkflowService);
		jest.spyOn(workflowService, 'getWorkflowStatus').mockResolvedValue([
			{
				credentialId: 'cred-123',
				resolverId: 'resolver-123',
				credentialName: 'Test Credential',
				status: 'configured',
				credentialType: 'oAuth2Api',
			},
		]);

		const response = await testServer.authlessAgent
			.get(`/workflows/${workflowId}/execution-status`)
			.set('Origin', 'https://app.example.com')
			.set('Authorization', 'Bearer test-token')
			.set('X-Authorization', 'Bearer test-static-token');

		expect(response.status).toBe(200);
		expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
		expect(response.headers['access-control-allow-methods']).toContain('GET');
		expect(response.headers['access-control-allow-methods']).toContain('OPTIONS');
		expect(response.body.data).toHaveProperty('workflowId', workflowId);
		expect(response.body.data).toHaveProperty('readyToExecute');
		expect(response.body.data).toHaveProperty('credentials');
	});
});
