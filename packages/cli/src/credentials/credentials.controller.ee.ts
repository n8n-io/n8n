/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import express from 'express';

import * as config from '../../config';
import { CredentialRequest } from '../requests';
import { UserService } from '../user/user.service';
import { EE as Enterprise } from './credentials.service.ee';

export const EE = {
	CredentialsController: express.Router(),
	CredentialsService: Enterprise.CredentialsService,
};

// @ts-ignore
EE.CredentialsController.use((req, res, next) => {
	if (config.getEnv('deployment.paid')) {
		// use ee router
		next();
		return;
	}
	// skip ee router and use free one
	next('router');
});

EE.CredentialsController.post('/:id/share', async (req: CredentialRequest.Share, res) => {
	const { id } = req.params;
	const { shareeId } = req.body;
	const isOwned = await EE.CredentialsService.isOwned(req.user, id);
	const getSharee = UserService.get({ id: shareeId });

	// parallelize DB requests and destructure results
	const [{ ownsCredential, credential }, sharee] = await Promise.all([isOwned, getSharee]);

	if (!ownsCredential) {
		// TODO: check whether credential actually exists for 404
		return res.status(403).send('Forbidden');
	}

	if (!sharee || sharee.isPending) {
		return res.status(400).send('Bad Request');
	}

	await EE.CredentialsService.share(credential!, sharee);

	return res.status(200).send();
});

// unshare a credential
EE.CredentialsController.delete('/:id/share', async (req: CredentialRequest.Share, res) => {
	const { id } = req.params;
	const { shareeId } = req.body;

	const { ownsCredential } = await EE.CredentialsService.isOwned(req.user, id);

	if (!ownsCredential) {
		return res.status(403).send('Forbidden');
	}

	if (!shareeId || typeof shareeId !== 'string') {
		return res.status(400).send('Bad Request');
	}

	await EE.CredentialsService.unshare(id, shareeId);

	return res.status(200).send();
});
