/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return -- jest.mock factory */
jest.mock('@n8n/backend-common', () => {
	const actual = jest.requireActual('@n8n/backend-common');
	return {
		...actual,
		inProduction: true,
	};
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */

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
import type { CredentialResolverWorkflowService } from '../services/credential-resolver-workflow.service';

// Enable dynamic credentials feature flag
process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS = 'true';

// Mock license
const licenseMock = mock<LicenseState>();
licenseMock.isLicensed.mockReturnValue(true);
Container.set(LicenseState, licenseMock);

const RATE_LIMIT = 5;

mockInstance(DynamicCredentialsConfig, {
	corsOrigin: 'https://app.example.com',
	corsAllowCredentials: false,
	endpointAuthToken: 'test-static-token',
	rateLimitPerMinute: RATE_LIMIT,
	rateLimitAuthorizePerMinute: RATE_LIMIT,
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
let workflowService: CredentialResolverWorkflowService;

const mockResolver: ICredentialResolver = {
	metadata: {
		name: 'test-resolver',
		description: 'Test resolver for rate limit integration tests',
	},
	setSecret: jest.fn().mockResolvedValue(undefined),
	getSecret: jest
		.fn()
		.mockResolvedValue({ token: 'test-token', refreshToken: 'test-refresh-token' }),
	deleteSecret: jest.fn().mockResolvedValue(undefined),
	validateIdentity: jest.fn().mockResolvedValue(undefined),
	validateOptions: jest.fn(),
};

beforeAll(async () => {
	credentialsRepository = Container.get(CredentialsRepository);
	resolverRepository = Container.get(DynamicCredentialResolverRepository);
	cipher = Container.get(Cipher);
	oauthService = Container.get(OauthService);

	oauthService.generateAOauth2AuthUri = jest
		.fn()
		.mockResolvedValue('https://oauth.example.com/authorize');
	mockInstance(EnterpriseCredentialsService);

	const { CredentialResolverWorkflowService } = await import(
		'../services/credential-resolver-workflow.service'
	);
	workflowService = Container.get(CredentialResolverWorkflowService);
});

beforeEach(async () => {
	await testDb.truncate(['CredentialsEntity', 'DynamicCredentialResolver']);
});

function randomId() {
	return Math.random().toString(36).substring(2, 15);
}

function expectTooManyRequests(status: number, body: unknown) {
	expect(status).toBe(429);
	expect(body).toEqual({ message: 'Too many requests' });
}

const commonHeaders = {
	Origin: 'https://app.example.com',
	Authorization: 'Bearer test-token',
	'X-Authorization': 'Bearer test-static-token',
};

async function setupTestData() {
	const credential = await credentialsRepository.save(
		credentialsRepository.create({
			id: randomId(),
			name: 'Test OAuth2 Credential',
			type: 'oAuth2Api',
			data: cipher.encrypt({ clientId: 'test-client-id' }),
		}),
	);

	const resolver = await resolverRepository.save({
		id: randomId(),
		name: 'Test Resolver',
		type: 'test-resolver',
		config: cipher.encrypt(JSON.stringify({ apiKey: 'test-api-key' })),
	});

	const registry = Container.get(DynamicCredentialResolverRegistry);
	registry['resolverMap'].set('test-resolver', mockResolver);

	jest.spyOn(workflowService, 'getWorkflowStatus').mockResolvedValue([
		{
			credentialId: 'cred-123',
			resolverId: 'resolver-123',
			credentialName: 'Test Credential',
			status: 'configured',
			credentialType: 'oAuth2Api',
		},
	]);

	return {
		credentialId: credential.id,
		resolverId: resolver.id,
		workflowId: randomId(),
	};
}

describe('Dynamic credentials IP rate limiting (production)', () => {
	it('should enforce limit on POST /credentials/:id/authorize and not block OPTIONS', async () => {
		const { credentialId, resolverId } = await setupTestData();
		const authorizePath = `/credentials/${credentialId}/authorize?resolverId=${resolverId}`;

		for (let i = 0; i < RATE_LIMIT; i++) {
			const res = await testServer.authlessAgent.post(authorizePath).set(commonHeaders).send();
			expect(res.status).not.toBe(429);
		}

		const blocked = await testServer.authlessAgent.post(authorizePath).set(commonHeaders).send();
		expectTooManyRequests(blocked.status, blocked.body);

		// OPTIONS (preflight) must not be blocked even after limit is exhausted
		const optionsRes = await testServer.authlessAgent
			.options(authorizePath)
			.set('Origin', 'https://app.example.com')
			.set('Access-Control-Request-Method', 'POST')
			.set('Access-Control-Request-Headers', 'Authorization, Content-Type');
		expect(optionsRes.status).toBe(204);
	});

	it('should enforce limit on DELETE /credentials/:id/revoke', async () => {
		const { credentialId, resolverId } = await setupTestData();
		const revokePath = `/credentials/${credentialId}/revoke?resolverId=${resolverId}`;

		for (let i = 0; i < RATE_LIMIT; i++) {
			const res = await testServer.authlessAgent.delete(revokePath).set(commonHeaders);
			expect(res.status).not.toBe(429);
		}

		const blocked = await testServer.authlessAgent.delete(revokePath).set(commonHeaders);
		expectTooManyRequests(blocked.status, blocked.body);
	});

	it('should enforce limit on GET /workflows/:workflowId/execution-status', async () => {
		const { workflowId } = await setupTestData();
		const statusPath = `/workflows/${workflowId}/execution-status`;

		for (let i = 0; i < RATE_LIMIT; i++) {
			const res = await testServer.authlessAgent.get(statusPath).set(commonHeaders);
			expect(res.status).not.toBe(429);
		}

		const blocked = await testServer.authlessAgent.get(statusPath).set(commonHeaders);
		expectTooManyRequests(blocked.status, blocked.body);
	});
});
