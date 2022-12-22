import express from 'express';
import { deepCopy, INodeCredentialTestResult, LoggerProxy } from 'n8n-workflow';
import * as Db from '@/Db';
import { InternalHooksManager } from '@/InternalHooksManager';
import * as ResponseHelper from '@/ResponseHelper';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';

import type { CredentialRequest } from '@/requests';
import { isSharingEnabled, rightDiff } from '@/UserManagement/UserManagementHelper';
import { EECredentialsService as EECredentials } from './credentials.service.ee';
import type { CredentialWithSharings } from './credentials.types';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const EECredentialsController = express.Router();

EECredentialsController.use((req, res, next) => {
	if (!isSharingEnabled()) {
		// skip ee router and use free one
		next('router');
		return;
	}
	// use ee router
	next();
});

/**
 * GET /credentials
 */
EECredentialsController.get(
	'/',
	ResponseHelper.send(async (req: CredentialRequest.GetAll): Promise<CredentialWithSharings[]> => {
		try {
			const allCredentials = await EECredentials.getAll(req.user, {
				relations: ['shared', 'shared.role', 'shared.user'],
			});

			// eslint-disable-next-line @typescript-eslint/unbound-method
			return allCredentials
				.map((credential: CredentialsEntity & CredentialWithSharings) =>
					EECredentials.addOwnerAndSharings(credential),
				)
				.map(
					(credential): CredentialWithSharings => ({ ...credential, id: credential.id.toString() }),
				);
		} catch (error) {
			LoggerProxy.error('Request to list credentials failed', error as Error);
			throw error;
		}
	}),
);

/**
 * GET /credentials/:id
 */
EECredentialsController.get(
	'/:id',
	(req, res, next) => (req.params.id === 'new' ? next('router') : next()), // skip ee router and use free one for naming
	ResponseHelper.send(async (req: CredentialRequest.Get) => {
		const { id: credentialId } = req.params;
		const includeDecryptedData = req.query.includeData === 'true';

		if (Number.isNaN(Number(credentialId))) {
			throw new ResponseHelper.BadRequestError(`Credential ID must be a number.`);
		}

		let credential = (await EECredentials.get(
			{ id: credentialId },
			{ relations: ['shared', 'shared.role', 'shared.user'] },
		)) as CredentialsEntity & CredentialWithSharings;

		if (!credential) {
			throw new ResponseHelper.NotFoundError(
				'Could not load the credential. If you think this is an error, ask the owner to share it with you again',
			);
		}

		const userSharing = credential.shared?.find((shared) => shared.user.id === req.user.id);

		if (!userSharing && req.user.globalRole.name !== 'owner') {
			throw new ResponseHelper.UnauthorizedError(`Forbidden.`);
		}

		credential = EECredentials.addOwnerAndSharings(credential);

		// @ts-ignore @TODO_TECH_DEBT: Stringify `id` with entity field transformer
		credential.id = credential.id.toString();

		if (!includeDecryptedData || !userSharing || userSharing.role.name !== 'owner') {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { id, data: _, ...rest } = credential;

			// @TODO_TECH_DEBT: Stringify `id` with entity field transformer
			return { id: id.toString(), ...rest };
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { id, data: _, ...rest } = credential;

		const key = await EECredentials.getEncryptionKey();
		const decryptedData = EECredentials.redact(
			await EECredentials.decrypt(key, credential),
			credential,
		);

		// @TODO_TECH_DEBT: Stringify `id` with entity field transformer
		return { id: id.toString(), data: decryptedData, ...rest };
	}),
);

/**
 * POST /credentials/test
 *
 * Test if a credential is valid.
 */
EECredentialsController.post(
	'/test',
	ResponseHelper.send(async (req: CredentialRequest.Test): Promise<INodeCredentialTestResult> => {
		const { credentials } = req.body;

		const encryptionKey = await EECredentials.getEncryptionKey();

		const { ownsCredential } = await EECredentials.isOwned(req.user, credentials.id.toString());

		const sharing = await EECredentials.getSharing(req.user, credentials.id);
		if (!ownsCredential) {
			if (!sharing) {
				throw new ResponseHelper.UnauthorizedError(`Forbidden`);
			}

			const decryptedData = await EECredentials.decrypt(encryptionKey, sharing.credentials);
			Object.assign(credentials, { data: decryptedData });
		}

		const mergedCredentials = deepCopy(credentials);
		if (mergedCredentials.data && sharing?.credentials) {
			const decryptedData = await EECredentials.decrypt(encryptionKey, sharing.credentials);
			mergedCredentials.data = EECredentials.unredact(mergedCredentials.data, decryptedData);
		}

		return EECredentials.test(req.user, encryptionKey, mergedCredentials);
	}),
);

/**
 * (EE) PUT /credentials/:id/share
 *
 * Grant or remove users' access to a credential.
 */

EECredentialsController.put(
	'/:credentialId/share',
	ResponseHelper.send(async (req: CredentialRequest.Share) => {
		const { credentialId } = req.params;
		const { shareWithIds } = req.body;

		if (
			!Array.isArray(shareWithIds) ||
			!shareWithIds.every((userId) => typeof userId === 'string')
		) {
			throw new ResponseHelper.BadRequestError('Bad request');
		}

		const { ownsCredential, credential } = await EECredentials.isOwned(req.user, credentialId);

		if (!ownsCredential || !credential) {
			throw new ResponseHelper.UnauthorizedError('Forbidden');
		}

		let amountRemoved: number | null = null;
		let newShareeIds: string[] = [];
		await Db.transaction(async (trx) => {
			// remove all sharings that are not supposed to exist anymore
			const { affected } = await EECredentials.pruneSharings(trx, credentialId, [
				req.user.id,
				...shareWithIds,
			]);
			if (affected) amountRemoved = affected;

			const sharings = await EECredentials.getSharings(trx, credentialId);

			// extract the new sharings that need to be added
			newShareeIds = rightDiff(
				[sharings, (sharing) => sharing.userId],
				[shareWithIds, (shareeId) => shareeId],
			);

			if (newShareeIds.length) {
				await EECredentials.share(trx, credential, newShareeIds);
			}
		});

		void InternalHooksManager.getInstance().onUserSharedCredentials({
			credential_type: credential.type,
			credential_id: credential.id.toString(),
			user_id_sharer: req.user.id,
			user_ids_sharees_added: newShareeIds,
			sharees_removed: amountRemoved,
		});
	}),
);
