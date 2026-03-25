/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { LicenseState } from '@n8n/backend-common';
import type { CredentialsEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type express from 'express';
import { z } from 'zod';

import { CredentialTypes } from '@/credential-types';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { CredentialsHelper } from '@/credentials-helper';
import { ResponseError } from '@/errors/response-errors/abstract/response.error';

import {
	validCredentialsProperties,
	validCredentialType,
	validCredentialTypeForUpdate,
	validCredentialsPropertiesForUpdate,
} from './credentials.middleware';
import {
	buildSharedForCredential,
	CredentialsIsNotUpdatableError,
	getCredential,
	getSharedCredentials,
	removeCredential,
	sanitizeCredentials,
	saveCredential,
	toJsonSchema,
	updateCredential,
} from './credentials.service';
import type { CredentialTypeRequest, CredentialRequest } from '../../../types';
import {
	apiKeyHasScope,
	apiKeyHasScopeWithGlobalScopeFallback,
	projectScope,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';
import { CredentialsRepository } from '@n8n/db';

export = {
	getCredentials: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'credential:list' }),
		validCursor,
		async (
			req: CredentialRequest.GetAll,
			res: express.Response,
		): Promise<
			express.Response<{
				data: Array<{
					id: string;
					name: string;
					type: string;
					createdAt: Date;
					updatedAt: Date;
					shared: ReturnType<typeof buildSharedForCredential>;
				}>;
				nextCursor: string | null;
			}>
		> => {
			const offset = Number(req.query.offset) || 0;
			const limit = Math.min(Number(req.query.limit) || 100, 250);

			const repo = Container.get(CredentialsRepository);
			const [credentials, count] = await repo.findAndCount({
				take: limit,
				skip: offset,
				select: ['id', 'name', 'type', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project'],
				order: { createdAt: 'DESC' },
			});

			const data = credentials.map((credential: CredentialsEntity) => {
				const shared = buildSharedForCredential(credential);
				return {
					id: credential.id,
					name: credential.name,
					type: credential.type,
					createdAt: credential.createdAt,
					updatedAt: credential.updatedAt,
					shared,
				};
			});

			return res.json({
				data,
				nextCursor: encodeNextCursor({
					offset,
					limit,
					numberOfTotalRecords: count,
				}),
			});
		},
	],
	createCredential: [
		validCredentialType,
		validCredentialsProperties,
		apiKeyHasScope('credential:create'),
		async (
			req: CredentialRequest.Create,
			res: express.Response,
		): Promise<express.Response<Partial<CredentialsEntity>>> => {
			try {
				const savedCredential = await saveCredential(req.body, req.user);

				return res.json(sanitizeCredentials(savedCredential));
			} catch ({ message, httpStatusCode }) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				return res.status(httpStatusCode ?? 500).json({ message });
			}
		},
	],
	updateCredential: [
		validCredentialTypeForUpdate,
		validCredentialsPropertiesForUpdate,
		apiKeyHasScope('credential:update'),
		projectScope('credential:update', 'credential'),
		async (
			req: CredentialRequest.Update,
			res: express.Response,
		): Promise<express.Response<Partial<CredentialsEntity>>> => {
			const { id: credentialId } = req.params;

			if (req.body.isGlobal !== undefined) {
				if (!Container.get(LicenseState).isSharingLicensed()) {
					return res.status(403).json({ message: 'You are not licensed for sharing credentials' });
				}

				const canShareGlobally = hasGlobalScope(req.user, 'credential:shareGlobally');
				if (!canShareGlobally) {
					return res.status(403).json({
						message: 'You do not have permission to change global sharing for credentials',
					});
				}
			}

			try {
				const updatedCredential = await updateCredential(credentialId, req.user, req.body);

				if (!updatedCredential) {
					return res.status(404).json({ message: 'Credential not found' });
				}

				return res.json(sanitizeCredentials(updatedCredential as CredentialsEntity));
			} catch (error) {
				if (error instanceof CredentialsIsNotUpdatableError) {
					return res.status(400).json({ message: error.message });
				}

				if (error instanceof ResponseError) {
					return res.status(error.httpStatusCode).json({ message: error.message });
				}

				const message = error instanceof Error ? error.message : 'Unknown error';
				return res.status(500).json({ message });
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
				credential = (await getCredential(credentialId)) as CredentialsEntity;
			}

			if (!credential) {
				return res.status(404).json({ message: 'Not Found' });
			}

			await removeCredential(req.user, credential);
			return res.json(sanitizeCredentials(credential));
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
