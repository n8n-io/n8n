import { Container } from '@n8n/di';

import { CredentialTypes } from '@/credential-types';
import { CredentialsService } from '@/credentials/credentials.service';
import { CredentialsHelper } from '@/credentials-helper';
import { CredentialNotFoundError } from '@/errors/credential-not-found.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { toJsonSchema } from './credentials.utils';
import type { CredentialTypeRequest, CredentialRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { publicApiScope, projectScope } from '../../shared/middlewares/global.middleware';

type CredentialsHandlers = {
	testCredential: PublicAPIEndpoint<CredentialRequest.Test>;
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
