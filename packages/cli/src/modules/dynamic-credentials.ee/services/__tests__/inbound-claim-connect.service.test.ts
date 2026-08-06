import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { ICredentialContext } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type {
	ExternalTokenVerifierProxy,
	VerifiedClaimPolicy,
} from '@/services/external-token-verifier-proxy.service';
import type { IdentityResolutionProxy } from '@/services/identity-resolution-proxy.service';

import { InboundClaimConnectService } from '../inbound-claim-connect.service';

describe('InboundClaimConnectService', () => {
	let service: InboundClaimConnectService;
	let verifier: ExternalTokenVerifierProxy;
	let identityResolution: IdentityResolutionProxy;

	const expiresAt = new Date('2026-01-01T00:00:00.000Z');

	const verifiedClaim = {
		sourceId: 'idp-1',
		issuer: 'https://idp.example.com',
		subject: 'external-subject-1',
		audience: 'https://n8n.example.com',
		attributes: { role: 'admin' },
		expiresAt,
	};

	const policy: VerifiedClaimPolicy = {
		kid: 'kid-1',
		allowedRoles: ['global:member'],
		requireVerifiedEmail: true,
	};

	const bearerContext: ICredentialContext = {
		version: 1,
		identity: 'inbound-token',
		metadata: {},
	};

	beforeEach(() => {
		verifier = mock<ExternalTokenVerifierProxy>();
		identityResolution = mock<IdentityResolutionProxy>();
		service = new InboundClaimConnectService(mock<Logger>(), verifier, identityResolution);
	});

	describe('attachVerifiedClaim', () => {
		it('tags the context and attaches the claim when the token verifies', async () => {
			vi.mocked(verifier.verifyInboundToken).mockResolvedValue({ claim: verifiedClaim, policy });

			const { context } = await service.attachVerifiedClaim(bearerContext);

			expect(verifier.verifyInboundToken).toHaveBeenCalledWith('inbound-token');
			expect(context.metadata?.source).toBe('external-idp');
			expect(context.claims).toEqual({
				version: 1,
				sourceId: 'idp-1',
				issuer: 'https://idp.example.com',
				subject: 'external-subject-1',
				audience: 'https://n8n.example.com',
				expiresAt: expiresAt.getTime(),
				boundWorkflowId: '',
			});
			// The token stays available for resolvers that key on its own subject.
			expect(context.identity).toBe('inbound-token');
		});

		it('returns the full verified claim and its policy alongside the context', async () => {
			vi.mocked(verifier.verifyInboundToken).mockResolvedValue({ claim: verifiedClaim, policy });

			const result = await service.attachVerifiedClaim(bearerContext);

			// The sealed claim drops the IdP attributes; binding needs them.
			expect(result.verified).toBe(verifiedClaim);
			expect(result.policy).toBe(policy);
		});

		it('strips a Bearer prefix before verifying', async () => {
			vi.mocked(verifier.verifyInboundToken).mockResolvedValue({ claim: verifiedClaim, policy });

			await service.attachVerifiedClaim({ ...bearerContext, identity: 'Bearer inbound-token' });

			expect(verifier.verifyInboundToken).toHaveBeenCalledWith('inbound-token');
		});

		it('normalizes a multi-value audience to its first entry', async () => {
			vi.mocked(verifier.verifyInboundToken).mockResolvedValue({
				claim: { ...verifiedClaim, audience: ['first', 'second'] },
				policy,
			});

			const { context } = await service.attachVerifiedClaim(bearerContext);

			expect(context.claims?.audience).toBe('first');
		});

		it('leaves an unverifiable token untouched, so introspection resolvers keep working', async () => {
			vi.mocked(verifier.verifyInboundToken).mockResolvedValue({
				claim: null,
				context: { reason: 'invalid_token' },
			});

			const result = await service.attachVerifiedClaim(bearerContext);

			expect(result).toEqual({ context: bearerContext });
			expect(result.context.claims).toBeUndefined();
			expect(result.verified).toBeUndefined();
		});

		it('leaves a context that already names its source untouched', async () => {
			const cookieContext: ICredentialContext = {
				version: 1,
				identity: 'n8n-auth-cookie',
				metadata: { source: 'cookie-source' },
			};

			const result = await service.attachVerifiedClaim(cookieContext);

			expect(result).toEqual({ context: cookieContext });
			expect(verifier.verifyInboundToken).not.toHaveBeenCalled();
		});

		it('does not verify an empty identity', async () => {
			const { context } = await service.attachVerifiedClaim({ ...bearerContext, identity: '' });

			expect(context.claims).toBeUndefined();
			expect(verifier.verifyInboundToken).not.toHaveBeenCalled();
		});
	});

	describe('ensureBinding', () => {
		it('resolves the claim with provisioning allowed and returns the bound user', async () => {
			vi.mocked(identityResolution.resolve).mockResolvedValue(mock<User>({ id: 'user-1' }));

			const userId = await service.ensureBinding(verifiedClaim, policy);

			expect(userId).toBe('user-1');
			expect(identityResolution.resolve).toHaveBeenCalledWith(
				expect.objectContaining({
					iss: 'https://idp.example.com',
					sub: 'external-subject-1',
				}),
				['global:member'],
				{ issuer: 'https://idp.example.com', kid: 'kid-1', requireVerifiedEmail: true },
				// Connecting is interactive, so binding (and provisioning) is allowed here
				// and nowhere else.
				true,
			);
		});

		it("passes the IdP's profile attributes through, so a first-time user can be provisioned", async () => {
			vi.mocked(identityResolution.resolve).mockResolvedValue(mock<User>({ id: 'user-1' }));

			await service.ensureBinding(
				{
					...verifiedClaim,
					attributes: {
						email: 'jo@example.com',
						email_verified: true,
						given_name: 'Jo',
						family_name: 'Doe',
						role: 'global:member',
					},
				},
				policy,
			);

			expect(identityResolution.resolve).toHaveBeenCalledWith(
				{
					iss: 'https://idp.example.com',
					sub: 'external-subject-1',
					email: 'jo@example.com',
					email_verified: true,
					given_name: 'Jo',
					family_name: 'Doe',
					role: 'global:member',
				},
				expect.anything(),
				expect.anything(),
				true,
			);
		});

		it('drops non-string attributes rather than passing them on', async () => {
			vi.mocked(identityResolution.resolve).mockResolvedValue(mock<User>({ id: 'user-1' }));

			await service.ensureBinding(
				{ ...verifiedClaim, attributes: { email: 42, email_verified: 'yes', given_name: null } },
				policy,
			);

			expect(identityResolution.resolve).toHaveBeenCalledWith(
				expect.objectContaining({ email: undefined, email_verified: false, given_name: undefined }),
				expect.anything(),
				expect.anything(),
				true,
			);
		});

		it('requires a verified email when the policy is unknown', async () => {
			vi.mocked(identityResolution.resolve).mockResolvedValue(mock<User>({ id: 'user-1' }));

			await service.ensureBinding(verifiedClaim);

			expect(identityResolution.resolve).toHaveBeenCalledWith(
				expect.anything(),
				undefined,
				expect.objectContaining({ requireVerifiedEmail: true }),
				true,
			);
		});

		it('returns undefined when no binding could be established', async () => {
			vi.mocked(identityResolution.resolve).mockResolvedValue(null);

			expect(await service.ensureBinding(verifiedClaim, policy)).toBeUndefined();
		});

		it('returns undefined rather than throwing when the identity policy refuses', async () => {
			vi.mocked(identityResolution.resolve).mockRejectedValue(new Error('Role not allowed'));

			expect(await service.ensureBinding(verifiedClaim, policy)).toBeUndefined();
		});
	});
});
