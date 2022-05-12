import express = require('express');

import { CredentialsEntity } from '../../../databases/entities/CredentialsEntity';
import { CredentialRequest } from '../../../requests';
import { externalHooks } from '../../../Server';
import { validCredentialsProperties } from '../../middlewares';

import {
	createCredential,
	encryptCredential,
	getCredentials,
	getSharedCredentials,
	removeCredential,
	sanitizeCredentials,
	saveCredential,
} from './credentials.service';

export = {
	createCredential: [
		validCredentialsProperties,
		async (
			req: CredentialRequest.Create,
			res: express.Response,
		): Promise<express.Response<Partial<CredentialsEntity>>> => {
			delete req.body.id; // delete if sent

			try {
				const newCredential = await createCredential(req.body as Partial<CredentialsEntity>);

				const encryptedData = await encryptCredential(newCredential);

				Object.assign(newCredential, encryptedData);

				await externalHooks.run('credentials.create', [encryptedData]);

				const savedCredential = await saveCredential(newCredential, req.user);

				// LoggerProxy.verbose('New credential created', {
				// 	credentialId: newCredential.id,
				// 	ownerId: req.user.id,
				// });

				return res.json(sanitizeCredentials(savedCredential));
			} catch ({ message, httpStatusCode }) {
				httpStatusCode ? res.status(httpStatusCode) : res.status(500);
				return res.json({ message });
			}
		},
	],
	deleteCredential: [
		async (
			req: CredentialRequest.Delete,
			res: express.Response,
		): Promise<express.Response<Partial<CredentialsEntity>>> => {
			const { id: credentialId } = req.params;
			let credentials: CredentialsEntity | undefined;

			if (req.user.globalRole.name !== 'owner') {
				const shared = await getSharedCredentials(req.user.id, credentialId, [
					'credentials',
					'role',
				]);

				if (shared && shared.role.name !== 'owner') {
					// LoggerProxy.info('Attempt to delete credential blocked due to lack of permissions', {
					// 	credentialId,
					// 	userId: req.user.id,
					// });
					return res.status(403).json({
						message: `Credential was not deleted because you are not the owner.`,
					});
				}
				credentials = shared?.credentials;
			} else {
				credentials = (await getCredentials(credentialId)) as CredentialsEntity;
			}

			if (!credentials) {
				return res.status(404).json({
					message: `Credential not found.`,
				});
			}

			await externalHooks.run('credentials.delete', [credentialId]);

			await removeCredential(credentials);
			credentials.id = Number(credentialId);

			return res.json(sanitizeCredentials(credentials));
		},
	],
};
