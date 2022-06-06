import express = require('express');
import { CredentialsHelper } from '../../../../CredentialsHelper';
import { CredentialTypes } from '../../../../CredentialTypes';

import { CredentialsEntity } from '../../../../databases/entities/CredentialsEntity';
import { CredentialRequest } from '../../../../requests';
import { CredentialTypeRequest } from '../../../types';
import { authorize } from '../../shared/middlewares/global.middleware';
import { validCredentialsProperties, validCredentialType } from './credentials.middleware';

import {
	createCredential,
	encryptCredential,
	getCredentials,
	getSharedCredentials,
	removeCredential,
	sanitizeCredentials,
	saveCredential,
	toJsonSchema,
} from './credentials.service';

export = {
	createCredential: [
		authorize(['owner', 'member']),
		validCredentialType,
		validCredentialsProperties,
		async (
			req: CredentialRequest.Create,
			res: express.Response,
		): Promise<express.Response<Partial<CredentialsEntity>>> => {
			try {
				const newCredential = await createCredential(req.body as Partial<CredentialsEntity>);

				const encryptedData = await encryptCredential(newCredential);

				Object.assign(newCredential, encryptedData);

				const savedCredential = await saveCredential(newCredential, req.user, encryptedData);

				// LoggerProxy.verbose('New credential created', {
				// 	credentialId: newCredential.id,
				// 	ownerId: req.user.id,
				// });

				return res.json(sanitizeCredentials(savedCredential));
			} catch ({ message, httpStatusCode }) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				return res.status(httpStatusCode ?? 500).json({ message });
			}
		},
	],
	deleteCredential: [
		authorize(['owner', 'member']),
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

				if (shared?.role.name === 'owner') {
					credentials = shared.credentials;
				} else {
					// LoggerProxy.info('Attempt to delete credential blocked due to lack of permissions', {
					// 	credentialId,
					// 	userId: req.user.id,
					// });
				}
			} else {
				credentials = (await getCredentials(credentialId)) as CredentialsEntity;
			}

			if (!credentials) {
				return res.status(404).json({
					message: 'Not Found',
				});
			}

			await removeCredential(credentials);
			credentials.id = Number(credentialId);

			return res.json(sanitizeCredentials(credentials));
		},
	],

	getCredentialType: [
		authorize(['owner', 'member']),
		async (req: CredentialTypeRequest.Get, res: express.Response): Promise<express.Response> => {
			const { credentialTypeName } = req.params;

			try {
				CredentialTypes().getByName(credentialTypeName);
			} catch (error) {
				return res.status(404).json({
					message: 'Not Found',
				});
			}

			let schema = new CredentialsHelper('').getCredentialsProperties(credentialTypeName);

			schema = schema.filter((nodeProperty) => nodeProperty.type !== 'hidden');

			return res.json(toJsonSchema(schema));
		},
	],
};
