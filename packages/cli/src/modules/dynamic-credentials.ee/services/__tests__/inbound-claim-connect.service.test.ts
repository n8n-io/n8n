import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { ICredentialContext, IVerifiedClaim } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ExternalTokenVerifierProxy } from '@/services/external-token-verifier-proxy.service';
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
			vi.mocked(verifier.verifyInboundToken).mockResolvedValue({ claim: verifiedClaim });

			const result = await service.attachVerifiedClaim(bearerContext);

			expect(verifier.verifyInboundToken).toHaveBeenCalledWith('inbound-token');
			expect(result.metadata?.source).toBe('external-idp');
			expect(result.claims).toEqual({
				version: 1,
				sourceId: 'idp-1',
				issuer: 'https://idp.example.com',
				subject: 'external-subject-1',
				audience: 'https://n8n.example.com',
				expiresAt: expiresAt.getTime(),
				boundWorkflowId: '',
			});
			// The token stays available for resolvers that key on its own subject.
			expect(result.identity).toBe('inbound-token');
		});

		it('strips a Bearer prefix before verifying', async () => {
			vi.mocked(verifier.verifyInboundToken).mockResolvedValue({ claim: verifiedClaim });

			await service.attachVerifiedClaim({ ...bearerContext, identity: 'Bearer inbound-token' });

			expect(verifier.verifyInboundToken).toHaveBeenCalledWith('inbound-token');
		});

		it('normalizes a multi-value audience to its first entry', async () => {
			vi.mocked(verifier.verifyInboundToken).mockResolvedValue({
				claim: { ...verifiedClaim, audience: ['first', 'second'] },
			});

			const result = await service.attachVerifiedClaim(bearerContext);

			expect(result.claims?.audience).toBe('first');
		});

		it('leaves an unverifiable token untouched, so introspection resolvers keep working', async () => {
			vi.mocked(verifier.verifyInboundToken).mockResolvedValue({
				claim: null,
				context: { reason: 'invalid_token' },
			});

			const result = await service.attachVerifiedClaim(bearerContext);

			expect(result).toEqual(bearerContext);
			expect(result.claims).toBeUndefined();
		});

		it('leaves a context that already names its source untouched', async () => {
			const cookieContext: ICredentialContext = {
				version: 1,
				identity: 'n8n-auth-cookie',
				metadata: { source: 'cookie-source' },
			};

			const result = await service.attachVerifiedClaim(cookieContext);

			expect(result).toEqual(cookieContext);
			expect(verifier.verifyInboundToken).not.toHaveBeenCalled();
		});

		it('does not verify an empty identity', async () => {
			const result = await service.attachVerifiedClaim({ ...bearerContext, identity: '' });

			expect(result.claims).toBeUndefined();
			expect(verifier.verifyInboundToken).not.toHaveBeenCalled();
		});
	});

	describe('ensureBinding', () => {
		const claim: IVerifiedClaim = {
			version: 1,
			sourceId: 'idp-1',
			issuer: 'https://idp.example.com',
			subject: 'external-subject-1',
			audience: 'https://n8n.example.com',
			expiresAt: expiresAt.getTime(),
			boundWorkflowId: '',
		};

		it('resolves the claim with provisioning allowed and returns the bound user', async () => {
			vi.mocked(identityResolution.resolve).mockResolvedValue(mock<User>({ id: 'user-1' }));

			const userId = await service.ensureBinding(claim);

			expect(userId).toBe('user-1');
			expect(identityResolution.resolve).toHaveBeenCalledWith(
				{ iss: 'https://idp.example.com', sub: 'external-subject-1' },
				undefined,
				{ issuer: 'https://idp.example.com' },
				// Connecting is interactive, so binding (and provisioning) is allowed here
				// and nowhere else.
				true,
			);
		});

		it('returns undefined when no binding could be established', async () => {
			vi.mocked(identityResolution.resolve).mockResolvedValue(null);

			expect(await service.ensureBinding(claim)).toBeUndefined();
		});

		it('returns undefined rather than throwing when the identity policy refuses', async () => {
			vi.mocked(identityResolution.resolve).mockRejectedValue(new Error('Role not allowed'));

			expect(await service.ensureBinding(claim)).toBeUndefined();
		});
	});
});
