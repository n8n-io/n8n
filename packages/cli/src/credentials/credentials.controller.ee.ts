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

EECredentialsController.put('/:id/share', async (req: CredentialRequest.Share, res) => {
	const { id } = req.params;
	const { shareWith } = req.body;

	const { ownsCredential, credential } = await EECredentials.isOwned(req.user, id);

	if (!ownsCredential || !credential) {
		return res.status(403).send();
	}

	await Db.transaction(async (trx) => {
		// remove all sharings that are not supposed to exist anymore
		await EECredentials.trxPruneSharings(trx, id, [req.user.id, ...shareWith]);

		const sharings = await EECredentials.trxGetSharings(trx, id);

		// extract the new sharings that need to be added
		const newShareeIds = rightDiff(
			[sharings, (sharing) => sharing.userId],
			[shareWith, (userId) => userId],
		);

		if (newShareeIds.length) {
			await EECredentials.trxShare(trx, credential, newShareeIds);
		}
	});

	return res.status(200).send();
});
