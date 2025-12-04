import {
	ChatHubLLMProvider,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubConversationModel,
} from '@n8n/api-types';
import { type User, ProjectRepository } from '@n8n/db';
import { SharedWorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import type { INodeCredentials } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

@Service()
export class ChatHubCredentialsService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly projectRepository: ProjectRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	async ensureCredentials(
		user: User,
		provider: ChatHubLLMProvider,
		credentials: INodeCredentials,
		trx?: EntityManager,
	) {
		const credentialId = this.pickCredentialId(provider, credentials);
		if (!credentialId) {
			throw new BadRequestError('No credentials provided for the selected model provider');
		}

		return await this.ensureCredentialById(user, credentialId, trx);
	}

	async ensureCredentialById(user: User, credentialId: string, trx?: EntityManager) {
		const project = await this.projectRepository.getPersonalProjectForUser(user.id, trx);
		if (!project) {
			throw new ForbiddenError('Missing personal project');
		}

		const allCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			user,
			{
				projectId: project.id,
			},
		);

		const credential = allCredentials.find((c) => c.id === credentialId);
		if (!credential) {
			throw new ForbiddenError("You don't have access to the provided credentials");
		}

		return {
			id: credential.id,
			projectId: project.id,
		};
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

	async ensureWorkflowCredentials(
		provider: ChatHubLLMProvider,
		credentials: INodeCredentials,
		workflowId: string,
	) {
		const credentialId = this.pickCredentialId(provider, credentials);
		if (!credentialId) {
			throw new BadRequestError('No credentials provided for the selected model provider');
		}

		const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId);
		if (!project) {
			throw new ForbiddenError('Missing owner project for the workflow');
		}

		const workflowCredentials =
			await this.credentialsService.findAllCredentialIdsForWorkflow(workflowId);
		const globalCredentials = await this.credentialsService.findAllGlobalCredentialIds();
		workflowCredentials.push.apply(workflowCredentials, globalCredentials);

		const credential = workflowCredentials.find((c) => c.id === credentialId);
		if (!credential) {
			throw new ForbiddenError("You don't have access to the provided credentials");
		}

		return {
			id: credential.id,
			projectId: project.id,
		};
	}
}
