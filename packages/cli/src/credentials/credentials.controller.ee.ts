/* eslint-disable import/no-cycle */
import express from 'express';
import { Db } from '..';

import type { CredentialRequest } from '../requests';
import { EECredentialsService as EECredentials } from './credentials.service.ee';
import { isCredentialsSharingEnabled, rightDiff } from './helpers';

export const EECredentialsController = express.Router();

EECredentialsController.use((_req, _res, next) => {
	if (!isCredentialsSharingEnabled()) {
		// skip ee router and use free one
		next('router');
		return;
	}
	// use ee router
	next();
});

/**
 * (EE) POST /credentials/:id/share
 *
 * Grant or remove users' access to a credential.
 */

EECredentialsController.put('/:credentialId/share', async (req: CredentialRequest.Share, res) => {
	const { credentialId } = req.params;
	const { shareWith } = req.body;

	if (!Array.isArray(shareWith) || !shareWith.every((userId) => typeof userId === 'string')) {
		return res.status(400).send('Bad Request');
	}

	const { ownsCredential, credential } = await EECredentials.isOwned(req.user, credentialId);

	if (!ownsCredential || !credential) {
		return res.status(403).send();
	}

	await Db.transaction(async (trx) => {
		// remove all sharings that are not supposed to exist anymore
		await EECredentials.pruneSharings(trx, credentialId, [req.user.id, ...shareWith]);

		const sharings = await EECredentials.getSharings(trx, credentialId);

		// extract the new sharings that need to be added
		const newShareeIds = rightDiff(
			[sharings, (sharing) => sharing.userId],
			[shareWith, (shareeId) => shareeId],
		);

		if (newShareeIds.length) {
			await EECredentials.share(trx, credential, newShareeIds);
		}
	});

	return res.status(200).send();
});
