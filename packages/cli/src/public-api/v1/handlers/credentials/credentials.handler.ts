/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { LicenseState } from '@n8n/backend-common';
import type { PublicApiCredentialResponse } from '@n8n/api-types';
import type { CredentialsEntity } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type express from 'express';
import { z } from 'zod';

import { CredentialTypes } from '@/credential-types';
import { CredentialsService } from '@/credentials/credentials.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { CredentialsHelper } from '@/credentials-helper';
import { CredentialNotFoundError } from '@/errors/credential-not-found.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

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
import { toPublicApiCredentialResponse } from './credentials.mapper';
import type { CredentialTypeRequest, CredentialRequest } from '../../../types';
import {
	publicApiScope,
	apiKeyHasScopeWithGlobalScopeFallback,
	projectScope,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

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
	getCredential: [
		publicApiScope('credential:read'),
		projectScope('credential:read', 'credential'),
		async (
			req: CredentialRequest.Get,
			res: express.Response,
		): Promise<express.Response<PublicApiCredentialResponse>> => {
			const { id: credentialId } = req.params;

			const credential = await getCredential(credentialId);
			if (!credential) {
				throw new NotFoundError('Credential not found');
			}

			return res.json(toPublicApiCredentialResponse(credential));
		},
	],
	testCredential: [
		publicApiScope('credential:read'),
		projectScope('credential:read', 'credential'),
		async (
			req: CredentialRequest.Test,
			res: express.Response<{ status: 'OK' | 'Error'; message: string } | { message: string }>,
		): Promise<
			express.Response<{ status: 'OK' | 'Error'; message: string } | { message: string }>
		> => {
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
	createCredential: [
		validCredentialType,
		validCredentialsProperties,
		publicApiScope('credential:create'),
		async (
			req: CredentialRequest.Create,
			res: express.Response,
		): Promise<express.Response<PublicApiCredentialResponse>> => {
			const savedCredential = await saveCredential(req.body, req.user);
			return res.json(savedCredential);
		},
	],
	updateCredential: [
		validCredentialTypeForUpdate,
		validCredentialsPropertiesForUpdate,
		publicApiScope('credential:update'),
		projectScope('credential:update', 'credential'),
		async (
			req: CredentialRequest.Update,
			res: express.Response,
		): Promise<express.Response<PublicApiCredentialResponse>> => {
			const { id: credentialId } = req.params;

			const existingCredential = await getCredential(credentialId);
			if (!existingCredential) {
				throw new NotFoundError('Credential not found');
			}

			if (req.body.isGlobal !== undefined && req.body.isGlobal !== existingCredential.isGlobal) {
				if (!Container.get(LicenseState).isSharingLicensed()) {
					throw new ForbiddenError('You are not licensed for sharing credentials');
				}

				const canShareGlobally = hasGlobalScope(req.user, 'credential:shareGlobally');
				if (!canShareGlobally) {
					throw new ForbiddenError(
						'You do not have permission to change global sharing for credentials',
					);
				}
			}

			try {
				const updatedCredential = await updateCredential(existingCredential, req.user, req.body);

				return res.json(toPublicApiCredentialResponse(updatedCredential));
			} catch (error) {
				if (error instanceof CredentialsIsNotUpdatableError) {
					throw new BadRequestError(error.message);
				}

				throw error;
			}
		},
	],
	transferCredential: [
		publicApiScope('credential:move'),
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
		publicApiScope('credential:delete'),
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
				credential = (await getCredential(credentialId)) ?? undefined;
			}

			if (!credential) {
				throw new NotFoundError('Not Found');
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
				throw new NotFoundError('Not Found');
			}

			const schema = Container.get(CredentialsHelper)
				.getCredentialsProperties(credentialTypeName)
				.filter((property) => property.type !== 'hidden');

			return res.json(toJsonSchema(schema));
		},
	],
};
