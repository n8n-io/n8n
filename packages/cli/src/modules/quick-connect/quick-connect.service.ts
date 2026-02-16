import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { QuickConnectHandlerRegistry } from './handlers/quick-connect.handler';
import {
	QuickConnectBackendOption,
	QuickConnectConfig,
	QuickConnectOption,
} from './quick-connect.config';
import { QuickConnectError } from './quick-connect.errors';

@Service()
export class QuickConnectService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly config: QuickConnectConfig,
		private readonly handlerRegistry: QuickConnectHandlerRegistry,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('quick-connect');
	}

	async createCredential(credentialType: string, user: User, projectId?: string) {
		const option = this.config.options.find((opt) => opt.credentialType === credentialType);
		if (!option) {
			throw new NotFoundError(
				`Quick connect is not available for credential type: ${credentialType}`,
			);
		}

		const existingCredentials = await this.credentialsFinderService.findCredentialsForUser(user, [
			'credential:read',
		]);
		const hasExisting = existingCredentials.some((cred) => cred.type === credentialType);
		if (hasExisting) {
			throw new ConflictError(
				`A credential of type "${credentialType}" already exists. Quick connect only allows one credential per type.`,
			);
		}

		if (!this.isValidBackendConfig(option)) {
			throw new BadRequestError(
				`Quick connect is not configured for credential type: ${credentialType}`,
			);
		}

		const handler = this.handlerRegistry.get(credentialType);
		if (!handler) {
			throw new NotFoundError(`Quick connect handler not found for: ${credentialType}`);
		}

		if (!handler.getCredentialData) {
			throw new BadRequestError(
				`Quick connect flow for credential type ${credentialType} is not backend-based`,
			);
		}

		let credentialData: ICredentialDataDecryptedObject;
		try {
			credentialData = await handler.getCredentialData(option, user);
		} catch (error) {
			this.logger.error('Failed to fetch credential data from third-party', {
				error,
				credentialType,
			});
			throw new QuickConnectError(
				`Failed to connect to ${option.serviceName}. Please try again later.`,
				credentialType,
				error instanceof Error ? error : undefined,
			);
		}

		const credential = await this.credentialsService.createUnmanagedCredential(
			{
				name: `${option.serviceName} (Quick connect)`,
				type: credentialType,
				data: credentialData,
				projectId,
			},
			user,
		);

		// this object will have sensitive fields masked,
		// so no secrets are exposed to the frontend
		const decryptedCredential = await this.credentialsService.getOne(user, credential.id, true);
		this.logger.info('Quick connect credential created', {
			credentialId: credential.id,
			credentialType,
		});

		return decryptedCredential;
	}

	private isValidBackendConfig(config: QuickConnectOption): config is QuickConnectBackendOption {
		return (
			typeof config.backendFlowConfig?.secret === 'string' && config.backendFlowConfig.secret !== ''
		);
	}
}
