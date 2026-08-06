import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { ICredentialContext, ICredentialResolutionContext } from 'n8n-workflow';

import type {
	VerifiedClaim,
	VerifiedClaimPolicy,
} from '@/services/external-token-verifier-proxy.service';
import { ExternalTokenVerifierProxy } from '@/services/external-token-verifier-proxy.service';
import type { VerifiedIdentityClaim } from '@/services/identity-resolution-proxy.service';
import { IdentityResolutionProxy } from '@/services/identity-resolution-proxy.service';

/** `Authorization: Bearer <token>` values are stored whole in some flows. */
function stripBearerPrefix(identity: string): string {
	return identity.replace(/^Bearer\s+/i, '').trim();
}

function asString(value: unknown): string | undefined {
	return typeof value === 'string' && value ? value : undefined;
}

/**
 * The inbound identity behind a credential-connect request.
 *
 * `verified`/`policy` are present only when a trusted source vouched for the
 * presented token. They stay on this runtime-only object and are deliberately
 * *not* folded into `context.claims`: the sealed `IVerifiedClaim` that rides
 * on an execution carries attribution alone (issuer, subject, audience), while
 * the IdP's profile attributes are needed here, once, to bind or provision.
 */
export type InboundIdentity = {
	context: ICredentialResolutionContext;
	verified?: VerifiedClaim;
	policy?: VerifiedClaimPolicy;
};

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
	async attachVerifiedClaim(context: ICredentialContext): Promise<InboundIdentity> {
		if (context.metadata?.source !== undefined && context.metadata.source !== 'external-idp') {
			return { context };
		}

		const token = stripBearerPrefix(context.identity);
		if (!token) return { context };

		const { claim, policy } = await this.externalTokenVerifierProxy.verifyInboundToken(token);
		if (!claim) return { context };

		return {
			context: {
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
			},
			verified: claim,
			policy,
		};
	}

	/**
	 * Ensures the claim is bound to an n8n user, provisioning one if the
	 * instance's identity policy allows it, so the read-only resolution that
	 * runs on every later credential access finds a binding.
	 *
	 * The IdP's profile attributes are passed through, not just issuer and
	 * subject: without an `email` claim the resolver can only match a binding
	 * that already exists, so a first-time SSO user - who has never logged
	 * into n8n and therefore has no `AuthIdentity` row - could never connect.
	 * `policy` comes from the trust source that vouched for the token and
	 * gates that provisioning (verified-email requirement, permitted roles).
	 *
	 * Returns the bound user id, or `undefined` when no binding could be
	 * established (no verifier, provisioning refused, role not permitted). The
	 * caller decides what that means - it must not be treated as an error on
	 * paths that also serve resolvers keyed on external subjects.
	 */
	async ensureBinding(
		claim: VerifiedClaim,
		policy?: VerifiedClaimPolicy,
	): Promise<string | undefined> {
		try {
			const user = await this.identityResolutionProxy.resolve(
				this.toIdentityClaim(claim),
				policy?.allowedRoles,
				{
					issuer: claim.issuer,
					kid: policy?.kid,
					// Fail closed: an unknown policy must not silently relax the
					// email check that every configured source defaults to.
					requireVerifiedEmail: policy?.requireVerifiedEmail ?? true,
				},
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

	/** Projects the IdP's raw attributes onto the claim shape the resolver reads. */
	private toIdentityClaim(claim: VerifiedClaim): VerifiedIdentityClaim {
		const { attributes } = claim;
		return {
			iss: claim.issuer,
			sub: claim.subject,
			email: asString(attributes.email),
			email_verified: attributes.email_verified === true,
			given_name: asString(attributes.given_name),
			family_name: asString(attributes.family_name),
			role: asString(attributes.role),
		};
	}
}
