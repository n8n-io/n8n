import type { AuthenticatedRequest, User, UserRepository } from '@n8n/db';
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

describe('ScopedJwtStrategy', () => {
	let strategy: ScopedJwtStrategy;
	let userRepository: jest.Mocked<UserRepository>;

	beforeEach(() => {
		userRepository = mock<UserRepository>();
		strategy = new ScopedJwtStrategy(jwtService, userRepository);
	});

	describe('buildTokenGrant', () => {
		it.each([
			['empty token', ''],
			['non-JWT garbage', 'not-a-jwt'],
			['JWT with a non-token-exchange issuer', jwtService.sign({ iss: 'n8n', sub: '123' })],
			['JWT with a foreign issuer', jwtService.sign({ iss: 'https://idp.example.com', sub: '1' })],
		])('returns null (abstains) for %s', async (_name, token) => {
			expect(await strategy.buildTokenGrant(token)).toBeNull();
		});

		it('returns false when signature or expiry fail', async () => {
			const expired = jwtService.sign({
				iss: TOKEN_EXCHANGE_ISSUER,
				sub: 'subject-id',
				iat: Math.floor(Date.now() / 1000) - 7200,
				exp: Math.floor(Date.now() / 1000) - 1,
				jti: 'test-jti',
			});
			const badSignature = otherJwtService.sign({
				iss: TOKEN_EXCHANGE_ISSUER,
				sub: 'subject-id',
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600,
				jti: 'test-jti',
			});

			expect(await strategy.buildTokenGrant(expired)).toBe(false);
			expect(await strategy.buildTokenGrant(badSignature)).toBe(false);
		});

		it('returns false when the subject is unknown or disabled', async () => {
			userRepository.findOne.mockResolvedValueOnce(null);
			expect(await strategy.buildTokenGrant(makeTokenExchangeJwt())).toBe(false);

			userRepository.findOne.mockResolvedValueOnce(makeUser('subject-id', [], true));
			expect(await strategy.buildTokenGrant(makeTokenExchangeJwt())).toBe(false);
		});

		it('returns false when the actor is present but disabled', async () => {
			const subject = makeUser('subject-id', ['workflow:read']);
			const actor = makeUser('actor-id', [], true);
			userRepository.findOne.mockResolvedValueOnce(subject).mockResolvedValueOnce(actor);

			const token = makeTokenExchangeJwt({ act: { sub: 'actor-id' } });

			expect(await strategy.buildTokenGrant(token)).toBe(false);
		});

		it('builds a grant with subject scopes when no actor is present', async () => {
			const subject = makeUser('subject-id', ['workflow:read', 'workflow:create']);
			userRepository.findOne.mockResolvedValue(subject);

			const grant = await strategy.buildTokenGrant(makeTokenExchangeJwt());

			if (!grant) throw new Error('expected grant');
			expect(grant.subject).toBe(subject);
			expect(grant.actor).toBeUndefined();
			expect(grant.scopes).toEqual(['workflow:read', 'workflow:create']);
			expect(grant.apiKeyScopes).toEqual(Array.from(ALL_API_KEY_SCOPES));
		});

		it('builds a grant with actor scopes when the act claim resolves', async () => {
			const subject = makeUser('subject-id', ['workflow:read']);
			const actor = makeUser('actor-id', ['credential:read', 'credential:create']);
			userRepository.findOne.mockResolvedValueOnce(subject).mockResolvedValueOnce(actor);

			const token = makeTokenExchangeJwt({ sub: 'subject-id', act: { sub: 'actor-id' } });
			const grant = await strategy.buildTokenGrant(token);

			if (!grant) throw new Error('expected grant');
			expect(grant.subject).toBe(subject);
			expect(grant.actor).toBe(actor);
			// Scopes come from the acting principal (actor) when one is resolved.
			expect(grant.scopes).toEqual(['credential:read', 'credential:create']);
		});

		it('falls back to subject scopes when the act claim is present but actor is not found', async () => {
			const subject = makeUser('subject-id', ['workflow:read']);
			userRepository.findOne.mockResolvedValueOnce(subject).mockResolvedValueOnce(null);

			const grant = await strategy.buildTokenGrant(
				makeTokenExchangeJwt({ act: { sub: 'unknown-actor' } }),
			);

			if (!grant) throw new Error('expected grant');
			expect(grant.actor).toBeUndefined();
			expect(grant.scopes).toEqual(['workflow:read']);
		});

		it('honours the issuer option override', async () => {
			const subject = makeUser('subject-id', ['workflow:read']);
			userRepository.findOne.mockResolvedValue(subject);

			const token = jwtService.sign({
				iss: 'custom-issuer',
				sub: 'subject-id',
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600,
				jti: 'test-jti',
			});

			expect(await strategy.buildTokenGrant(token, { issuer: 'custom-issuer' })).not.toBeNull();
			// Signed with the default issuer but caller expects something else → abstain.
			expect(
				await strategy.buildTokenGrant(makeTokenExchangeJwt(), { issuer: 'other-issuer' }),
			).toBeNull();
		});
	});

	describe('authenticate (wrapper)', () => {
		it.each([
			[
				'no auth headers',
				(): AuthenticatedRequest => {
					const req = mock<AuthenticatedRequest>();
					req.headers = {} as AuthenticatedRequest['headers'];
					return req;
				},
			],
			[
				'non-Bearer Authorization header',
				(): AuthenticatedRequest => {
					const req = mock<AuthenticatedRequest>();
					req.headers = {
						authorization: 'Basic dXNlcjpwYXNz',
					} as AuthenticatedRequest['headers'];
					return req;
				},
			],
		])('returns null when %s', async (_name, makeReq) => {
			expect(await strategy.authenticate(makeReq())).toBeNull();
		});

		it('sets req.user to the acting principal and populates req.tokenGrant', async () => {
			const subject = makeUser('subject-id', ['workflow:read']);
			const actor = makeUser('actor-id', ['credential:read']);
			userRepository.findOne.mockResolvedValueOnce(subject).mockResolvedValueOnce(actor);

			const token = makeTokenExchangeJwt({ sub: 'subject-id', act: { sub: 'actor-id' } });
			const req = makeBearerReq(token);

			expect(await strategy.authenticate(req)).toBe(true);
			expect(req.user).toBe(actor);
			expect(req.tokenGrant?.subject).toBe(subject);
			expect(req.tokenGrant?.actor).toBe(actor);
		});
	});
});
