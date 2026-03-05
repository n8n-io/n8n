import { Service } from '@n8n/di';
import { CredentialResolverError } from '@n8n/decorators';
import type { ICredentialContext } from 'n8n-workflow';
import { z } from 'zod';

import { AuthService } from '@/auth/auth.service';

const ChatHubExtractorMetadataSchema = z.object({
	method: z.string(),
	endpoint: z.string(),
	browserId: z.string().optional(),
});

@Service()
export class UserIdentityResolverService {
	constructor(private readonly authService: AuthService) {}

	async resolveUserId(credentialContext: ICredentialContext): Promise<string> {
		const metadataResult = ChatHubExtractorMetadataSchema.safeParse(credentialContext.metadata);
		if (!metadataResult.success) {
			throw new CredentialResolverError(
				`Invalid context metadata: ${metadataResult.error.message}`,
			);
		}

		const user = await this.authService.authenticateUserBasedOnToken(
			credentialContext.identity,
			metadataResult.data.method,
			metadataResult.data.endpoint,
			metadataResult.data.browserId,
		);
		return user.id;
	}
}
