/* eslint-disable import/no-cycle */
import express from 'express';
import { INodeCredentialTestResult, LoggerProxy } from 'n8n-workflow';
import { Db, InternalHooksManager, ResponseHelper } from '..';
import type { CredentialsEntity } from '../databases/entities/CredentialsEntity';

import type { CredentialRequest } from '../requests';
import { EECredentialsService as EECredentials } from './credentials.service.ee';
import type { CredentialWithSharings } from './credentials.types';
import { isCredentialsSharingEnabled, rightDiff } from './helpers';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const EECredentialsController = express.Router();

EECredentialsController.use((req, res, next) => {
	if (!isCredentialsSharingEnabled()) {
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
			return allCredentials.map(EECredentials.addOwnerAndSharings);
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
			throw new ResponseHelper.ResponseError(`Credential ID must be a number.`, undefined, 400);
		}

		let credential = (await EECredentials.get(
			{ id: credentialId },
			{ relations: ['shared', 'shared.role', 'shared.user'] },
		)) as CredentialsEntity & CredentialWithSharings;

		if (!credential) {
			throw new ResponseHelper.ResponseError(
				`Credential with ID "${credentialId}" could not be found.`,
				undefined,
				404,
			);
		}

		const userSharing = credential.shared?.find((shared) => shared.user.id === req.user.id);

		if (!userSharing && req.user.globalRole.name !== 'owner') {
			throw new ResponseHelper.ResponseError(`Forbidden.`, undefined, 403);
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
		const decryptedData = await EECredentials.decrypt(key, credential);

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
		const { credentials, nodeToTestWith } = req.body;

		const encryptionKey = await EECredentials.getEncryptionKey();

		const { ownsCredential } = await EECredentials.isOwned(req.user, credentials.id.toString());

		if (!ownsCredential) {
			const sharing = await EECredentials.getSharing(req.user, credentials.id);
			if (!sharing) {
				throw new ResponseHelper.ResponseError(`Forbidden`, undefined, 403);
			}

			const decryptedData = await EECredentials.decrypt(encryptionKey, sharing.credentials);
			Object.assign(credentials, { data: decryptedData });
		}

		return EECredentials.test(req.user, encryptionKey, credentials, nodeToTestWith);
	}),
);

/**
 * (EE) PUT /credentials/:id/share
 *
 * Grant or remove users' access to a credential.
 */

EECredentialsController.put('/:credentialId/share', async (req: CredentialRequest.Share, res) => {
	const { credentialId } = req.params;
	const { shareWithIds } = req.body;

	if (!Array.isArray(shareWithIds) || !shareWithIds.every((userId) => typeof userId === 'string')) {
		return res.status(400).send('Bad Request');
	}

	const { ownsCredential, credential } = await EECredentials.isOwned(req.user, credentialId);

	if (!ownsCredential || !credential) {
		return res.status(403).send();
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

	return res.status(200).send();
});
