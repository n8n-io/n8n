import { GlobalConfig } from '@n8n/config';
import Csrf from 'csrf';
import type { Response } from 'express';
import { Credentials } from 'n8n-core';
import type { ICredentialDataDecryptedObject, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { jsonParse, ApplicationError } from 'n8n-workflow';
import { Service } from 'typedi';

import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { CredentialsHelper } from '@/credentials-helper';
import type { CredentialsEntity } from '@/databases/entities/credentials-entity';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExternalHooks } from '@/external-hooks';
import type { ICredentialsDb } from '@/interfaces';
import { Logger } from '@/logging/logger.service';
import type { OAuthRequest } from '@/requests';
import { UrlService } from '@/services/url.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

export interface CsrfStateParam {
	cid: string;
	token: string;
}

@Service()
export abstract class AbstractOAuthController {
	abstract oauthVersion: number;

	constructor(
		protected readonly logger: Logger,
		protected readonly externalHooks: ExternalHooks,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
	) {}

	get baseUrl() {
		const restUrl = `${this.urlService.getInstanceBaseUrl()}/${this.globalConfig.endpoints.rest}`;
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
			['credential:read'],
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

	protected async getAdditionalData() {
		return await WorkflowExecuteAdditionalData.getBase();
	}

	protected async getDecryptedData(
		credential: ICredentialsDb,
		additionalData: IWorkflowExecuteAdditionalData,
	) {
		return await this.credentialsHelper.getDecrypted(
			additionalData,
			credential,
			credential.type,
			'internal',
			undefined,
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
		const credentials = new Credentials(credential, credential.type);
		credentials.setData(decryptedData);
		await this.credentialsRepository.update(credential.id, {
			...credentials.getDataToSave(),
			updatedAt: new Date(),
		});
	}

	/** Get a credential without user check */
	protected async getCredentialWithoutUser(credentialId: string): Promise<ICredentialsDb | null> {
		return await this.credentialsRepository.findOneBy({ id: credentialId });
	}

	createCsrfState(credentialsId: string): [string, string] {
		const token = new Csrf();
		const csrfSecret = token.secretSync();
		const state: CsrfStateParam = {
			token: token.create(csrfSecret),
			cid: credentialsId,
		};
		return [csrfSecret, Buffer.from(JSON.stringify(state)).toString('base64')];
	}

	protected decodeCsrfState(encodedState: string): CsrfStateParam {
		const errorMessage = 'Invalid state format';
		const decoded = jsonParse<CsrfStateParam>(Buffer.from(encodedState, 'base64').toString(), {
			errorMessage,
		});
		if (typeof decoded.cid !== 'string' || typeof decoded.token !== 'string') {
			throw new ApplicationError(errorMessage);
		}
		return decoded;
	}

	protected verifyCsrfState(decrypted: ICredentialDataDecryptedObject, state: CsrfStateParam) {
		const token = new Csrf();
		return (
			decrypted.csrfSecret === undefined ||
			!token.verify(decrypted.csrfSecret as string, state.token)
		);
	}

	protected renderCallbackError(res: Response, message: string, reason?: string) {
		res.render('oauth-error-callback', { error: { message, reason } });
	}
}
