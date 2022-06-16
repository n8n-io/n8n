import express from 'express';

import * as config from '../../../config';
import { credentialsService } from '../../../src/credentials/credentials.controller';
import { CredentialRequest } from '../../../src/requests';

export const eeCredentialsController = express.Router();

// @ts-ignore
eeCredentialsController.use((req, res, next) => {
	if (config.getEnv('deployment.paid')) {
		// use ee router
		next();
		return;
	}
	// skip ee router and use free one
	next('router');
});

eeCredentialsController.get('/shared', (req, res) => {
	console.log('ENTERPRISE SHARING');
	return res.json({ enterprise: true });
});

eeCredentialsController.get('/:id', async (req: CredentialRequest.Get, res) => {
	const { id: credentialId } = req.params;

	console.log('ENTERPRISE ID FETCH');
	const shared = await credentialsService.getSharedCredentials(req.user.id, credentialId, [
		'credentials',
	]);
	console.log(shared);
	return res.json({ enterprise: true });
});
