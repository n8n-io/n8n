import { Service } from 'typedi';
import { Credentials } from 'n8n-core';
import type { ICredentialDataDecryptedObject, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import config from '@/config';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { User } from '@db/entities/User';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import type { ICredentialsDb } from '@/Interfaces';
import { getInstanceBaseUrl } from '@/UserManagement/UserManagementHelper';
import type { OAuthRequest } from '@/requests';
import { BadRequestError, NotFoundError } from '@/ResponseHelper';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { CredentialsHelper } from '@/CredentialsHelper';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import { Logger } from '@/Logger';
import { ExternalHooks } from '@/ExternalHooks';

@Service()
export abstract class AbstractOAuthController {
	abstract oauthVersion: number;

	constructor(
		protected readonly logger: Logger,
		protected readonly externalHooks: ExternalHooks,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
	) {}

	get baseUrl() {
		const restUrl = `${getInstanceBaseUrl()}/${config.getEnv('endpoints.rest')}`;
		return `${restUrl}/oauth${this.oauthVersion}-credential`;
	}

	protected async getCredential(
		req: OAuthRequest.OAuth2Credential.Auth,
	): Promise<CredentialsEntity> {
		const { id: credentialId } = req.query;

		if (!credentialId) {
			throw new BadRequestError('Required credential ID is missing');
		}

		const credential = await this.sharedCredentialsRepository.findCredentialForUser(
			credentialId,
			req.user,
		);

		if (!credential) {
			this.logger.error(
				`OAuth${this.oauthVersion} credential authorization failed because the current user does not have the correct permissions`,
				{ userId: req.user.id },
			);
			throw new NotFoundError(RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL);
		}

		return credential;
	}

	protected async getAdditionalData(user: User) {
		return WorkflowExecuteAdditionalData.getBase(user.id);
	}

	protected async getDecryptedData(
		credential: ICredentialsDb,
		additionalData: IWorkflowExecuteAdditionalData,
	) {
		return this.credentialsHelper.getDecrypted(
			additionalData,
			credential,
			credential.type,
			'internal',
			true,
		);
	}

	protected applyDefaultsAndOverwrites<T>(
		credential: ICredentialsDb,
		decryptedData: ICredentialDataDecryptedObject,
		additionalData: IWorkflowExecuteAdditionalData,
	) {
		return this.credentialsHelper.applyDefaultsAndOverwrites(
			additionalData,
			decryptedData,
			credential.type,
			'internal',
		) as unknown as T;
	}

	protected async encryptAndSaveData(
		credential: ICredentialsDb,
		decryptedData: ICredentialDataDecryptedObject,
	) {
		const credentials = new Credentials(credential, credential.type, credential.nodesAccess);
		credentials.setData(decryptedData);
		await this.credentialsRepository.update(credential.id, {
			...credentials.getDataToSave(),
			updatedAt: new Date(),
		});
	}

	/** Get a credential without user check */
	protected async getCredentialWithoutUser(credentialId: string): Promise<ICredentialsDb | null> {
		return this.credentialsRepository.findOneBy({ id: credentialId });
	}
}
