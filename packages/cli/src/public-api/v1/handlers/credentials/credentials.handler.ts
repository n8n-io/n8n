/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { CredentialsEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';
import { z } from 'zod';

import { CredentialTypes } from '@/credential-types';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { CredentialsHelper } from '@/credentials-helper';
import { CredentialsService } from '@/credentials/credentials.service';
import { LicenseState } from '@n8n/backend-common';
import { hasGlobalScope } from '@n8n/permissions';

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
import type { CredentialTypeRequest, CredentialRequest } from '../../../types';
import { apiKeyHasScope, projectScope } from '../../shared/middlewares/global.middleware';

export = {
	createCredential: [
		validCredentialType,
		validCredentialsProperties,
		apiKeyHasScope('credential:create'),
		async (
			req: CredentialRequest.Create,
			res: express.Response,
		): Promise<express.Response<Partial<CredentialsEntity>>> => {
			try {
				const newCredential = await createCredential(req.body);

				const encryptedData = await encryptCredential(newCredential);

				Object.assign(newCredential, encryptedData);

				const savedCredential = await saveCredential(newCredential, req.user, encryptedData);

				return res.json(sanitizeCredentials(savedCredential));
			} catch ({ message, httpStatusCode }) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				return res.status(httpStatusCode ?? 500).json({ message });
			}
		},
	],
	transferCredential: [
		apiKeyHasScope('credential:move'),
		projectScope('credential:move', 'credential'),
		async (req: CredentialRequest.Transfer, res: express.Response) => {
			const body = z.object({ destinationProjectId: z.string() }).parse(req.body);

			await Container.get(EnterpriseCredentialsService).transferOne(
				req.user,
				req.params.id,
				body.destinationProjectId,
			);

			res.status(204).send();
		},
	],
	deleteCredential: [
		apiKeyHasScope('credential:delete'),
		projectScope('credential:delete', 'credential'),
		async (
			req: CredentialRequest.Delete,
			res: express.Response,
		): Promise<express.Response<Partial<CredentialsEntity>>> => {
			const { id: credentialId } = req.params;
			let credential: CredentialsEntity | undefined;

			if (!['global:owner', 'global:admin'].includes(req.user.role.slug)) {
				const shared = await getSharedCredentials(req.user.id, credentialId);

				if (shared?.role === 'credential:owner') {
					credential = shared.credentials;
				}
			} else {
				credential = (await getCredentials(credentialId)) as CredentialsEntity;
			}

			if (!credential) {
				return res.status(404).json({ message: 'Not Found' });
			}

			await removeCredential(req.user, credential);
			return res.json(sanitizeCredentials(credential));
		},
	],
	updateCredential: [
		projectScope('credential:update', 'credential'),
		async (req: express.Request, res: express.Response): Promise<express.Response> => {
			const { id: credentialId } = req.params as { id: string };
			const body = req.body as any;

			let credential: CredentialsEntity | undefined;

			// Resolve credential with ownership rules
			// Non-global owner/admin must own the credential
			// Global owner/admin may fetch by ID directly
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (!['global:owner', 'global:admin'].includes((req as any).user.role.slug)) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				const shared = await getSharedCredentials((req as any).user.id, credentialId);
				if (shared?.role === 'credential:owner') {
					credential = shared.credentials as CredentialsEntity;
				}
			} else {
				credential = (await getCredentials(credentialId)) as CredentialsEntity;
			}

			if (!credential) {
				return res.status(404).json({ message: 'Not Found' });
			}

			if (credential.isManaged) {
				return res.status(400).json({ message: 'Managed credentials cannot be updated' });
			}

			// Never allow changing oauthTokenData via API
			if (body?.data?.oauthTokenData) {
				delete body.data.oauthTokenData;
			}

			const credentialsService = Container.get(CredentialsService);

			// Decrypt existing data to allow unredaction and merging
			const decryptedData = credentialsService.decrypt(credential, true);

			// Prepare merged update payload (handles unredaction)
			const prepared = await credentialsService.prepareUpdateData(body, decryptedData);

			// Create encrypted data for persistence
			const newCredentialData = credentialsService.createEncryptedData({
				id: credential.id,
				name: (prepared as any).name ?? credential.name,
				type: (prepared as any).type ?? credential.type,
				data: (prepared as any).data,
			});

			// Handle isGlobal toggle if provided
			const isGlobal = body?.isGlobal;
			if (isGlobal !== undefined && isGlobal !== credential.isGlobal) {
				const licenseState = Container.get(LicenseState);
				if (!licenseState.isSharingLicensed()) {
					return res.status(403).json({ message: 'You are not licensed for sharing credentials' });
				}
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				if (!hasGlobalScope((req as any).user, 'credential:shareGlobally')) {
					return res.status(403).json({
						message: 'You do not have permission to change global sharing for credentials',
					});
				}
				(newCredentialData as any).isGlobal = isGlobal;
			}

			// Preserve or update isResolvable
			(newCredentialData as any).isResolvable = body?.isResolvable ?? credential.isResolvable;

			const updated = await credentialsService.update(credentialId, newCredentialData);
			if (!updated) {
				return res.status(404).json({ message: 'Not Found' });
			}

			return res.json(sanitizeCredentials(updated));
		},
	],

	getCredentialType: [
		async (req: CredentialTypeRequest.Get, res: express.Response): Promise<express.Response> => {
			const { credentialTypeName } = req.params;

			try {
				Container.get(CredentialTypes).getByName(credentialTypeName);
			} catch (error) {
				return res.status(404).json({ message: 'Not Found' });
			}

			const schema = Container.get(CredentialsHelper)
				.getCredentialsProperties(credentialTypeName)
				.filter((property) => property.type !== 'hidden');

			return res.json(toJsonSchema(schema));
		},
	],
};
