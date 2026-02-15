import { Service } from '@n8n/di';
import type { ICredentialContext } from 'n8n-workflow';
import { ITokenIdentifier } from './identifier-interface';
import { AuthService } from '@/auth/auth.service';
import { z } from 'zod';
import { CredentialResolverError } from '@n8n/decorators';

const ChatHubExtractorMetadataSchema = z.object({
	method: z.string(),
	endpoint: z.string(),
	browserId: z.string().optional(),
});

/**
 * N8N JWT token identifier.
 * Validates n8n authentication tokens and resolves them to user IDs.
 * Used by the N8N credential resolver to authenticate users via n8n's
 * built-in JWT authentication and store credentials per user.
 */
@Service()
export class N8NIdentifier implements ITokenIdentifier {
	constructor(private readonly authService: AuthService) {}

	async validateOptions(_: Record<string, unknown>): Promise<void> {
		return;
	}

	async resolve(context: ICredentialContext, _: Record<string, unknown>): Promise<string> {
		const metadataResult = ChatHubExtractorMetadataSchema.safeParse(context.metadata);
		if (!metadataResult.success) {
			throw new CredentialResolverError(
				`Invalid context metadata: ${metadataResult.error.message}`,
			);
		}

		const user = await this.authService.authenticateUserBasedOnToken(
			context.identity,
			metadataResult.data.method,
			metadataResult.data.endpoint,
			metadataResult.data.browserId,
		);
		return user.id;
	}
}
