import { PROVIDER_CREDENTIAL_TYPE_MAP, type ChatHubConversationModel } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import type { INodeCredentials } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { User, CredentialsEntity } from '@n8n/db';

export type CredentialWithProjectId = CredentialsEntity & { projectId: string };

@Service()
export class ChatHubCredentialsService {
	constructor(private readonly credentialsFinderService: CredentialsFinderService) {}

	async ensureCredentials(
		user: User,
		model: ChatHubConversationModel,
		credentials: INodeCredentials,
		trx?: EntityManager,
	): Promise<CredentialWithProjectId> {
		const allCredentials = await this.credentialsFinderService.findAllCredentialsForUser(
			user,
			['credential:read'],
			trx,
		);

		const credentialId = this.pickCredentialId(model.provider, credentials);
		if (!credentialId) {
			throw new BadRequestError('No credentials provided for the selected model provider');
		}

		// If credential is shared through multiple projects just pick the first one.
		const credential = allCredentials.find((c) => c.id === credentialId);
		if (!credential) {
			throw new ForbiddenError("You don't have access to the provided credentials");
		}
		return credential as CredentialWithProjectId;
	}

	async ensureCredentialById(
		user: User,
		credentialId: string,
		trx?: EntityManager,
	): Promise<CredentialWithProjectId> {
		const allCredentials = await this.credentialsFinderService.findAllCredentialsForUser(
			user,
			['credential:read'],
			trx,
		);

		const credential = allCredentials.find((c) => c.id === credentialId);
		if (!credential) {
			throw new ForbiddenError("You don't have access to the provided credentials");
		}
		return credential as CredentialWithProjectId;
	}

	private pickCredentialId(
		provider: ChatHubConversationModel['provider'],
		credentials: INodeCredentials,
	): string | null {
		if (provider === 'n8n' || provider === 'custom-agent') {
			return null;
		}

		return credentials[PROVIDER_CREDENTIAL_TYPE_MAP[provider]]?.id ?? null;
	}
}
