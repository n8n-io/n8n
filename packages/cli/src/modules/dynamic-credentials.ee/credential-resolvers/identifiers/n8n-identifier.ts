import { Service } from '@n8n/di';
import type { ICredentialContext, OAuthResourceGrant } from 'n8n-workflow';
import { ITokenIdentifier } from './identifier-interface';
import { AuthService } from '@/auth/auth.service';
import { z } from 'zod';
import { CredentialResolverError } from '@n8n/decorators';
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

/**
 * Declared here rather than shared from `n8n-workflow`: that package is on a different
 * zod major, so its schemas cannot compose into the union below. `satisfies` keeps this
 * in step with the {@link OAuthResourceGrant} type it validates.
 */
const OAuthResourceGrantSchema = z.object({
	audiences: z.array(z.string()).min(1),
	executeAccessWorkflowId: z.string().optional(),
}) satisfies z.ZodType<OAuthResourceGrant, z.ZodTypeDef, unknown>;

const N8nOAuthMetadataSchema = z.object({
	source: z.literal('n8n-oauth'),
	resource: z.string(),
	/** Absent for contexts sealed before grants existed, and for long-lived resources. */
	grant: OAuthResourceGrantSchema.optional(),
});

/** Exported for the drift test that keeps {@link N8N_IDENTITY_SOURCES} in step with it. */
export const N8NIdentifierMetadataSchema = z.discriminatedUnion('source', [
	ManualExecutionMetadataSchema,
	RequestBoundMetadataSchema,
	N8nOAuthMetadataSchema,
]);

/**
 * Every `source` the union above accepts. Kept in step with it by
 * `n8n-identifier.test.ts`, which fails if the schema gains a source this list lacks.
 */
export const N8N_IDENTITY_SOURCES: readonly string[] = [
	'manual-execution',
	'chat-hub-injected',
	'cookie-source',
	'n8n-oauth',
];

/**
 * Whether the context's identity is a token n8n itself issued (session cookie or
 * n8n-issued OAuth access token), as opposed to one minted by an external provider.
 *
 * Callers use it to keep an n8n token away from resolvers that would hand it to a
 * third party as if it were their own. Deliberately keyed on `source` alone rather
 * than the full schema: a malformed n8n-sourced context must still be recognised as
 * carrying an n8n token, not waved through as external.
 */
export function carriesN8nIdentity(context: ICredentialContext): boolean {
	const source = (context.metadata as { source?: unknown } | undefined)?.source;
	return typeof source === 'string' && N8N_IDENTITY_SOURCES.includes(source);
}

/**
 * N8N JWT token identifier.
 * Validates n8n authentication tokens and resolves them to user IDs.
 * Used by the N8N credential resolver to authenticate users via n8n's
 * built-in JWT authentication and store credentials per user.
 *
 * Supports two metadata shapes, discriminated by `source`:
 * - `manual-execution`: editor-triggered run; identity is the n8n auth cookie (JWT).
 *   Validated cryptographically without request-bound checks (browserId / endpoint).
 * - `chat-hub-injected` / `cookie-source`: request-bound run (chat-hub or
 *   web/cookie-based dynamic-credential resolution); identity is the n8n auth
 *   cookie captured from the HTTP request, validated with full request context
 *   (method, endpoint, browserId).
 */
@Service()
export class N8NIdentifier implements ITokenIdentifier {
	constructor(
		private readonly authService: AuthService,
		private readonly oauthTokenVerifierProxy: OAuthTokenVerifierProxy,
	) {}

	async validateOptions(_: Record<string, unknown>): Promise<void> {
		return;
	}

	async resolve(context: ICredentialContext, _: Record<string, unknown>): Promise<string> {
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

		if (metadataResult.data.source === 'n8n-oauth') {
			// Looked up afresh on every access, so by now the resource may be gone — the
			// sealed grant carries what the gate needs in that case.
			const user = await this.oauthTokenVerifierProxy.verifyOAuthAccessToken(
				context.identity,
				metadataResult.data.resource,
				metadataResult.data.grant,
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
}
