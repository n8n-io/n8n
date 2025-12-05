import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { AuthenticatedRequest, CredentialsEntity, ICredentialsDb } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import Csrf from 'csrf';
import type { Response } from 'express';
import { Credentials } from 'n8n-core';
import type { ICredentialDataDecryptedObject, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { jsonParse, UnexpectedError } from 'n8n-workflow';

import {
	GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE,
	RESPONSE_ERROR_MESSAGES,
} from '@/constants';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsHelper } from '@/credentials-helper';
import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { OAuthRequest } from '@/requests';
import { UrlService } from '@/services/url.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

type CsrfStateRequired = {
	/** Random CSRF token, used to verify the signature of the CSRF state */
	token: string;
	/** Creation timestamp of the CSRF state. Used for expiration.  */
	createdAt: number;
};

type CreateCsrfStateData = {
	cid: string;
	[key: string]: unknown;
};

type CsrfState = CsrfStateRequired & CreateCsrfStateData;

const MAX_CSRF_AGE = 5 * Time.minutes.toMilliseconds;

export function shouldSkipAuthOnOAuthCallback() {
	const value = process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK?.toLowerCase() ?? 'false';
	return value === 'true';
}

export const skipAuthOnOAuthCallback = shouldSkipAuthOnOAuthCallback();

export const enum OauthVersion {
	V1 = 1,
	V2 = 2,
}

@Service()
export class OauthService {
	constructor(
		protected readonly logger: Logger,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
	) {}

	getBaseUrl(oauthVersion: OauthVersion) {
		const restUrl = `${this.urlService.getInstanceBaseUrl()}/${this.globalConfig.endpoints.rest}`;
		return `${restUrl}/oauth${oauthVersion}-credential`;
	}

	async getCredential(req: OAuthRequest.OAuth2Credential.Auth): Promise<CredentialsEntity> {
		const { id: credentialId } = req.query;

		if (!credentialId) {
			throw new BadRequestError('Required credential ID is missing');
		}

		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			req.user,
			['credential:read'],
		);

		if (!credential) {
			this.logger.error(
				'OAuth credential authorization failed because the current user does not have the correct permissions',
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

	async encryptAndSaveData(
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

	createCsrfState(data: CreateCsrfStateData): [string, string] {
		const token = new Csrf();
		const csrfSecret = token.secretSync();
		const state: CsrfState = {
			token: token.create(csrfSecret),
			createdAt: Date.now(),
			...data,
		};
		return [csrfSecret, Buffer.from(JSON.stringify(state)).toString('base64')];
	}

	protected decodeCsrfState(encodedState: string, req: AuthenticatedRequest): CsrfState {
		const errorMessage = 'Invalid state format';
		const decoded = jsonParse<CsrfState>(Buffer.from(encodedState, 'base64').toString(), {
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
		state: CsrfState,
	) {
		const token = new Csrf();

		return (
			Date.now() - state.createdAt <= MAX_CSRF_AGE &&
			decrypted.csrfSecret !== undefined &&
			token.verify(decrypted.csrfSecret, state.token)
		);
	}

	async resolveCredential<T>(
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

	renderCallbackError(res: Response, message: string, reason?: string) {
		res.render('oauth-error-callback', { error: { message, reason } });
	}

	async getOAuthCredentials<T>(credential: CredentialsEntity): Promise<T> {
		const additionalData = await this.getAdditionalData();
		const decryptedDataOriginal = await this.getDecryptedDataForAuthUri(credential, additionalData);

		// At some point in the past we saved hidden scopes to credentials (but shouldn't)
		// Delete scope before applying defaults to make sure new scopes are present on reconnect
		// Generic Oauth2 API is an exception because it needs to save the scope
		if (
			decryptedDataOriginal?.scope &&
			credential.type.includes('OAuth2') &&
			!GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE.includes(credential.type)
		) {
			delete decryptedDataOriginal.scope;
		}

		const oauthCredentials = await this.applyDefaultsAndOverwrites<T>(
			credential,
			decryptedDataOriginal,
			additionalData,
		);

		return oauthCredentials;
	}
}
