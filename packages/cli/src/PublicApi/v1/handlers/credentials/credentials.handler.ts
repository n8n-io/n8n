/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type express from 'express';

import { CredentialsHelper } from '@/CredentialsHelper';
import { CredentialTypes } from '@/CredentialTypes';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { CredentialRequest } from '@/requests';
import type { CredentialTypeRequest } from '../../../types';
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
				const newCredential = await createCredential(req.body);

				const encryptedData = await encryptCredential(newCredential);

				Object.assign(newCredential, encryptedData);

				const savedCredential = await saveCredential(newCredential, req.user, encryptedData);

				// LoggerProxy.verbose('New credential created', {
				// 	credentialsId: newCredential.id,
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
			let credential: CredentialsEntity | undefined;

			if (req.user.globalRole.name !== 'owner') {
				const shared = await getSharedCredentials(req.user.id, credentialId, [
					'credentials',
					'role',
				]);

				if (shared?.role.name === 'owner') {
					credential = shared.credentials;
				}
			} else {
				credential = (await getCredentials(credentialId)) as CredentialsEntity;
			}

			if (!credential) {
				return res.status(404).json({ message: 'Not Found' });
			}

			await removeCredential(credential);
			return res.json(sanitizeCredentials(credential));
		},
	],

	getCredentialType: [
		authorize(['owner', 'member']),
		async (req: CredentialTypeRequest.Get, res: express.Response): Promise<express.Response> => {
			const { credentialTypeName } = req.params;

			try {
				CredentialTypes().getByName(credentialTypeName);
			} catch (error) {
				return res.status(404).json({ message: 'Not Found' });
			}

			const schema = new CredentialsHelper('')
				.getCredentialsProperties(credentialTypeName)
				.filter((property) => property.type !== 'hidden');

			return res.json(toJsonSchema(schema));
		},
	],
};
