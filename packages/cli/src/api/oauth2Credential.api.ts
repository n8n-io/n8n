/* eslint-disable import/no-cycle */
import express from 'express';
import { UserSettings } from 'n8n-core';
import { LoggerProxy } from 'n8n-workflow';
import { ResponseHelper } from '..';
import { RESPONSE_ERROR_MESSAGES } from '../constants';
import { CredentialsHelper } from '../CredentialsHelper';
import { getLogger } from '../Logger';
import { OAuthRequest } from '../requests';

export const oauth2CredentialController = express.Router();

/**
 * Initialize Logger if needed
 */
oauth2CredentialController.use((req, res, next) => {
	try {
		LoggerProxy.getInstance();
	} catch (error) {
		LoggerProxy.init(getLogger());
	}
	next();
});

/**
 * GET /oauth2-credential/scopes
 */
oauth2CredentialController.get(
	'/scopes',
	ResponseHelper.send(async (req: OAuthRequest.OAuth2Credential.Scopes): Promise<string[]> => {
		const { credentialType: type } = req.query;

		if (!type) {
			LoggerProxy.debug(
				'Request for OAuth2 credential scopes failed because of missing credential type in query string',
			);

			throw new ResponseHelper.ResponseError(
				RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL_TYPE,
				undefined,
				400,
			);
		}

		if (!type.endsWith('OAuth2Api')) {
			LoggerProxy.debug(
				'Request for OAuth2 credential scopes failed because requested credential type is not OAuth2',
			);

			throw new ResponseHelper.ResponseError(
				RESPONSE_ERROR_MESSAGES.CREDENTIAL_TYPE_NOT_OAUTH2,
				undefined,
				400,
			);
		}

		const encryptionKey = await UserSettings.getEncryptionKey();

		return new CredentialsHelper(encryptionKey).getScopes(type);
	}),
);
