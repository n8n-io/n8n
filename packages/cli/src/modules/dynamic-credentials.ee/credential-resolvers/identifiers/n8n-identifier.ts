import { Service } from '@n8n/di';
import type { ICredentialResolutionContext } from 'n8n-workflow';
import { ITokenIdentifier } from './identifier-interface';
import { AuthService } from '@/auth/auth.service';
import { z } from 'zod';
import { CredentialResolverDataNotFoundError, CredentialResolverError } from '@n8n/decorators';
import { IdentityResolutionProxy } from '@/services/identity-resolution-proxy.service';
import { OAuthTokenVerifierProxy } from '@/services/oauth-token-verifier-proxy.service';

const ManualExecutionMetadataSchema = z.object({
	source: z.literal('manual-execution'),
});

const RequestBoundMetadataSchema = z.object({
	source: z.enum(['chat-hub-injected', 'cookie-source']),
	method: z.string(),
	endpoint: z.string(),
	browserId: z.string().optional(),
});

const N8nOAuthMetadataSchema = z.object({
	source: z.literal('n8n-oauth'),
	resource: z.string(),
});

const ExternalIdpMetadataSchema = z.object({
	source: z.literal('external-idp'),
});

const N8NIdentifierMetadataSchema = z.discriminatedUnion('source', [
	ManualExecutionMetadataSchema,
	RequestBoundMetadataSchema,
	N8nOAuthMetadataSchema,
	ExternalIdpMetadataSchema,
]);

/**
 * N8N JWT token identifier.
 * Validates n8n authentication tokens and resolves them to user IDs.
 * Used by the N8N credential resolver to authenticate users via n8n's
 * built-in JWT authentication and store credentials per user.
 *
 * Supports these metadata shapes, discriminated by `source`:
 * - `manual-execution`: editor-triggered run; identity is the n8n auth cookie (JWT).
 *   Validated cryptographically without request-bound checks (browserId / endpoint).
 * - `chat-hub-injected` / `cookie-source`: request-bound run (chat-hub or
 *   web/cookie-based dynamic-credential resolution); identity is the n8n auth
 *   cookie captured from the HTTP request, validated with full request context
 *   (method, endpoint, browserId).
 * - `n8n-oauth`: the caller presented an n8n-issued OAuth2 access token.
 * - `external-idp`: the caller presented an externally-issued token, verified once
 *   at context establishment. There is no identity token here - the principal is
 *   derived from the sealed claim on every access. See {@link resolveFromClaim}.
 */
@Service()
export class N8NIdentifier implements ITokenIdentifier {
	constructor(
		private readonly authService: AuthService,
		private readonly oauthTokenVerifierProxy: OAuthTokenVerifierProxy,
		private readonly identityResolutionProxy: IdentityResolutionProxy,
	) {}

	async validateOptions(_: Record<string, unknown>): Promise<void> {
		return;
	}

	async resolve(
		context: ICredentialResolutionContext,
		_: Record<string, unknown>,
	): Promise<string> {
		const metadataResult = N8NIdentifierMetadataSchema.safeParse(context.metadata);
		if (!metadataResult.success) {
			throw new CredentialResolverError(
				`Invalid context metadata: ${metadataResult.error.message}`,
			);
		}

		if (metadataResult.data.source === 'manual-execution') {
			// No HTTP request context at credential-resolution time; skip browserId/endpoint checks.
			const user = await this.authService.authenticateUserByCookie(context.identity);
			return user.id;
		}

		if (metadataResult.data.source === 'external-idp') {
			return await this.resolveFromClaim(context);
		}

		if (metadataResult.data.source === 'n8n-oauth') {
			const user = await this.oauthTokenVerifierProxy.verifyOAuthAccessToken(
				context.identity,
				metadataResult.data.resource,
			);
			if (!user?.user) {
				throw new CredentialResolverError(
					`Invalid OAuth token for resource ${metadataResult.data.resource}`,
				);
			}
			return user.user.id;
		}

		// Chat-hub / webhook run: validate the JWT together with the request-bound metadata
		// (browserId, endpoint, method) captured from the originating HTTP request.
		const user = await this.authService.authenticateUserBasedOnToken(
			context.identity,
			metadataResult.data.method,
			metadataResult.data.endpoint,
			metadataResult.data.browserId,
		);
		return user.id;
	}

	/**
	 * Re-derives the n8n principal from the caller's verified claim, on every
	 * access, so revoking the binding takes effect mid-execution and a resumed
	 * execution re-checks authority instead of trusting a stored principal.
	 *
	 * The expensive part (crypto, JWKS, trust sources) happened once, at context
	 * establishment; this is an indexed read plus a status check. Provisioning is
	 * never allowed here - an inbound trigger must not create users - and claim
	 * expiry deliberately does not gate access: the binding status is the live
	 * gate, so an execution outliving the token's `exp` still resolves.
	 *
	 * Every "no principal" case (no claim, claim sealed for another workflow,
	 * no binding, revoked binding, token-exchange module disabled) surfaces as
	 * `CredentialResolverDataNotFoundError`, so the credential reports "not
	 * connected" exactly as an unconnected credential does today.
	 */
	private async resolveFromClaim(context: ICredentialResolutionContext): Promise<string> {
		const claim = context.claims;
		if (!claim) {
			throw new CredentialResolverDataNotFoundError();
		}

		const user = await this.identityResolutionProxy.resolve(
			{ iss: claim.issuer, sub: claim.subject },
			// Key-scoped role restrictions are not applied on this read-only path.
			undefined,
			{ issuer: claim.issuer },
			false,
		);

		if (!user) {
			throw new CredentialResolverDataNotFoundError();
		}

		return user.id;
	}
}
