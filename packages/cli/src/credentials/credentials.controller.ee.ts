/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import express from 'express';

import * as config from '../../config';
import { UserService } from '../user/user.service';
import { EECreditentialsService as EECredentials } from './credentials.service.ee';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const EECredentialsController = express.Router();

// @ts-ignore
EECredentialsController.use((req, res, next) => {
	if (config.getEnv('deployment.paid')) {
		// use ee router
		next();
		return;
	}
	// skip ee router and use free one
	next('router');
});

// sharing a credential
EECredentialsController.post('/:id/share', async (req, res) => {
	const { id } = req.params;
	const { shareeId } = req.body;

	const isOwned = EECredentials.isOwned(req.user, id);
	const getSharee = UserService.get({ id: shareeId });

	// parallelize DB requests and destructure results
	const [[ownsCredential, credentials], sharee] = await Promise.all([isOwned, getSharee]);

	if (!ownsCredential) {
		return res.status(403).send('Forbidden');
	}

	if (!sharee || sharee.isPending) {
		return res.status(400).send('Bad Request');
	}

	await EECredentials.share(credentials!, sharee);

	return res.status(200).send();
});

// unshare a credential
EECredentialsController.delete('/:id/share', async (req, res) => {
	const { id } = req.params;
	const { shareeId } = req.body;

	const [ownsCredential] = await EECredentials.isOwned(req.user, id);

	if (!ownsCredential) {
		return res.status(403).send('Forbidden');
	}

	await EECredentials.unshare(id, shareeId);

	return res.status(200).send();
});
