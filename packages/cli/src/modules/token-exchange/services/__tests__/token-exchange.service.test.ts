import { GLOBAL_MEMBER_ROLE, type User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ExternalTokenVerifierService } from '@/modules/identity-substrate/services/external-token-verifier.service';
import type { JwtService } from '@/services/jwt.service';

import type { TokenExchangeConfig } from '../../token-exchange.config';
import type { ResolvedTrustedKey } from '../../token-exchange.schemas';
import type { IdentityResolutionService } from '../identity-resolution.service';
import { TokenExchangeService } from '../token-exchange.service';

const externalTokenVerifierService = mock<ExternalTokenVerifierService>();
const identityResolutionService = mock<IdentityResolutionService>();
const config = mock<TokenExchangeConfig>();
const jwtService = mock<JwtService>();

const service = new TokenExchangeService(
	externalTokenVerifierService,
	identityResolutionService,
	config,
	jwtService,
);

const resolvedKey: ResolvedTrustedKey = {
	sourceId: 'test-source',
	kid: 'test-kid',
	algorithms: ['RS256'],
	key: 'test-public-key',
	issuer: 'https://issuer.example.com',
	allowedRoles: ['global:member', 'global:admin'],
	requireVerifiedEmail: false,
	subjectClaim: 'sub',
};

const mockUser = mock<User>({
	id: '123',
	email: 'user@example.com',
	role: GLOBAL_MEMBER_ROLE,
});

const now = Math.floor(Date.now() / 1000);
const validClaims = {
	sub: 'external-user-1',
	iss: 'https://issuer.example.com',
	aud: 'n8n',
	iat: now,
	exp: now + 30,
	jti: 'unique-jti-1',
	email: 'user@example.com',
};

describe('TokenExchangeService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('embedLogin', () => {
		it('should return user on valid token', async () => {
			externalTokenVerifierService.verifyToken.mockResolvedValue({
				claims: validClaims,
				resolvedKey,
			});
			identityResolutionService.resolve.mockResolvedValue(mockUser);

			const result = await service.embedLogin('valid-token');

			expect(result).toEqual({
				user: mockUser,
				subject: 'external-user-1',
				issuer: 'https://issuer.example.com',
				kid: 'test-kid',
			});
			expect(externalTokenVerifierService.verifyToken).toHaveBeenCalledWith('valid-token', {
				maxLifetimeSeconds: 60,
			});
			expect(identityResolutionService.resolve).toHaveBeenCalledWith(
				validClaims,
				resolvedKey.allowedRoles,
				{
					kid: resolvedKey.kid,
					issuer: resolvedKey.issuer,
					requireVerifiedEmail: resolvedKey.requireVerifiedEmail,
				},
				true,
			);
		});

		it('should propagate verification errors from the substrate verifier', async () => {
			externalTokenVerifierService.verifyToken.mockRejectedValue(new Error('Unknown key id'));

			await expect(service.embedLogin('bad-token')).rejects.toThrow('Unknown key id');
			expect(identityResolutionService.resolve).not.toHaveBeenCalled();
		});

		it('should propagate error from IdentityResolutionService', async () => {
			externalTokenVerifierService.verifyToken.mockResolvedValue({
				claims: validClaims,
				resolvedKey,
			});
			identityResolutionService.resolve.mockRejectedValue(new Error('User not found'));

			await expect(service.embedLogin('token')).rejects.toThrow('User not found');
		});
	});

	describe('exchange', () => {
		it('should issue a token for a valid subject_token', async () => {
			externalTokenVerifierService.verifyToken.mockResolvedValue({
				claims: validClaims,
				resolvedKey,
			});
			identityResolutionService.resolve.mockResolvedValue(mockUser);
			config.maxTokenTtl = 900;
			jwtService.sign.mockReturnValue('issued.jwt.token');

			const result = await service.exchange({
				grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
				subject_token: 'subject-token',
			});

			expect(result).toMatchObject({
				accessToken: 'issued.jwt.token',
				subjectUserId: mockUser.id,
				subject: validClaims.sub,
				issuer: validClaims.iss,
			});
			expect(externalTokenVerifierService.verifyToken).toHaveBeenCalledWith('subject-token');
			expect(externalTokenVerifierService.verifyToken).toHaveBeenCalledTimes(1);
		});

		it('should also verify and resolve an actor_token when present', async () => {
			const actorClaims = { ...validClaims, sub: 'actor-user-1', jti: 'actor-jti-1' };
			const actorUser = mock<User>({ id: 'actor-id', role: GLOBAL_MEMBER_ROLE });
			externalTokenVerifierService.verifyToken
				.mockResolvedValueOnce({ claims: validClaims, resolvedKey })
				.mockResolvedValueOnce({ claims: actorClaims, resolvedKey });
			identityResolutionService.resolve
				.mockResolvedValueOnce(actorUser)
				.mockResolvedValueOnce(mockUser);
			config.maxTokenTtl = 900;
			jwtService.sign.mockReturnValue('issued.jwt.token');

			const result = await service.exchange({
				grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
				subject_token: 'subject-token',
				actor_token: 'actor-token',
			});

			expect(result.actor).toBe('actor-user-1');
			expect(result.actorUserId).toBe('actor-id');
			expect(externalTokenVerifierService.verifyToken).toHaveBeenCalledTimes(2);
		});
	});
});
