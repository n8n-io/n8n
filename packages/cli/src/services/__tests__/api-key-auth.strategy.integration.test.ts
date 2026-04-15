import { testDb } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest } from '@n8n/db';
import { ApiKeyRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { InstanceSettings } from 'n8n-core';
import { randomString } from 'n8n-workflow';

import { createOwnerWithApiKey } from '@test-integration/db/users';

import { ApiKeyAuthStrategy } from '../api-key-auth.strategy';
import { JwtService } from '../jwt.service';
import { TOKEN_EXCHANGE_ISSUER } from '@/modules/token-exchange/token-exchange.types';
import { API_KEY_ISSUER } from '../public-api-key.service';

const mockReqWith = (apiKey: string, path: string, method: string): AuthenticatedRequest =>
	mock<AuthenticatedRequest>({
		path,
		method,
		headers: {
			'x-n8n-api-key': apiKey,
		},
	});

const mockReqWithoutApiKey = (path: string, method: string): AuthenticatedRequest => {
	const req = mock<AuthenticatedRequest>({
		path,
		method,
	});
	// Override the deep-mock proxy so the header lookup returns undefined
	req.headers = { host: 'localhost' } as AuthenticatedRequest['headers'];
	return req;
};

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });

const jwtService = new JwtService(instanceSettings, mock());

let strategy: ApiKeyAuthStrategy;

describe('ApiKeyAuthStrategy', () => {
	beforeEach(async () => {
		await testDb.truncate(['User']);
	});

	beforeAll(async () => {
		await testDb.init();
		strategy = new ApiKeyAuthStrategy(Container.get(ApiKeyRepository), jwtService);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('should return null when no x-n8n-api-key header is present', async () => {
		const req = mockReqWithoutApiKey('/test', 'GET');
		expect(await strategy.authenticate(req)).toBeNull();
	});

	it('should return false if api key is invalid', async () => {
		const req = mockReqWith('invalid', '/test', 'GET');
		expect(await strategy.authenticate(req)).toBe(false);
	});

	it('should return false if valid api key is not in database', async () => {
		const apiKey = jwtService.sign({ sub: '123', iss: API_KEY_ISSUER });
		const req = mockReqWith(apiKey, '/test', 'GET');
		expect(await strategy.authenticate(req)).toBe(false);
	});

	it('should return true and set req.user if valid api key exists in the database', async () => {
		const owner = await createOwnerWithApiKey();
		const [{ apiKey }] = owner.apiKeys;
		const req = mockReqWith(apiKey, '/test', 'GET');

		expect(await strategy.authenticate(req)).toBe(true);
		expect(req.user).toBeDefined();
		expect(req.user.id).toBe(owner.id);
	});

	it('should set req.user.role on successful authentication', async () => {
		const owner = await createOwnerWithApiKey();
		const [{ apiKey }] = owner.apiKeys;
		const req = mockReqWith(apiKey, '/test', 'GET');

		await strategy.authenticate(req);

		expect(req.user.role).toBeDefined();
		expect(req.user.role.slug).toBeDefined();
	});

	it('should set req.tokenGrant with the scopes of the authenticated user role', async () => {
		const owner = await createOwnerWithApiKey();
		const [{ apiKey }] = owner.apiKeys;
		const req = mockReqWith(apiKey, '/test', 'GET');

		await strategy.authenticate(req);

		expect(req.tokenGrant).toBeDefined();
		expect(Array.isArray(req.tokenGrant?.scopes)).toBe(true);
	});

	it('should set req.tokenGrant.apiKeyScopes from the scopes stored on the API key', async () => {
		const owner = await createOwnerWithApiKey({ scopes: ['workflow:read', 'workflow:list'] });
		const [{ apiKey }] = owner.apiKeys;
		const req = mockReqWith(apiKey, '/test', 'GET');

		await strategy.authenticate(req);

		expect(req.tokenGrant?.apiKeyScopes).toEqual(['workflow:read', 'workflow:list']);
	});

	it('should set req.tokenGrant.apiKeyScopes independently from role scopes', async () => {
		const owner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });
		const [{ apiKey }] = owner.apiKeys;
		const req = mockReqWith(apiKey, '/test', 'GET');

		await strategy.authenticate(req);

		// role scopes come from the user's role — unaffected by the API key scopes restriction
		expect(Array.isArray(req.tokenGrant?.scopes)).toBe(true);
		expect(req.tokenGrant?.scopes.length).toBeGreaterThan(1);
		// apiKeyScopes reflects what was stored on the key
		expect(req.tokenGrant?.apiKeyScopes).toEqual(['workflow:read']);
	});

	it('should return false if expired JWT is used', async () => {
		const dateInThePast = DateTime.now().minus({ days: 1 }).toUnixInteger();
		const owner = await createOwnerWithApiKey({ expiresAt: dateInThePast });
		const [{ apiKey }] = owner.apiKeys;
		const req = mockReqWith(apiKey, '/test', 'GET');

		expect(await strategy.authenticate(req)).toBe(false);
	});

	it('should rethrow non-TokenExpiredError from JWT verification', async () => {
		const owner = await createOwnerWithApiKey();
		const [{ apiKey }] = owner.apiKeys;
		const req = mockReqWith(apiKey, '/test', 'GET');

		const verifyError = new Error('Unexpected JWT error');
		jest.spyOn(jwtService, 'verify').mockImplementationOnce(() => {
			throw verifyError;
		});

		await expect(strategy.authenticate(req)).rejects.toThrow(verifyError);
	});

	it('should work with non JWT (legacy) api keys', async () => {
		const legacyApiKey = `n8n_api_${randomString(10)}`;
		const owner = await createOwnerWithApiKey();
		const [{ apiKey }] = owner.apiKeys;

		await Container.get(ApiKeyRepository).update({ apiKey }, { apiKey: legacyApiKey });

		const req = mockReqWith(legacyApiKey, '/test', 'GET');

		expect(await strategy.authenticate(req)).toBe(true);
		expect(req.user).toBeDefined();
		expect(req.user.id).toBe(owner.id);
	});

	it('should return false if user is disabled', async () => {
		const owner = await createOwnerWithApiKey();
		await Container.get(UserRepository).update({ id: owner.id }, { disabled: true });
		const [{ apiKey }] = owner.apiKeys;
		const req = mockReqWith(apiKey, '/test', 'GET');

		expect(await strategy.authenticate(req)).toBe(false);
	});

	it('should set req.tokenGrant.subject to the API key owner', async () => {
		const owner = await createOwnerWithApiKey();
		const [{ apiKey }] = owner.apiKeys;
		const req = mockReqWith(apiKey, '/test', 'GET');

		await strategy.authenticate(req);

		expect(req.tokenGrant?.subject).toBeDefined();
		expect(req.tokenGrant?.subject.id).toBe(owner.id);
	});

	it('should return null when x-n8n-api-key contains a token-exchange JWT', async () => {
		const tokenExchangeJwt = jwtService.sign({ iss: TOKEN_EXCHANGE_ISSUER, sub: '123' });
		const req = mockReqWith(tokenExchangeJwt, '/test', 'GET');

		expect(await strategy.authenticate(req)).toBeNull();
	});
});
