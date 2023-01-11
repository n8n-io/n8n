/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unused-vars */
import express from 'express';
import { deepCopy, INodeCredentialTestResult, LoggerProxy } from 'n8n-workflow';

import * as GenericHelpers from '@/GenericHelpers';
import { InternalHooksManager } from '@/InternalHooksManager';
import * as ResponseHelper from '@/ResponseHelper';
import config from '@/config';
import { getLogger } from '@/Logger';
import { EECredentialsController } from './credentials.controller.ee';
import { CredentialsService } from './credentials.service';

import type { ICredentialsDb } from '@/Interfaces';
import type { CredentialRequest } from '@/requests';

export const credentialsController = express.Router();

/**
 * Initialize Logger if needed
 */
credentialsController.use((req, res, next) => {
	try {
		LoggerProxy.getInstance();
	} catch (error) {
		LoggerProxy.init(getLogger());
	}
	next();
});

credentialsController.use('/', EECredentialsController);

/**
 * GET /credentials
 */
credentialsController.get(
	'/',
	ResponseHelper.send(async (req: CredentialRequest.GetAll): Promise<ICredentialsDb[]> => {
		return CredentialsService.getAll(req.user, { roles: ['owner'] });
	}),
);

/**
 * GET /credentials/new
 *
 * Generate a unique credential name.
 */
credentialsController.get(
	'/new',
	ResponseHelper.send(async (req: CredentialRequest.NewName): Promise<{ name: string }> => {
		const { name: newName } = req.query;

		return {
			name: await GenericHelpers.generateUniqueName(
				newName ?? config.getEnv('credentials.defaultName'),
				'credentials',
			),
		};
	}),
);

/**
 * GET /credentials/:id
 */
credentialsController.get(
	'/:id(\\d+)',
	ResponseHelper.send(async (req: CredentialRequest.Get) => {
		const { id: credentialId } = req.params;
		const includeDecryptedData = req.query.includeData === 'true';

		const sharing = await CredentialsService.getSharing(req.user, credentialId, ['credentials']);

		if (!sharing) {
			throw new ResponseHelper.NotFoundError(
				`Credential with ID "${credentialId}" could not be found.`,
			);
		}

		const { credentials: credential } = sharing;

		const { data: _, ...rest } = credential;

		if (!includeDecryptedData) {
			return { ...rest };
		}

		const key = await CredentialsService.getEncryptionKey();
		const decryptedData = CredentialsService.redact(
			await CredentialsService.decrypt(key, credential),
			credential,
		);

		return { data: decryptedData, ...rest };
	}),
);

/**
 * POST /credentials/test
 *
 * Test if a credential is valid.
 */
credentialsController.post(
	'/test',
	ResponseHelper.send(async (req: CredentialRequest.Test): Promise<INodeCredentialTestResult> => {
		const { credentials } = req.body;

		const encryptionKey = await CredentialsService.getEncryptionKey();
		const sharing = await CredentialsService.getSharing(req.user, credentials.id);

		const mergedCredentials = deepCopy(credentials);
		if (mergedCredentials.data && sharing?.credentials) {
			const decryptedData = await CredentialsService.decrypt(encryptionKey, sharing.credentials);
			mergedCredentials.data = CredentialsService.unredact(mergedCredentials.data, decryptedData);
		}

		return CredentialsService.test(req.user, encryptionKey, mergedCredentials);
	}),
);

/**
 * POST /credentials
 */
credentialsController.post(
	'/',
	ResponseHelper.send(async (req: CredentialRequest.Create) => {
		const newCredential = await CredentialsService.prepareCreateData(req.body);

		const key = await CredentialsService.getEncryptionKey();
		const encryptedData = CredentialsService.createEncryptedData(key, null, newCredential);
		const credential = await CredentialsService.save(newCredential, encryptedData, req.user);

		void InternalHooksManager.getInstance().onUserCreatedCredentials({
			user: req.user,
			credential_name: newCredential.name,
			credential_type: credential.type,
			credential_id: credential.id,
			public_api: false,
		});

		return credential;
	}),
);

/**
 * PATCH /credentials/:id
 */
credentialsController.patch(
	'/:id(\\d+)',
	ResponseHelper.send(async (req: CredentialRequest.Update): Promise<ICredentialsDb> => {
		const { id: credentialId } = req.params;

		const sharing = await CredentialsService.getSharing(req.user, credentialId);

		if (!sharing) {
			LoggerProxy.info('Attempt to update credential blocked due to lack of permissions', {
				credentialId,
				userId: req.user.id,
			});
			throw new ResponseHelper.NotFoundError(
				'Credential to be updated not found. You can only update credentials owned by you',
			);
		}

		const { credentials: credential } = sharing;

		const key = await CredentialsService.getEncryptionKey();
		const decryptedData = await CredentialsService.decrypt(key, credential);
		const preparedCredentialData = await CredentialsService.prepareUpdateData(
			req.body,
			decryptedData,
		);
		const newCredentialData = CredentialsService.createEncryptedData(
			key,
			credentialId,
			preparedCredentialData,
		);

		const responseData = await CredentialsService.update(credentialId, newCredentialData);

		if (responseData === undefined) {
			throw new ResponseHelper.NotFoundError(
				`Credential ID "${credentialId}" could not be found to be updated.`,
			);
		}

		// Remove the encrypted data as it is not needed in the frontend
		const { data: _, ...rest } = responseData;

		LoggerProxy.verbose('Credential updated', { credentialId });

		return { ...rest };
	}),
);

/**
 * DELETE /credentials/:id
 */
credentialsController.delete(
	'/:id(\\d+)',
	ResponseHelper.send(async (req: CredentialRequest.Delete) => {
		const { id: credentialId } = req.params;

		const sharing = await CredentialsService.getSharing(req.user, credentialId);

		if (!sharing) {
			LoggerProxy.info('Attempt to delete credential blocked due to lack of permissions', {
				credentialId,
				userId: req.user.id,
			});
			throw new ResponseHelper.NotFoundError(
				'Credential to be deleted not found. You can only removed credentials owned by you',
			);
		}

		const { credentials: credential } = sharing;

		await CredentialsService.delete(credential);

		return true;
	}),
);
