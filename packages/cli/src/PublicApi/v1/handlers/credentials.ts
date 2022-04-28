import express = require('express');

import { ResponseHelper } from '../../..';
import { CredentialsEntity } from '../../../databases/entities/CredentialsEntity';
import { CredentialRequest } from '../../../requests';

import { middlewares } from '../../middlewares';
import {
	getCredentials,
	getSharedCredentials,
	removeCredential,
	sanitizeCredentials,
} from '../../services/credentials';

export = {
	createCredential: [
		async (
			req: CredentialRequest.Create,
			res: express.Response,
		): Promise<express.Response<Partial<CredentialsEntity>>> => {},
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

			// await externalHooks.run('credentials.delete', [credentialId]);

			await removeCredential(credentials);

			return res.json(sanitizeCredentials(credentials));
		},
	],
};
