import type { AuthenticatedRequest, User } from '@n8n/db';
import type { UserRepository } from '@n8n/db';
import { ALL_API_KEY_SCOPES, type Scope as ScopeType } from '@n8n/permissions';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { JwtService } from '@/services/jwt.service';

import { TOKEN_EXCHANGE_ISSUER, type IssuedJwtPayload } from '../../token-exchange.types';
import { ScopedJwtStrategy } from '../scoped-jwt.strategy';

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });
const jwtService = new JwtService(instanceSettings, mock());
const otherJwtService = new JwtService(
	mock<InstanceSettings>({ encryptionKey: 'different-key' }),
	mock(),
);

/** Create a mock user with role.scopes pre-populated for scope assertions. */
function makeUser(id: string, scopeSlugs: string[] = [], disabled = false): User {
	return {
		...mock<User>(),
		id,
		disabled,
		role: {
			...mock<User['role']>(),
			scopes: scopeSlugs.map((slug) => ({ ...mock(), slug: slug as ScopeType })),
		},
	};
}

function makeTokenExchangeJwt(payload: Partial<IssuedJwtPayload> = {}): string {
	return jwtService.sign({
		iss: TOKEN_EXCHANGE_ISSUER,
		sub: 'subject-id',
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 3600,
		jti: 'test-jti',
		...payload,
	});
}

function makeBearerReq(token: string): AuthenticatedRequest {
	const req = mock<AuthenticatedRequest>();
	req.headers = { authorization: `Bearer ${token}` } as AuthenticatedRequest['headers'];
	return req;
}

function makeApiKeyReq(token: string): AuthenticatedRequest {
	const req = mock<AuthenticatedRequest>();
	req.headers = { 'x-n8n-api-key': token } as unknown as AuthenticatedRequest['headers'];
	return req;
}

function makeEmptyReq(): AuthenticatedRequest {
	const req = mock<AuthenticatedRequest>();
	req.headers = {} as AuthenticatedRequest['headers'];
	return req;
}

