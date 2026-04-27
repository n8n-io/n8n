import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ApiKey, ApiKeyRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomString } from 'n8n-workflow';

import { ScopedJwtStrategy } from '@/modules/token-exchange/services/scoped-jwt.strategy';
import { TOKEN_EXCHANGE_ISSUER } from '@/modules/token-exchange/token-exchange.types';
import { ApiKeyAuthStrategy } from '@/services/api-key-auth.strategy';
import { AuthStrategyRegistry } from '@/services/auth-strategy.registry';
import { JwtService } from '@/services/jwt.service';
import { createMember, createOwner, createOwnerWithApiKey } from '@test-integration/db/users';

import { McpServerApiKeyService } from '../mcp-api-key.service';

function makeScopedJwt(
	jwtService: JwtService,
	sub: string,
	opts: { actSub?: string; expired?: boolean } = {},
): string {
	const now = Math.floor(Date.now() / 1000);
	return jwtService.sign({
		iss: TOKEN_EXCHANGE_ISSUER,
		sub,
		...(opts.actSub && { act: { sub: opts.actSub } }),
		iat: opts.expired ? now - 7200 : now,
		exp: opts.expired ? now - 1 : now + 3600,
		jti: `jti-${randomString(8)}`,
	});
}

async function createMcpApiKey(user: User): Promise<string> {
	return (await Container.get(McpServerApiKeyService).createMcpServerApiKey(user)).apiKey;
}

describe('McpServerApiKeyService.verifyApiKey (integration)', () => {
	let service: McpServerApiKeyService;
	let jwtService: JwtService;

	beforeAll(async () => {
		await testDb.init();

		// Mirror the registration order set up by public API + token-exchange module init.
		const registry = Container.get(AuthStrategyRegistry);
		jwtService = Container.get(JwtService);
		registry.register(Container.get(ApiKeyAuthStrategy));
		registry.register(Container.get(ScopedJwtStrategy));

		service = Container.get(McpServerApiKeyService);
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('accepts a valid MCP API key and returns the owning user', async () => {
		const owner = await createOwner();
		const apiKey = await createMcpApiKey(owner);

		const result = await service.verifyApiKey(apiKey);

		expect(result.user?.id).toBe(owner.id);
		expect(result.actor).toBeUndefined();
		expect(result.context).toBeUndefined();
	});

	it('accepts a scoped JWT and returns the subject when no actor is present', async () => {
		const subject = await createOwner();

		const result = await service.verifyApiKey(makeScopedJwt(jwtService, subject.id));

		expect(result.user?.id).toBe(subject.id);
		expect(result.actor).toBeUndefined();
		expect(result.context).toBeUndefined();
	});

	it('accepts a scoped JWT with delegation and returns the actor as user', async () => {
		const subject = await createOwner();
		const actor = await createMember();

		const result = await service.verifyApiKey(
			makeScopedJwt(jwtService, subject.id, { actSub: actor.id }),
		);

		expect(result.user?.id).toBe(actor.id);
		expect(result.actor?.id).toBe(actor.id);
	});

	describe('rejects tokens that fail validation', () => {
		it.each([
			{
				name: 'garbage string',
				token: () => 'not-a-real-token',
			},
			{
				name: 'public API key (audience=public-api)',
				token: async () => {
					const owner = await createOwnerWithApiKey();
					return owner.apiKeys[0].apiKey;
				},
			},
			{
				name: 'MCP API key whose DB record was deleted',
				token: async () => {
					const owner = await createOwner();
					const apiKey = await createMcpApiKey(owner);
					await Container.get(ApiKeyRepository).delete({ apiKey });
					return apiKey;
				},
			},
			{
				name: 'expired scoped JWT',
				token: async () => {
					const subject = await createOwner();
					return makeScopedJwt(jwtService, subject.id, { expired: true });
				},
			},
			{
				name: 'scoped JWT whose subject is disabled',
				token: async () => {
					const subject = await createOwner();
					await Container.get(UserRepository).update({ id: subject.id }, { disabled: true });
					return makeScopedJwt(jwtService, subject.id);
				},
			},
			{
				name: 'scoped JWT whose actor is disabled',
				token: async () => {
					const subject = await createOwner();
					const actor = await createMember();
					await Container.get(UserRepository).update({ id: actor.id }, { disabled: true });
					return makeScopedJwt(jwtService, subject.id, { actSub: actor.id });
				},
			},
			{
				name: 'scoped JWT whose subject is not in the database',
				token: () => makeScopedJwt(jwtService, '00000000-0000-0000-0000-000000000000'),
			},
		])('rejects $name', async ({ token }) => {
			const result = await service.verifyApiKey(await token());

			expect(result.user).toBeNull();
			expect(result.context?.reason).toBe('invalid_token');
		});
	});

	it('rejects an MCP DB row whose stored JWT has a tampered audience', async () => {
		// Defense-in-depth: even if a row is manually altered to have audience=mcp-server-api,
		// the JWT verify step (with the expected audience) must still reject a token signed
		// with a different aud claim.
		const owner = await createOwner();
		const jwt = jwtService.sign({
			sub: owner.id,
			iss: 'n8n',
			aud: 'public-api',
			jti: 'tampered',
		});

		const entity = Container.get(ApiKeyRepository).create({
			userId: owner.id,
			apiKey: jwt,
			audience: 'mcp-server-api',
			scopes: [],
			label: `Tampered ${randomString(6)}`,
		});
		await Container.get(ApiKeyRepository).manager.insert(ApiKey, entity);

		const result = await service.verifyApiKey(jwt);

		expect(result.user).toBeNull();
		expect(result.context?.reason).toBe('invalid_token');
	});
});
