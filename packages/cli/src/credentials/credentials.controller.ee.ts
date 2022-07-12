/* eslint-disable import/no-cycle */
import express from 'express';

import config from '../../config';
import type { CredentialRequest } from '../requests';
import { UserService } from '../user/user.service';
import { EECredentialsService as EECredentials } from './credentials.service.ee';

export const EECredentialsController = express.Router();

EECredentialsController.use((_req, _res, next) => {
	if (!config.getEnv('deployment.paid')) {
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
 * Grant a user access to a credential.
 */

EECredentialsController.post('/:id/share', async (req: CredentialRequest.Share, res) => {
	const { id } = req.params;
	const { shareeId } = req.body;

	const isOwned = EECredentials.isOwned(req.user.id, id);
	const getSharee = UserService.get({ id: shareeId });

	// parallelize DB requests and destructure results
	const [{ ownsCredential, credential }, sharee] = await Promise.all([isOwned, getSharee]);

	if (!ownsCredential || !credential) {
		return res.status(403).send();
	}

	if (!sharee || sharee.isPending) {
		return res.status(400).send('Bad Request');
	}

	await EECredentials.share(credential, sharee);

	return res.status(200).send();
});

/**
 * (EE) DELETE /credentials/:id/share
 *
 * Revoke a user's access to a credential.
 */

EECredentialsController.delete('/:id/share', async (req: CredentialRequest.Share, res) => {
	const { id } = req.params;
	const { shareeId } = req.body;

	const { ownsCredential } = await EECredentials.isOwned(req.user.id, id);

	if (!ownsCredential) {
		return res.status(403).send();
	}

	if (!shareeId || typeof shareeId !== 'string') {
		return res.status(400).send('Bad Request');
	}

	await EECredentials.unshare(id, shareeId);

	return res.status(200).send();
});
