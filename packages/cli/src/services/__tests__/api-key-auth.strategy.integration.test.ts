import { testDb } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ApiKey, ApiKeyRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'crypto';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import { randomString } from 'n8n-workflow';

import { TOKEN_EXCHANGE_ISSUER } from '@/modules/token-exchange/token-exchange.types';
import { createOwnerWithApiKey } from '@test-integration/db/users';

import { ApiKeyAuthStrategy } from '../api-key-auth.strategy';
import { JwtService } from '../jwt.service';
import { API_KEY_ISSUER } from '../public-api-key.service';

const mockReqWith = (apiKey: string): AuthenticatedRequest =>
	mock<AuthenticatedRequest>({
		path: '/test',
		method: 'GET',
		headers: { 'x-n8n-api-key': apiKey },
	});

const mockReqWithoutApiKey = (): AuthenticatedRequest => {
	const req = mock<AuthenticatedRequest>({ path: '/test', method: 'GET' });
	// Override the deep-mock proxy so the header lookup returns undefined.
	req.headers = { host: 'localhost' } as AuthenticatedRequest['headers'];
	return req;
};

async function signAndStoreMcpApiKey(owner: User): Promise<string> {
	const apiKey = Container.get(JwtService).sign({
		sub: owner.id,
		iss: API_KEY_ISSUER,
		aud: 'mcp-server-api',
		jti: randomUUID(),
	});

	const entity = Container.get(ApiKeyRepository).create({
		userId: owner.id,
		apiKey,
		audience: 'mcp-server-api',
		scopes: [],
		label: `Test MCP Key ${randomString(6)}`,
	});
	await Container.get(ApiKeyRepository).manager.insert(ApiKey, entity);

	return apiKey;
}

let jwtService: JwtService;
let strategy: ApiKeyAuthStrategy;

describe('ApiKeyAuthStrategy', () => {
	beforeAll(async () => {
		await testDb.init();
		jwtService = Container.get(JwtService);
		strategy = new ApiKeyAuthStrategy(Container.get(ApiKeyRepository), jwtService);
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('buildTokenGrant', () => {
		it('returns a grant with subject, role scopes, and apiKeyScopes for a valid public API key', async () => {
			const owner = await createOwnerWithApiKey({ scopes: ['workflow:read', 'workflow:list'] });
			const [{ apiKey }] = owner.apiKeys;

			const grant = await strategy.buildTokenGrant(apiKey);

			if (!grant) throw new Error('expected grant');
			expect(grant.subject.id).toBe(owner.id);
			expect(grant.subject.role.slug).toBeDefined();
			// role scopes come from the user's role and are independent of the key's apiKeyScopes
			expect(grant.scopes.length).toBeGreaterThan(1);
			expect(grant.apiKeyScopes).toEqual(['workflow:read', 'workflow:list']);
		});

		it('accepts legacy (non-JWT) api keys by looking up the record directly', async () => {
			const legacyApiKey = `n8n_api_${randomString(10)}`;
			const owner = await createOwnerWithApiKey();
			const [{ apiKey }] = owner.apiKeys;
			await Container.get(ApiKeyRepository).update({ apiKey }, { apiKey: legacyApiKey });

			const grant = await strategy.buildTokenGrant(legacyApiKey);

			expect(grant).not.toBe(false);
			expect(grant).not.toBeNull();
			if (grant) expect(grant.subject.id).toBe(owner.id);
		});

		it('returns null when token is empty (abstain)', async () => {
			expect(await strategy.buildTokenGrant('')).toBeNull();
		});

		it('returns null for a JWT whose issuer does not match (abstain)', async () => {
			const tokenExchangeJwt = jwtService.sign({ iss: TOKEN_EXCHANGE_ISSUER, sub: '123' });
			expect(await strategy.buildTokenGrant(tokenExchangeJwt)).toBeNull();
		});

		it('returns false for tokens that cannot be validated', async () => {
			// Covers: non-JWT garbage, valid JWT not in DB, expired JWT, disabled user.
			// Each is a short setup with the same expected outcome — folded into one.
			expect(await strategy.buildTokenGrant('invalid')).toBe(false);

			const unknownKey = jwtService.sign({ sub: '123', iss: API_KEY_ISSUER });
			expect(await strategy.buildTokenGrant(unknownKey)).toBe(false);

			const expiredOwner = await createOwnerWithApiKey({
				expiresAt: DateTime.now().minus({ days: 1 }).toUnixInteger(),
			});
			expect(await strategy.buildTokenGrant(expiredOwner.apiKeys[0].apiKey)).toBe(false);

			const disabledOwner = await createOwnerWithApiKey();
			await Container.get(UserRepository).update({ id: disabledOwner.id }, { disabled: true });
			expect(await strategy.buildTokenGrant(disabledOwner.apiKeys[0].apiKey)).toBe(false);
		});

		it('rethrows non-TokenExpiredError from JWT verification', async () => {
			const owner = await createOwnerWithApiKey();
			const [{ apiKey }] = owner.apiKeys;

			const verifyError = new Error('Unexpected JWT error');
			jest.spyOn(jwtService, 'verify').mockImplementationOnce(() => {
				throw verifyError;
			});

			await expect(strategy.buildTokenGrant(apiKey)).rejects.toThrow(verifyError);
		});

		describe('audience option', () => {
			it('accepts an MCP API key only when audience=mcp-server-api is specified', async () => {
				const owner = await createOwnerWithApiKey();
				const mcpApiKey = await signAndStoreMcpApiKey(owner);

				// Default audience (public-api) → DB lookup misses on audience column.
				expect(await strategy.buildTokenGrant(mcpApiKey)).toBe(false);

				const grant = await strategy.buildTokenGrant(mcpApiKey, {
					audience: 'mcp-server-api',
				});
				if (!grant) throw new Error('expected grant');
				expect(grant.subject.id).toBe(owner.id);
			});

			it('rejects a public API key when audience=mcp-server-api is required', async () => {
				const owner = await createOwnerWithApiKey();
				const [{ apiKey }] = owner.apiKeys;

				expect(await strategy.buildTokenGrant(apiKey, { audience: 'mcp-server-api' })).toBe(false);
			});
		});
	});

	describe('authenticate (wrapper)', () => {
		it('returns null when no x-n8n-api-key header is present', async () => {
			expect(await strategy.authenticate(mockReqWithoutApiKey())).toBeNull();
		});

		it('returns true and populates req.user + req.tokenGrant on success', async () => {
			const owner = await createOwnerWithApiKey();
			const [{ apiKey }] = owner.apiKeys;
			const req = mockReqWith(apiKey);

			expect(await strategy.authenticate(req)).toBe(true);
			expect(req.user.id).toBe(owner.id);
			expect(req.tokenGrant?.subject.id).toBe(owner.id);
		});
	});
});
