import { Container } from '@n8n/di';
import { z } from 'zod';

import { CredentialTypes } from '@/credential-types';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { CredentialsHelper } from '@/credentials-helper';
import { CredentialNotFoundError } from '@/errors/credential-not-found.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { sanitizeCredentials, toJsonSchema } from './credentials.utils';
import type { CredentialTypeRequest, CredentialRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { publicApiScope, projectScope } from '../../shared/middlewares/global.middleware';

type CredentialsHandlers = {
	testCredential: PublicAPIEndpoint<CredentialRequest.Test>;
	transferCredential: PublicAPIEndpoint<CredentialRequest.Transfer>;
	deleteCredential: PublicAPIEndpoint<CredentialRequest.Delete>;
	getCredentialType: PublicAPIEndpoint<CredentialTypeRequest.Get>;
};

const credentialsHandlers: CredentialsHandlers = {
	testCredential: [
		publicApiScope('credential:read'),
		projectScope('credential:read', 'credential'),
		async (req, res) => {
			const { id: credentialId } = req.params;
			try {
				const credentialTestResult = await Container.get(CredentialsService).testById(
					req.user.id,
					credentialId,
				);
				return res.json(credentialTestResult);
			} catch (error) {
				if (error instanceof CredentialNotFoundError) {
					throw new NotFoundError(error.message);
				}

				throw error;
			}
		},
	],
	transferCredential: [
		publicApiScope('credential:move'),
		projectScope('credential:move', 'credential'),
		async (req, res) => {
			const body = z.object({ destinationProjectId: z.string() }).parse(req.body);

			await Container.get(EnterpriseCredentialsService).transferOne(
				req.user,
				req.params.id,
				body.destinationProjectId,
			);

			return res.status(204).send();
		},
	],
	deleteCredential: [
		publicApiScope('credential:delete'),
		projectScope('credential:delete', 'credential'),
		async (req, res) => {
			const { id: credentialId } = req.params;

			const credential = await Container.get(CredentialsFinderService).findCredentialForUser(
				credentialId,
				req.user,
				['credential:delete'],
			);

			if (!credential) {
				throw new NotFoundError('Not Found');
			}

			await Container.get(CredentialsService).delete(req.user, credentialId);
			return res.json(sanitizeCredentials(credential));
		},
	],

	getCredentialType: [
		async (req, res) => {
			const { credentialTypeName } = req.params;

			try {
				Container.get(CredentialTypes).getByName(credentialTypeName);
			} catch (error) {
				throw new NotFoundError('Not Found');
			}

			const schema = Container.get(CredentialsHelper)
				.getCredentialsProperties(credentialTypeName)
				.filter((property) => property.type !== 'hidden');

			return res.json(toJsonSchema(schema));
		},
	],
};

export = credentialsHandlers;
