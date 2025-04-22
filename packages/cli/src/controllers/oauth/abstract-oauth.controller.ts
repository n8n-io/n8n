import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import Csrf from 'csrf';
import type { Response } from 'express';
import { Credentials, Logger } from 'n8n-core';
import type { ICredentialDataDecryptedObject, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { jsonParse, UnexpectedError } from 'n8n-workflow';

import { RESPONSE_ERROR_MESSAGES, Time } from '@/constants';
import { CredentialsHelper } from '@/credentials-helper';
import type { CredentialsEntity } from '@/databases/entities/credentials-entity';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExternalHooks } from '@/external-hooks';
import type { ICredentialsDb } from '@/interfaces';
import type { AuthenticatedRequest, OAuthRequest } from '@/requests';
import { UrlService } from '@/services/url.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

type CsrfStateParam = {
	/** Id of the oAuth credential in the DB */
	cid: string;
	/** Random CSRF token, used to verify the signature of the CSRF state */
	token: string;
	/** Creation timestamp of the CSRF state. Used for expiration.  */
	createdAt: number;
	/** User who initiated OAuth flow, included to prevent cross-user credential hijacking. Optional only if `skipAuthOnOAuthCallback` is enabled. */
	userId?: string;
};

const MAX_CSRF_AGE = 5 * Time.minutes.toMilliseconds;

// TODO: Flip this flag in v2
// https://linear.app/n8n/issue/CAT-329
export const skipAuthOnOAuthCallback = process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK !== 'true';

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

	/**
	 * Allow decrypted data to evaluate expressions that include $secrets and apply overwrites
	 */
	protected async getDecryptedDataForAuthUri(
		credential: ICredentialsDb,
		additionalData: IWorkflowExecuteAdditionalData,
	) {
		return await this.getDecryptedData(credential, additionalData, false);
	}

	/**
	 * Do not apply overwrites here because that removes the CSRF state, and breaks the oauth flow
	 */
	protected async getDecryptedDataForCallback(
		credential: ICredentialsDb,
		additionalData: IWorkflowExecuteAdditionalData,
	) {
		return await this.getDecryptedData(credential, additionalData, true);
	}

	private async getDecryptedData(
		credential: ICredentialsDb,
		additionalData: IWorkflowExecuteAdditionalData,
		raw: boolean,
	) {
		return await this.credentialsHelper.getDecrypted(
			additionalData,
			credential,
			credential.type,
			'internal',
			undefined,
			raw,
		);
	}

	protected async applyDefaultsAndOverwrites<T>(
		credential: ICredentialsDb,
		decryptedData: ICredentialDataDecryptedObject,
		additionalData: IWorkflowExecuteAdditionalData,
	) {
		return (await this.credentialsHelper.applyDefaultsAndOverwrites(
			additionalData,
			decryptedData,
			credential,
			credential.type,
			'internal',
			undefined,
			undefined,
		)) as unknown as T;
	}

	protected async encryptAndSaveData(
		credential: ICredentialsDb,
		toUpdate: ICredentialDataDecryptedObject,
		toDelete: string[] = [],
	) {
		const credentials = new Credentials(credential, credential.type, credential.data);
		credentials.updateData(toUpdate, toDelete);
		await this.credentialsRepository.update(credential.id, {
			...credentials.getDataToSave(),
			updatedAt: new Date(),
		});
	}

	/** Get a credential without user check */
	protected async getCredentialWithoutUser(credentialId: string): Promise<ICredentialsDb | null> {
		return await this.credentialsRepository.findOneBy({ id: credentialId });
	}

	createCsrfState(credentialsId: string, userId?: string): [string, string] {
		const token = new Csrf();
		const csrfSecret = token.secretSync();
		const state: CsrfStateParam = {
			token: token.create(csrfSecret),
			cid: credentialsId,
			createdAt: Date.now(),
			userId,
		};
		return [csrfSecret, Buffer.from(JSON.stringify(state)).toString('base64')];
	}

	protected decodeCsrfState(encodedState: string, req: AuthenticatedRequest): CsrfStateParam {
		const errorMessage = 'Invalid state format';
		const decoded = jsonParse<CsrfStateParam>(Buffer.from(encodedState, 'base64').toString(), {
			errorMessage,
		});

		if (typeof decoded.cid !== 'string' || typeof decoded.token !== 'string') {
			throw new UnexpectedError(errorMessage);
		}

		if (decoded.userId !== req.user?.id) {
			throw new AuthError('Unauthorized');
		}

		return decoded;
	}

	protected verifyCsrfState(
		decrypted: ICredentialDataDecryptedObject & { csrfSecret?: string },
		state: CsrfStateParam,
	) {
		const token = new Csrf();

		return (
			Date.now() - state.createdAt <= MAX_CSRF_AGE &&
			decrypted.csrfSecret !== undefined &&
			token.verify(decrypted.csrfSecret, state.token)
		);
	}

	protected async resolveCredential<T>(
		req: OAuthRequest.OAuth1Credential.Callback | OAuthRequest.OAuth2Credential.Callback,
	): Promise<[ICredentialsDb, ICredentialDataDecryptedObject, T]> {
		const { state: encodedState } = req.query;
		const state = this.decodeCsrfState(encodedState, req);
		const credential = await this.getCredentialWithoutUser(state.cid);
		if (!credential) {
			throw new UnexpectedError('OAuth callback failed because of insufficient permissions');
		}

		const additionalData = await this.getAdditionalData();
		const decryptedDataOriginal = await this.getDecryptedDataForCallback(
			credential,
			additionalData,
		);

		const oauthCredentials = await this.applyDefaultsAndOverwrites<T>(
			credential,
			decryptedDataOriginal,
			additionalData,
		);

		if (!this.verifyCsrfState(decryptedDataOriginal, state)) {
			throw new UnexpectedError('The OAuth callback state is invalid!');
		}

		return [credential, decryptedDataOriginal, oauthCredentials];
	}

	protected renderCallbackError(res: Response, message: string, reason?: string) {
		res.render('oauth-error-callback', { error: { message, reason } });
	}
}
