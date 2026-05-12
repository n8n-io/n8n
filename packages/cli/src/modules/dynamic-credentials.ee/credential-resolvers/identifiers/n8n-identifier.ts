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
 * Manual-execution metadata: identity is a plain n8n user id, set by the
 * execution engine when a workflow is started from the editor. No JWT
 * validation needed since the REST endpoint that kicked off the run already
 * authenticated the user.
 */
const ManualExecutionMetadataSchema = z.object({
	source: z.literal('manual-execution'),
});

/**
 * N8N identity identifier. Two code paths:
 *  - chat-hub HTTP request: validates the JWT carried in `context.identity`
 *    and returns the resolved user id.
 *  - editor-triggered manual execution: treats `context.identity` as the user
 *    id directly.
 */
@Service()
export class N8NIdentifier implements ITokenIdentifier {
	constructor(private readonly authService: AuthService) {}

	async validateOptions(_: Record<string, unknown>): Promise<void> {
		return;
	}

	async resolve(context: ICredentialContext, _: Record<string, unknown>): Promise<string> {
		const manualResult = ManualExecutionMetadataSchema.safeParse(context.metadata);
		if (manualResult.success) {
			if (!context.identity) {
				throw new CredentialResolverError(
					'Manual execution context is missing the running user id',
				);
			}
			return context.identity;
		}

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
