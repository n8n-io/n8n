import { Service } from '@n8n/di';
import type { ICredentialContext } from 'n8n-workflow';
import { ITokenIdentifier } from './identifier-interface';
import { AuthService } from '@/auth/auth.service';
import { z } from 'zod';
import { CredentialResolverError } from '@n8n/decorators';

const ManualExecutionMetadataSchema = z.object({
	source: z.literal('manual-execution'),
});

const RequestBoundMetadataSchema = z.object({
	source: z.enum(['chat-hub-injected', 'cookie-source']),
	method: z.string(),
	endpoint: z.string(),
	browserId: z.string().optional(),
});

const N8NIdentifierMetadataSchema = z.discriminatedUnion('source', [
	ManualExecutionMetadataSchema,
	RequestBoundMetadataSchema,
]);

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
	constructor(private readonly authService: AuthService) {}

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
