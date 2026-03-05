import { Service } from '@n8n/di';
import type { ICredentialContext } from 'n8n-workflow';

import { ITokenIdentifier } from './identifier-interface';

import { UserIdentityResolverService } from '@/auth/user-identity-resolver.service';

/**
 * N8N JWT token identifier.
 * Validates n8n authentication tokens and resolves them to user IDs.
 * Used by the N8N credential resolver to authenticate users via n8n's
 * built-in JWT authentication and store credentials per user.
 */
@Service()
export class N8NIdentifier implements ITokenIdentifier {
	constructor(private readonly userIdentityResolverService: UserIdentityResolverService) {}

	async validateOptions(_: Record<string, unknown>): Promise<void> {
		return;
	}

	async resolve(context: ICredentialContext, _: Record<string, unknown>): Promise<string> {
		return await this.userIdentityResolverService.resolveUserId(context);
	}
}
