import {
	ChatHubLLMProvider,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubConversationModel,
} from '@n8n/api-types';
import { ProjectRepository, SharedWorkflowRepository, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { EntityManager } from '@n8n/typeorm';
import type { INodeCredentials } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

@Service()
export class ChatHubCredentialsService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly projectRepository: ProjectRepository,
	) {}

	async ensureCredentialAccess(user: User, credentialId: string) {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:read'],
		);
		if (!credential) {
			throw new ForbiddenError("You don't have access to the provided credentials");
		}

		return credential;
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

	async findPersonalProject(user: User, trx?: EntityManager) {
		const project = await this.projectRepository.getPersonalProjectForUser(user.id, trx);
		if (!project) {
			throw new ForbiddenError('Missing personal project');
		}
		return project;
	}

	/**
	 * Only checks if the expected credential for the provider is present in the credentials object.
	 * Doesn't check access rights or existence in DB, those are checked by CredentialsPermissionChecker
	 * at execution time within the context and project of the workflow.
	 */
	findProviderCredential(provider: ChatHubLLMProvider, credentials: INodeCredentials) {
		const credentialId = this.pickCredentialId(provider, credentials);
		if (!credentialId) {
			throw new BadRequestError('No credentials provided for the selected model provider');
		}

		return credentialId;
	}

	async findWorkflowCredentialAndProject(
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
			credentialId: credential.id,
			projectId: project.id,
		};
	}
}
