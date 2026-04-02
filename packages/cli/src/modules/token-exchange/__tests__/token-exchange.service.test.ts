import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import jwt from 'jsonwebtoken';

import { JwtService } from '@/services/jwt.service';

import { TokenExchangeConfig } from '../token-exchange.config';
import { TOKEN_EXCHANGE_GRANT_TYPE } from '../token-exchange.schemas';
import { DelegationAuthorizationService } from '../services/delegation-authorization.service';
import { TokenExchangeService } from '../token-exchange.service';
import type { IssuedJwtPayload } from '../token-exchange.types';

/** Sign a minimal external token for use as subject_token / actor_token in tests. */
function makeExternalToken(
	claims: {
		sub: string;
		iss: string;
		aud: string;
		exp: number;
		email?: string;
		role?: string | string[];
	},
	secret = 'external-secret',
): string {
	const now = Math.floor(Date.now() / 1000);
	return jwt.sign(
		{
			sub: claims.sub,
			iss: claims.iss,
			aud: claims.aud,
			iat: now,
			exp: claims.exp,
			jti: 'test-jti',
			...(claims.email && { email: claims.email }),
			...(claims.role !== undefined && { role: claims.role }),
		},
		secret,
		{ algorithm: 'HS256' },
	);
}

describe('TokenExchangeService', () => {
	mockInstance(JwtService);
	const tokenExchangeConfig = mockInstance(TokenExchangeConfig);
	const delegationAuthService = mockInstance(DelegationAuthorizationService);

	const service = Container.get(TokenExchangeService);
	const jwtService = Container.get(JwtService);

	const now = Math.floor(Date.now() / 1000);
	const farFuture = now + 86400; // 24 hours from now

	const subjectToken = makeExternalToken({
		sub: 'user-123',
		iss: 'https://idp.example.com',
		aud: 'n8n',
		exp: farFuture,
	});

	const actorToken = makeExternalToken({
		sub: 'actor-456',
		iss: 'https://idp.example.com',
		aud: 'n8n',
		exp: farFuture,
	});

	const baseRequest = {
		grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
		subject_token: subjectToken,
	};

	beforeEach(() => {
		jest.resetAllMocks();
		tokenExchangeConfig.enabled = true;
		tokenExchangeConfig.maxTokenTtl = 900;
		delegationAuthService.canDelegate.mockResolvedValue({ allowed: true, missingScopes: [] });

		// Use real decode so we can read external token claims, but capture what gets signed.
		jest.mocked(jwtService.decode).mockImplementation((token: string) => jwt.decode(token));
		jest
			.mocked(jwtService.sign)
			.mockImplementation((payload: object) =>
				jwt.sign(payload, 'test-secret', { algorithm: 'HS256' }),
			);
		jest
			.mocked(jwtService.verify)
			.mockImplementation(
				(token: string) => jwt.verify(token, 'test-secret') as ReturnType<typeof jwtService.verify>,
			);
	});

	describe('JWT claims', () => {
		test('issued JWT contains correct sub and iss claims', async () => {
			const result = await service.exchange(baseRequest);

			const decoded = jwt.decode(result.accessToken) as IssuedJwtPayload;
			expect(decoded.sub).toBe('user-123');
			expect(decoded.iss).toBe('n8n');
		});

		test('issued JWT contains iat, exp, and jti claims', async () => {
			const result = await service.exchange(baseRequest);

			const decoded = jwt.decode(result.accessToken) as IssuedJwtPayload;
			expect(decoded.iat).toBeCloseTo(now, -1);
			expect(decoded.exp).toBeDefined();
			expect(typeof decoded.jti).toBe('string');
			expect(decoded.jti.length).toBeGreaterThan(0);
		});

		test('jti is unique across calls', async () => {
			const r1 = await service.exchange(baseRequest);
			const r2 = await service.exchange(baseRequest);

			const d1 = jwt.decode(r1.accessToken) as IssuedJwtPayload;
			const d2 = jwt.decode(r2.accessToken) as IssuedJwtPayload;
			expect(d1.jti).not.toBe(d2.jti);
		});

		test('act claim is absent when no actor_token provided', async () => {
			const result = await service.exchange(baseRequest);

			const decoded = jwt.decode(result.accessToken) as IssuedJwtPayload;
			expect(decoded.act).toBeUndefined();
		});

		test('act claim is present with actor sub when actor_token provided', async () => {
			const result = await service.exchange({ ...baseRequest, actor_token: actorToken });

			const decoded = jwt.decode(result.accessToken) as IssuedJwtPayload;
			expect(decoded.act).toEqual({ sub: 'actor-456' });
		});

		test('scope claim is string array derived from space-delimited request scope', async () => {
			const result = await service.exchange({ ...baseRequest, scope: 'openid profile email' });

			const decoded = jwt.decode(result.accessToken) as IssuedJwtPayload;
			expect(decoded.scope).toEqual(['openid', 'profile', 'email']);
		});

		test('scope claim is absent when no scope in request', async () => {
			const result = await service.exchange(baseRequest);

			const decoded = jwt.decode(result.accessToken) as IssuedJwtPayload;
			expect(decoded.scope).toBeUndefined();
		});

		test('resource claim is present when provided in request', async () => {
			const result = await service.exchange({
				...baseRequest,
				resource: 'https://api.example.com',
			});

			const decoded = jwt.decode(result.accessToken) as IssuedJwtPayload;
			expect(decoded.resource).toBe('https://api.example.com');
		});

		test('resource claim is absent when not in request', async () => {
			const result = await service.exchange(baseRequest);

			const decoded = jwt.decode(result.accessToken) as IssuedJwtPayload;
			expect(decoded.resource).toBeUndefined();
		});
	});

	describe('expiry calculation', () => {
		test('exp = min(subject.exp, now + maxTokenTtl) for impersonation (no actor)', async () => {
			tokenExchangeConfig.maxTokenTtl = 900;
			const result = await service.exchange(baseRequest);

			const decoded = jwt.decode(result.accessToken) as IssuedJwtPayload;
			// subject.exp is far future, so ceiling is now + 900
			expect(decoded.exp).toBeCloseTo(now + 900, -1);
			expect(result.expiresIn).toBeCloseTo(900, -1);
		});

		test('exp respects subject.exp when it is less than maxTokenTtl ceiling', async () => {
			const shortLived = makeExternalToken({
				sub: 'user-123',
				iss: 'https://idp.example.com',
				aud: 'n8n',
				exp: now + 300, // 5 minutes
			});
			tokenExchangeConfig.maxTokenTtl = 900;

			const result = await service.exchange({ ...baseRequest, subject_token: shortLived });

			const decoded = jwt.decode(result.accessToken) as IssuedJwtPayload;
			expect(decoded.exp).toBeCloseTo(now + 300, -1);
		});

		test('exp = min(subject.exp, actor.exp, now + maxTokenTtl) for delegation', async () => {
			const shortActor = makeExternalToken({
				sub: 'actor-456',
				iss: 'https://idp.example.com',
				aud: 'n8n',
				exp: now + 200, // actor expires soonest
			});
			tokenExchangeConfig.maxTokenTtl = 900;

			const result = await service.exchange({ ...baseRequest, actor_token: shortActor });

			const decoded = jwt.decode(result.accessToken) as IssuedJwtPayload;
			expect(decoded.exp).toBeCloseTo(now + 200, -1);
		});

		test('maxTokenTtl ceiling is enforced even when both tokens have far-future exp', async () => {
			tokenExchangeConfig.maxTokenTtl = 60;

			const result = await service.exchange({ ...baseRequest, actor_token: actorToken });

			const decoded = jwt.decode(result.accessToken) as IssuedJwtPayload;
			expect(decoded.exp).toBeCloseTo(now + 60, -1);
		});

		test('expiresIn in result matches exp - now', async () => {
			tokenExchangeConfig.maxTokenTtl = 900;
			const result = await service.exchange(baseRequest);

			const decoded = jwt.decode(result.accessToken) as IssuedJwtPayload;
			expect(result.expiresIn).toBeCloseTo(decoded.exp - now, -1);
		});
	});

	describe('result metadata', () => {
		test('subject in result is sub from subject_token', async () => {
			const result = await service.exchange(baseRequest);
			expect(result.subject).toBe('user-123');
		});

		test('issuer in result is iss from subject_token', async () => {
			const result = await service.exchange(baseRequest);
			expect(result.issuer).toBe('https://idp.example.com');
		});

		test('actor in result is sub from actor_token when present', async () => {
			const result = await service.exchange({ ...baseRequest, actor_token: actorToken });
			expect(result.actor).toBe('actor-456');
		});

		test('actor in result is undefined when no actor_token', async () => {
			const result = await service.exchange(baseRequest);
			expect(result.actor).toBeUndefined();
		});
	});

	describe('JWT verifiability', () => {
		test('issued JWT is verifiable with jwtService.verify()', async () => {
			const result = await service.exchange(baseRequest);
			expect(() => jwtService.verify(result.accessToken)).not.toThrow();
		});
	});

	describe('delegation authorization', () => {
		const actorWithRole = makeExternalToken({
			sub: 'actor-456',
			iss: 'https://idp.example.com',
			aud: 'n8n',
			exp: farFuture,
			role: 'project:editor',
		});

		test('should call canDelegate with actor role, requested scope, and resource when actor has role claim', async () => {
			await service.exchange({
				...baseRequest,
				actor_token: actorWithRole,
				scope: 'project:viewer',
				resource: 'project-123',
			});

			expect(delegationAuthService.canDelegate).toHaveBeenCalledWith(
				'project:editor',
				'project:viewer',
				'project-123',
			);
		});

		test('should throw when actor lacks required scopes for delegation', async () => {
			delegationAuthService.canDelegate.mockResolvedValue({
				allowed: false,
				missingScopes: ['workflow:update', 'workflow:create'],
			});

			await expect(
				service.exchange({
					...baseRequest,
					actor_token: actorWithRole,
					scope: 'project:editor',
				}),
			).rejects.toThrow('Actor is not permitted to delegate this role');
		});

		test('should not call canDelegate when actor_token has no role claim', async () => {
			await service.exchange({ ...baseRequest, actor_token: actorToken, scope: 'project:viewer' });

			expect(delegationAuthService.canDelegate).not.toHaveBeenCalled();
		});

		test('should not call canDelegate when no scope in request', async () => {
			await service.exchange({ ...baseRequest, actor_token: actorWithRole });

			expect(delegationAuthService.canDelegate).not.toHaveBeenCalled();
		});

		test('should not call canDelegate when no actor_token', async () => {
			await service.exchange({ ...baseRequest, scope: 'project:viewer' });

			expect(delegationAuthService.canDelegate).not.toHaveBeenCalled();
		});

		test('should use first element when actor role claim is an array', async () => {
			const actorWithArrayRole = makeExternalToken({
				sub: 'actor-456',
				iss: 'https://idp.example.com',
				aud: 'n8n',
				exp: farFuture,
				role: ['project:editor', 'project:admin'],
			});

			await service.exchange({
				...baseRequest,
				actor_token: actorWithArrayRole,
				scope: 'project:viewer',
			});

			expect(delegationAuthService.canDelegate).toHaveBeenCalledWith(
				'project:editor',
				'project:viewer',
				undefined,
			);
		});
	});

	describe('invalid input', () => {
		test('throws when subject_token has invalid claims structure', async () => {
			const badToken = jwt.sign({ sub: 'user' }, 'secret'); // missing required iss, aud, exp, jti

			await expect(service.exchange({ ...baseRequest, subject_token: badToken })).rejects.toThrow();
		});

		test('throws when subject_token is not a JWT', async () => {
			await expect(
				service.exchange({ ...baseRequest, subject_token: 'not-a-jwt' }),
			).rejects.toThrow();
		});

		test('throws when subject_token is expired', async () => {
			const expiredSubject = makeExternalToken({
				sub: 'user-123',
				iss: 'https://idp.example.com',
				aud: 'n8n',
				exp: now - 60, // expired 1 minute ago
			});

			await expect(
				service.exchange({ ...baseRequest, subject_token: expiredSubject }),
			).rejects.toThrow('subject_token is expired');
		});

		test('throws when actor_token is expired', async () => {
			const expiredActor = makeExternalToken({
				sub: 'actor-456',
				iss: 'https://idp.example.com',
				aud: 'n8n',
				exp: now - 60, // expired 1 minute ago
			});

			await expect(service.exchange({ ...baseRequest, actor_token: expiredActor })).rejects.toThrow(
				'actor_token is expired',
			);
		});
	});
});
