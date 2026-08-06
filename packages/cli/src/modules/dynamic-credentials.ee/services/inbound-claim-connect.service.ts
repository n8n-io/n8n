import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type {
	ICredentialContext,
	ICredentialResolutionContext,
	IVerifiedClaim,
} from 'n8n-workflow';

import { ExternalTokenVerifierProxy } from '@/services/external-token-verifier-proxy.service';
import { IdentityResolutionProxy } from '@/services/identity-resolution-proxy.service';

/** `Authorization: Bearer <token>` values are stored whole in some flows. */
function stripBearerPrefix(identity: string): string {
	return identity.replace(/^Bearer\s+/i, '').trim();
}

/**
 * Turns a presented inbound token into a usable identity on the credential
 * *connect* routes: verifies it, and establishes the binding to an n8n user if
 * one doesn't exist yet.
 *
 * Provisioning lives here and nowhere else. Connecting is an interactive act by
 * a caller who just presented a token, so binding then is sound; resolution
 * during an execution stays strictly read-only, which is what stops an inbound
 * trigger from creating users.
 */
@Service()
export class InboundClaimConnectService {
	constructor(
		private readonly logger: Logger,
		private readonly externalTokenVerifierProxy: ExternalTokenVerifierProxy,
		private readonly identityResolutionProxy: IdentityResolutionProxy,
	) {}

	/**
	 * Verifies the token carried as the context identity and, when it checks
	 * out, returns an `external-idp` context carrying the claim.
	 *
	 * Anything else is returned untouched: a context that already names its
	 * source (cookie, manual, n8n-oauth), and a token no trusted source
	 * vouches for - opaque tokens meant for an introspection resolver land
	 * here, and must keep resolving the way they do today.
	 */
	async attachVerifiedClaim(context: ICredentialContext): Promise<ICredentialResolutionContext> {
		if (context.metadata?.source !== undefined && context.metadata.source !== 'external-idp') {
			return context;
		}

		const token = stripBearerPrefix(context.identity);
		if (!token) return context;

		const { claim } = await this.externalTokenVerifierProxy.verifyInboundToken(token);
		if (!claim) return context;

		return {
			...context,
			metadata: { ...context.metadata, source: 'external-idp' },
			claims: {
				version: 1,
				sourceId: claim.sourceId,
				issuer: claim.issuer,
				subject: claim.subject,
				audience: Array.isArray(claim.audience) ? claim.audience[0] : claim.audience,
				expiresAt: claim.expiresAt.getTime(),
				// Only sealed onto an execution context; nothing to bind here.
				boundWorkflowId: '',
			},
		};
	}

	/**
	 * Ensures the claim is bound to an n8n user, provisioning one if the
	 * instance's identity policy allows it, so the read-only resolution that
	 * runs on every later credential access finds a binding.
	 *
	 * Returns the bound user id, or `undefined` when no binding could be
	 * established (no verifier, provisioning refused, role not permitted). The
	 * caller decides what that means - it must not be treated as an error on
	 * paths that also serve resolvers keyed on external subjects.
	 */
	async ensureBinding(claim: IVerifiedClaim): Promise<string | undefined> {
		try {
			const user = await this.identityResolutionProxy.resolve(
				{ iss: claim.issuer, sub: claim.subject },
				undefined,
				{ issuer: claim.issuer },
				true,
			);
			return user?.id;
		} catch (error) {
			this.logger.warn('Could not bind an inbound claim to an n8n user', {
				subject: claim.subject,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}
}
