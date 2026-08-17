import { LicenseState } from '@n8n/backend-common';
import type { CredentialsEntity, ICredentialsDb, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { z } from 'zod';

import { CredentialTypes } from '@/credential-types';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { CredentialsHelper } from '@/credentials-helper';
import { CredentialNotFoundError } from '@/errors/credential-not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';

import { toPublicApiCredentialResponse } from './credentials.mapper';
import {
	validCredentialsProperties,
	validCredentialType,
	validCredentialTypeForUpdate,
	validCredentialsPropertiesForUpdate,
} from './credentials.middleware';
import { buildSharedForCredential, sanitizeCredentials, toJsonSchema } from './credentials.utils';
import type { CredentialTypeRequest, CredentialRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	publicApiScope,
	apiKeyHasScopeWithGlobalScopeFallback,
	projectScope,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

async function buildUpdatePayload({
	credentialsService,
	user,
	existingCredential,
	body,
	clearOauthTokenData,
}: {
	credentialsService: CredentialsService;
	user: User;
	existingCredential: CredentialsEntity;
	body: {
		name?: string;
		type?: string;
		data?: ICredentialDataDecryptedObject;
		isGlobal?: boolean;
		isResolvable?: boolean;
		isPartialData?: boolean;
	};
	clearOauthTokenData: boolean;
}): Promise<{
	updatePayload: ICredentialsDb;
	decryptedDataForDeps?: ICredentialDataDecryptedObject;
}> {
	let updatePayload: ICredentialsDb;
	let decryptedDataForDeps: ICredentialDataDecryptedObject | undefined;

	if (body.data) {
		const preparedCredentialData = await credentialsService.prepareUpdateData(
			user,
			{
				name: body.name ?? existingCredential.name,
				type: body.type ?? existingCredential.type,
				data: body.data,
			},
			existingCredential,
			{
				dataMerge: body.isPartialData ? 'partial' : 'replace',
				clearOauthTokenData,
			},
		);

		decryptedDataForDeps = preparedCredentialData.data as unknown as ICredentialDataDecryptedObject;

		updatePayload = await credentialsService.createEncryptedData({
			id: existingCredential.id,
			name: preparedCredentialData.name,
			type: preparedCredentialData.type,
			data: decryptedDataForDeps,
		});
	} else {
		updatePayload = {
			id: existingCredential.id,
			name: body.name ?? existingCredential.name,
			type: body.type ?? existingCredential.type,
			data: existingCredential.data,
			createdAt: existingCredential.createdAt,
			updatedAt: existingCredential.updatedAt,
		};
	}

	if (body.isGlobal !== undefined) {
		updatePayload.isGlobal = body.isGlobal;
	}
	if (body.isResolvable !== undefined) {
		updatePayload.isResolvable = body.isResolvable;
	}
	updatePayload.updatedAt = new Date();

	return { updatePayload, decryptedDataForDeps };
}

type CredentialsHandlers = {
	getCredentials: PublicAPIEndpoint<CredentialRequest.GetAll>;
	getCredential: PublicAPIEndpoint<CredentialRequest.Get>;
	testCredential: PublicAPIEndpoint<CredentialRequest.Test>;
	createCredential: PublicAPIEndpoint<CredentialRequest.Create>;
	updateCredential: PublicAPIEndpoint<CredentialRequest.Update>;
	transferCredential: PublicAPIEndpoint<CredentialRequest.Transfer>;
	deleteCredential: PublicAPIEndpoint<CredentialRequest.Delete>;
	getCredentialType: PublicAPIEndpoint<CredentialTypeRequest.Get>;
};

const credentialsHandlers: CredentialsHandlers = {
	getCredentials: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'credential:list' }),
		validCursor,
		async (req, res) => {
			const offset = Number(req.query.offset) || 0;
			const limit = Math.min(Number(req.query.limit) || 100, 250);

			const { credentials, count } = await Container.get(CredentialsService).getManyAndCount(
				req.user,
				{
					listQueryOptions: {
						take: limit,
						skip: offset,
						sortBy: 'createdAt:desc',
					},
				},
			);

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
		async (req, res) => {
			const { id: credentialId } = req.params;

			const credential = await Container.get(CredentialsFinderService).findById(credentialId, {
				includeSharedProject: true,
			});
			if (!credential) {
				throw new NotFoundError('Credential not found');
			}

			return res.json(toPublicApiCredentialResponse(credential));
		},
	],
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
	createCredential: [
		validCredentialType,
		validCredentialsProperties,
		publicApiScope('credential:create'),
		async (req, res) => {
			const credentialsService = Container.get(CredentialsService);
			const { scopes: _scopes, ...credential } = await credentialsService.createUnmanagedCredential(
				{
					type: req.body.type,
					name: req.body.name,
					data: req.body.data,
					projectId: req.body.projectId,
					isResolvable: req.body.isResolvable,
					usageScope: 'project',
				},
				req.user,
			);

			const project = await credentialsService.findCredentialOwningProject(credential.id);

			Container.get(EventService).emit('credentials-created', {
				user: req.user,
				credentialType: credential.type,
				credentialId: credential.id,
				publicApi: true,
				projectId: project?.id,
				projectType: project?.type,
				isDynamic: credential.isResolvable ?? false,
				jweEnabled: req.body.data.jweEnabled === true,
			});

			return res.json(
				toPublicApiCredentialResponse({
					id: credential.id,
					name: credential.name,
					type: credential.type,
					isManaged: credential.isManaged,
					isGlobal: credential.isGlobal,
					isResolvable: credential.isResolvable,
					resolvableAllowFallback: credential.resolvableAllowFallback,
					resolverId: credential.resolverId,
					createdAt: credential.createdAt,
					updatedAt: credential.updatedAt,
				}),
			);
		},
	],
	updateCredential: [
		validCredentialTypeForUpdate,
		validCredentialsPropertiesForUpdate,
		publicApiScope('credential:update'),
		projectScope('credential:update', 'credential'),
		async (req, res) => {
			const { id: credentialId } = req.params;
			const credentialsService = Container.get(CredentialsService);

			const existingCredential = await Container.get(CredentialsFinderService).findById(
				credentialId,
				{ includeSharedProject: true },
			);
			if (!existingCredential) {
				throw new NotFoundError('Credential not found');
			}

			if (existingCredential.isManaged) {
				throw new BadRequestError('Managed credentials cannot be updated.');
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

			if (
				req.body.isResolvable !== undefined &&
				req.body.isResolvable !== Boolean(existingCredential.isResolvable)
			) {
				const ownerSharing = existingCredential.shared?.find(
					(sharing) => sharing.role === 'credential:owner',
				);
				if (req.body.isResolvable) {
					Container.get(CredentialsService).ensureEndUserCredentialAllowedInProject(
						ownerSharing?.project,
					);
				}
				await Container.get(CredentialsService).ensureCanManageEndUserCredential(
					req.user,
					ownerSharing?.projectId,
				);
			}

			const isChangingAuthType =
				req.body.type !== undefined && req.body.type !== existingCredential.type;
			const isTogglingToPrivate =
				Boolean(req.body.isResolvable) && !existingCredential.isResolvable;

			const { updatePayload, decryptedDataForDeps } = await buildUpdatePayload({
				credentialsService,
				user: req.user,
				existingCredential,
				body: req.body,
				clearOauthTokenData: isTogglingToPrivate || isChangingAuthType,
			});

			const updatedCredential = await credentialsService.update(
				credentialId,
				updatePayload,
				decryptedDataForDeps,
			);

			if (!updatedCredential) {
				throw new NotFoundError('Credential not found');
			}

			return res.json(toPublicApiCredentialResponse(updatedCredential));
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