describe('ScopedJwtStrategy', () => {
	let strategy: ScopedJwtStrategy;
	let userRepository: jest.Mocked<UserRepository>;

	beforeEach(() => {
		userRepository = mock<UserRepository>();
		strategy = new ScopedJwtStrategy(jwtService, userRepository);
	});

	describe('token extraction', () => {
		it('returns null when neither Authorization nor x-n8n-api-key header is present', async () => {
			expect(await strategy.authenticate(makeEmptyReq())).toBeNull();
		});

		it('returns null for non-Bearer Authorization header', async () => {
			const req = mock<AuthenticatedRequest>();
			req.headers = { authorization: 'Basic dXNlcjpwYXNz' } as AuthenticatedRequest['headers'];
			expect(await strategy.authenticate(req)).toBeNull();
		});

		it('accepts token from x-n8n-api-key header', async () => {
			const subject = makeUser('subject-id', ['workflow:read']);
			userRepository.findOne.mockResolvedValue(subject);

			const token = makeTokenExchangeJwt();
			expect(await strategy.authenticate(makeApiKeyReq(token))).toBe(true);
		});
	});

	describe('issuer check', () => {
		it('returns null for a JWT with a non-token-exchange issuer', async () => {
			const foreignToken = jwtService.sign({ iss: 'https://idp.example.com', sub: '123' });
			expect(await strategy.authenticate(makeBearerReq(foreignToken))).toBeNull();
		});

		it('returns null for a JWT with the API key issuer', async () => {
			const apiKeyToken = jwtService.sign({ iss: 'n8n', sub: '123' });
			expect(await strategy.authenticate(makeBearerReq(apiKeyToken))).toBeNull();
		});
	});

	describe('signature and expiry', () => {
		it('returns false for an expired token-exchange JWT', async () => {
			const expiredToken = jwtService.sign({
				iss: TOKEN_EXCHANGE_ISSUER,
				sub: 'subject-id',
				iat: Math.floor(Date.now() / 1000) - 7200,
				exp: Math.floor(Date.now() / 1000) - 1,
				jti: 'test-jti',
			});
			expect(await strategy.authenticate(makeBearerReq(expiredToken))).toBe(false);
		});

		it('returns false for a token signed with a different key', async () => {
			const badToken = otherJwtService.sign({
				iss: TOKEN_EXCHANGE_ISSUER,
				sub: 'subject-id',
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600,
				jti: 'test-jti',
			});
			expect(await strategy.authenticate(makeBearerReq(badToken))).toBe(false);
		});
	});

	describe('user resolution', () => {
		it('returns false when subject is not found in DB', async () => {
			userRepository.findOne.mockResolvedValue(null);
			expect(await strategy.authenticate(makeBearerReq(makeTokenExchangeJwt()))).toBe(false);
		});

		it('returns false when subject is disabled', async () => {
			userRepository.findOne.mockResolvedValue(makeUser('subject-id', [], true));
			expect(await strategy.authenticate(makeBearerReq(makeTokenExchangeJwt()))).toBe(false);
		});

		it('continues without actor when act is present but actor not found in DB', async () => {
			const subject = makeUser('subject-id', ['workflow:read']);
			userRepository.findOne
				.mockResolvedValueOnce(subject) // subject lookup
				.mockResolvedValueOnce(null); // actor not found

			const token = makeTokenExchangeJwt({ act: { sub: 'unknown-actor' } });
			const req = makeBearerReq(token);

			expect(await strategy.authenticate(req)).toBe(true);
			expect(req.user).toBe(subject);
			expect(req.tokenGrant?.actor).toBeUndefined();
		});

		it('returns false when actor is found but disabled', async () => {
			const subject = makeUser('subject-id', ['workflow:read']);
			const actor = makeUser('actor-id', [], true); // disabled
			userRepository.findOne.mockResolvedValueOnce(subject).mockResolvedValueOnce(actor);

			const token = makeTokenExchangeJwt({ act: { sub: 'actor-id' } });
			expect(await strategy.authenticate(makeBearerReq(token))).toBe(false);
		});
	});

	describe('successful authentication', () => {
		it('sets req.user to subject and uses subject scopes when no act claim', async () => {
			const subject = makeUser('subject-id', ['workflow:read', 'workflow:create']);
			userRepository.findOne.mockResolvedValue(subject);

			const req = makeBearerReq(makeTokenExchangeJwt({ sub: 'subject-id' }));

			expect(await strategy.authenticate(req)).toBe(true);
			expect(req.user).toBe(subject);
			expect(req.tokenGrant?.subject).toBe(subject);
			expect(req.tokenGrant?.actor).toBeUndefined();
			expect(req.tokenGrant?.scopes).toEqual(['workflow:read', 'workflow:create']);
			expect(req.tokenGrant?.apiKeyScopes).toEqual(Array.from(ALL_API_KEY_SCOPES));
		});

		it('sets req.user to actor and uses actor scopes when act claim is present', async () => {
			const subject = makeUser('subject-id', ['workflow:read']);
			const actor = makeUser('actor-id', ['credential:read', 'credential:create']);
			userRepository.findOne.mockResolvedValueOnce(subject).mockResolvedValueOnce(actor);

			const token = makeTokenExchangeJwt({ sub: 'subject-id', act: { sub: 'actor-id' } });
			const req = makeBearerReq(token);

			expect(await strategy.authenticate(req)).toBe(true);
			expect(req.user).toBe(actor);
			expect(req.tokenGrant?.subject).toBe(subject);
			expect(req.tokenGrant?.actor).toBe(actor);
			expect(req.tokenGrant?.scopes).toEqual(['credential:read', 'credential:create']);
			expect(req.tokenGrant?.apiKeyScopes).toEqual(Array.from(ALL_API_KEY_SCOPES));
		});

		it('uses subject scopes when act is present but actor not found', async () => {
			const subject = makeUser('subject-id', ['workflow:read']);
			userRepository.findOne.mockResolvedValueOnce(subject).mockResolvedValueOnce(null); // actor not found

			const token = makeTokenExchangeJwt({ sub: 'subject-id', act: { sub: 'missing' } });
			const req = makeBearerReq(token);

			await strategy.authenticate(req);

			expect(req.tokenGrant?.scopes).toEqual(['workflow:read']);
			expect(req.tokenGrant?.apiKeyScopes).toEqual(Array.from(ALL_API_KEY_SCOPES));
			expect(req.user).toBe(subject);
		});

		it('sets apiKeyScopes to all API key scopes regardless of actor presence', async () => {
			const subject = makeUser('subject-id', ['workflow:read']);
			const actor = makeUser('actor-id', ['credential:read']);
			userRepository.findOne.mockResolvedValueOnce(subject).mockResolvedValueOnce(actor);

			const token = makeTokenExchangeJwt({ sub: 'subject-id', act: { sub: 'actor-id' } });
			const req = makeBearerReq(token);

			await strategy.authenticate(req);

			expect(req.tokenGrant?.apiKeyScopes).toEqual(Array.from(ALL_API_KEY_SCOPES));
		});
	});
});
