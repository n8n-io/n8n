import express from 'express';
import type { INodeCredentialTestResult } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import * as ResponseHelper from '@/ResponseHelper';
import config from '@/config';
import { EECredentialsController } from './credentials.controller.ee';
import { CredentialsService } from './credentials.service';

import type { ICredentialsDb } from '@/Interfaces';
import type { CredentialRequest, ListQuery } from '@/requests';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';
import { listQueryMiddleware } from '@/middlewares';
import { Logger } from '@/Logger';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnauthorizedError } from '@/errors/response-errors/unauthorized.error';
import { NamingService } from '@/services/naming.service';

export const credentialsController = express.Router();
credentialsController.use('/', EECredentialsController);

/**
 * GET /credentials
 */
credentialsController.get(
	'/',
	listQueryMiddleware,
	ResponseHelper.send(async (req: ListQuery.Request) => {
		return await CredentialsService.getMany(req.user, { listQueryOptions: req.listQueryOptions });
	}),
);

/**
 * GET /credentials/new
 *
 * Generate a unique credential name.
 */
credentialsController.get(
	'/new',
	ResponseHelper.send(async (req: CredentialRequest.NewName) => {
		const requestedName = req.query.name ?? config.getEnv('credentials.defaultName');

		return {
			name: await Container.get(NamingService).getUniqueCredentialName(requestedName),
		};
	}),
);

/**
 * GET /credentials/:id
 */
credentialsController.get(
	'/:id(\\w+)',
	ResponseHelper.send(async (req: CredentialRequest.Get) => {
		const { id: credentialId } = req.params;
		const includeDecryptedData = req.query.includeData === 'true';

		const sharing = await CredentialsService.getSharing(
			req.user,
			credentialId,
			{ allowGlobalScope: true, globalScope: 'credential:read' },
			['credentials'],
		);

		if (!sharing) {
			throw new NotFoundError(`Credential with ID "${credentialId}" could not be found.`);
		}

		const { credentials: credential } = sharing;

		const { data: _, ...rest } = credential;

		if (!includeDecryptedData) {
			return { ...rest };
		}

		const decryptedData = CredentialsService.redact(
			CredentialsService.decrypt(credential),
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

		const sharing = await CredentialsService.getSharing(req.user, credentials.id, {
			allowGlobalScope: true,
			globalScope: 'credential:read',
		});

		const mergedCredentials = deepCopy(credentials);
		if (mergedCredentials.data && sharing?.credentials) {
			const decryptedData = CredentialsService.decrypt(sharing.credentials);
			mergedCredentials.data = CredentialsService.unredact(mergedCredentials.data, decryptedData);
		}

		return await CredentialsService.test(req.user, mergedCredentials);
	}),
);

/**
 * POST /credentials
 */
credentialsController.post(
	'/',
	ResponseHelper.send(async (req: CredentialRequest.Create) => {
		const newCredential = await CredentialsService.prepareCreateData(req.body);

		const encryptedData = CredentialsService.createEncryptedData(null, newCredential);
		const credential = await CredentialsService.save(newCredential, encryptedData, req.user);

		void Container.get(InternalHooks).onUserCreatedCredentials({
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
	'/:id(\\w+)',
	ResponseHelper.send(async (req: CredentialRequest.Update): Promise<ICredentialsDb> => {
		const { id: credentialId } = req.params;

		const sharing = await CredentialsService.getSharing(
			req.user,
			credentialId,
			{
				allowGlobalScope: true,
				globalScope: 'credential:update',
			},
			['credentials', 'role'],
		);

		if (!sharing) {
			Container.get(Logger).info(
				'Attempt to update credential blocked due to lack of permissions',
				{
					credentialId,
					userId: req.user.id,
				},
			);
			throw new NotFoundError(
				'Credential to be updated not found. You can only update credentials owned by you',
			);
		}

		if (sharing.role.name !== 'owner' && !req.user.hasGlobalScope('credential:update')) {
			Container.get(Logger).info(
				'Attempt to update credential blocked due to lack of permissions',
				{
					credentialId,
					userId: req.user.id,
				},
			);
			throw new UnauthorizedError('You can only update credentials owned by you');
		}

		const { credentials: credential } = sharing;

		const decryptedData = CredentialsService.decrypt(credential);
		const preparedCredentialData = await CredentialsService.prepareUpdateData(
			req.body,
			decryptedData,
		);
		const newCredentialData = CredentialsService.createEncryptedData(
			credentialId,
			preparedCredentialData,
		);

		const responseData = await CredentialsService.update(credentialId, newCredentialData);

		if (responseData === null) {
			throw new NotFoundError(`Credential ID "${credentialId}" could not be found to be updated.`);
		}

		// Remove the encrypted data as it is not needed in the frontend
		const { data: _, ...rest } = responseData;

		Container.get(Logger).verbose('Credential updated', { credentialId });

		return { ...rest };
	}),
);

/**
 * DELETE /credentials/:id
 */
credentialsController.delete(
	'/:id(\\w+)',
	ResponseHelper.send(async (req: CredentialRequest.Delete) => {
		const { id: credentialId } = req.params;

		const sharing = await CredentialsService.getSharing(
			req.user,
			credentialId,
			{
				allowGlobalScope: true,
				globalScope: 'credential:delete',
			},
			['credentials', 'role'],
		);

		if (!sharing) {
			Container.get(Logger).info(
				'Attempt to delete credential blocked due to lack of permissions',
				{
					credentialId,
					userId: req.user.id,
				},
			);
			throw new NotFoundError(
				'Credential to be deleted not found. You can only removed credentials owned by you',
			);
		}

		if (sharing.role.name !== 'owner' && !req.user.hasGlobalScope('credential:delete')) {
			Container.get(Logger).info(
				'Attempt to delete credential blocked due to lack of permissions',
				{
					credentialId,
					userId: req.user.id,
				},
			);
			throw new UnauthorizedError('You can only remove credentials owned by you');
		}

		const { credentials: credential } = sharing;

		await CredentialsService.delete(credential);

		return true;
	}),
);
