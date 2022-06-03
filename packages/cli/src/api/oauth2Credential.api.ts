/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import express from 'express';
import { Credentials, UserSettings } from 'n8n-core';
import _ from 'lodash';
import {
	LoggerProxy,
	WorkflowExecuteMode,
	INodeCredentialsDetails,
	ICredentialsEncrypted,
} from 'n8n-workflow';
import ClientOAuth2 from 'client-oauth2';
import querystring from 'querystring';
import Csrf from 'csrf';

import { externalHooks } from '../Server';

import { Db, ICredentialsDb, ResponseHelper, WebhookHelpers } from '..';
import { RESPONSE_ERROR_MESSAGES } from '../constants';
import { CredentialsHelper, getCredentialForUser } from '../CredentialsHelper';
import { getLogger } from '../Logger';
import { OAuthRequest } from '../requests';
import config from '../../config';

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
 * GET /oauth2-credential/auth
 *
 * Authorize OAuth Data
 */
oauth2CredentialController.get(
	'/auth',
	ResponseHelper.send(async (req: OAuthRequest.OAuth1Credential.Auth): Promise<string> => {
		const { id: credentialId } = req.query;

		if (!credentialId) {
			throw new ResponseHelper.ResponseError('Required credential ID is missing', undefined, 400);
		}

		const credential = await getCredentialForUser(credentialId, req.user);

		if (!credential) {
			LoggerProxy.error('Failed to authorize OAuth2 due to lack of permissions', {
				userId: req.user.id,
				credentialId,
			});
			throw new ResponseHelper.ResponseError(RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL, undefined, 404);
		}

		let encryptionKey: string;
		try {
			encryptionKey = await UserSettings.getEncryptionKey();
		} catch (error) {
			throw new ResponseHelper.ResponseError(error.message, undefined, 500);
		}

		const mode: WorkflowExecuteMode = 'internal';
		const timezone = config.getEnv('generic.timezone');
		const credentialsHelper = new CredentialsHelper(encryptionKey);
		const decryptedDataOriginal = await credentialsHelper.getDecrypted(
			credential as INodeCredentialsDetails,
			(credential as ICredentialsEncrypted).type,
			mode,
			timezone,
			true,
		);

		const oauthCredentials = credentialsHelper.applyDefaultsAndOverwrites(
			decryptedDataOriginal,
			(credential as ICredentialsEncrypted).type,
			mode,
			timezone,
		);

		const token = new Csrf();
		// Generate a CSRF prevention token and send it as a OAuth2 state stringma/ERR
		const csrfSecret = token.secretSync();
		const state = {
			token: token.create(csrfSecret),
			cid: req.query.id,
		};
		const stateEncodedStr = Buffer.from(JSON.stringify(state)).toString('base64');
		const restEndpoint = config.getEnv('endpoints.rest');

		const oAuthOptions: ClientOAuth2.Options = {
			clientId: _.get(oauthCredentials, 'clientId') as string,
			clientSecret: _.get(oauthCredentials, 'clientSecret', '') as string,
			accessTokenUri: _.get(oauthCredentials, 'accessTokenUrl', '') as string,
			authorizationUri: _.get(oauthCredentials, 'authUrl', '') as string,
			redirectUri: `${WebhookHelpers.getWebhookBaseUrl()}${restEndpoint}/oauth2-credential/callback`,
			scopes: _.split(_.get(oauthCredentials, 'scope', 'openid,') as string, ','),
			state: stateEncodedStr,
		};

		await externalHooks.run('oauth2.authenticate', [oAuthOptions]);

		const oAuthObj = new ClientOAuth2(oAuthOptions);

		// Encrypt the data
		const credentials = new Credentials(
			credential as INodeCredentialsDetails,
			(credential as ICredentialsEncrypted).type,
			(credential as ICredentialsEncrypted).nodesAccess,
		);
		decryptedDataOriginal.csrfSecret = csrfSecret;

		credentials.setData(decryptedDataOriginal, encryptionKey);
		const newCredentialsData = credentials.getDataToSave() as unknown as ICredentialsDb;

		// Add special database related data
		newCredentialsData.updatedAt = new Date();

		// Update the credentials in DB
		await Db.collections.Credentials.update(req.query.id, newCredentialsData);

		const authQueryParameters = _.get(oauthCredentials, 'authQueryParameters', '') as string;
		let returnUri = oAuthObj.code.getUri();

		// if scope uses comma, change it as the library always return then with spaces
		if ((_.get(oauthCredentials, 'scope') as string).includes(',')) {
			const data = querystring.parse(returnUri.split('?')[1]);
			data.scope = _.get(oauthCredentials, 'scope') as string;
			returnUri = `${_.get(oauthCredentials, 'authUrl', '') as string}?${querystring.stringify(
				data,
			)}`;
		}

		if (authQueryParameters) {
			returnUri += `&${authQueryParameters}`;
		}

		LoggerProxy.verbose('OAuth2 authentication successful for new credential', {
			userId: req.user.id,
			credentialId,
		});
		return returnUri;
	}),
);
