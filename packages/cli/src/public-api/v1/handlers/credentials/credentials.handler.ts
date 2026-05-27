import { LicenseState } from '@n8n/backend-common';
import type { CredentialsEntity } from '@n8n/db';
import {
	CredentialsRepository,
	In,
	ProjectRelationRepository,
	SharedCredentials,
	SharedCredentialsRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { hasGlobalScope, PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
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
import { userHasScopes } from '@/permissions.ee/check-access';
import { UserManagementMailer } from '@/user-management/email';
import * as utils from '@/utils';

import { toPublicApiCredentialResponse } from './credentials.mapper';
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
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	publicApiScope,
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
	projectScope,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

type CredentialsHandlers = {
	getCredentials: PublicAPIEndpoint<CredentialRequest.GetAll>;
	getCredential: PublicAPIEndpoint<CredentialRequest.Get>;
	testCredential: PublicAPIEndpoint<CredentialRequest.Test>;
	createCredential: PublicAPIEndpoint<CredentialRequest.Create>;
	updateCredential: PublicAPIEndpoint<CredentialRequest.Update>;
	transferCredential: PublicAPIEndpoint<CredentialRequest.Transfer>;
	shareCredential: PublicAPIEndpoint<CredentialRequest.Share>;
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
		async (req, res) => {
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
			const savedCredential = await saveCredential(req.body, req.user);
			return res.json(savedCredential);
		},
	],
	updateCredential: [
		validCredentialTypeForUpdate,
		validCredentialsPropertiesForUpdate,
		publicApiScope('credential:update'),
		projectScope('credential:update', 'credential'),
		async (req, res) => {
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
	shareCredential: [
		isLicensed('feat:sharing'),
		projectScope('credential:read', 'credential'),
		async (req, res) => {
			const { id: credentialId } = req.params;
			const { shareWithIds } = z.object({ shareWithIds: z.array(z.string()) }).parse(req.body);

			const credential = await Container.get(CredentialsFinderService).findCredentialForUser(
				credentialId,
				req.user,
				['credential:read'],
			);
			if (!credential) {
				throw new NotFoundError('Credential not found');
			}

			const currentProjectIds = credential.shared
				.filter((sc) => sc.role === 'credential:user')
				.map((sc) => sc.projectId);

			const toShare = utils.rightDiff([currentProjectIds, (id) => id], [shareWithIds, (id) => id]);
			const toUnshare = utils.rightDiff(
				[shareWithIds, (id) => id],
				[currentProjectIds, (id) => id],
			);

			const apiKeyScopes = req.tokenGrant?.apiKeyScopes ?? [];

			if (toShare.length > 0) {
				if (!apiKeyScopes.includes('credential:share')) {
					throw new ForbiddenError();
				}
				const canShare = await userHasScopes(req.user, ['credential:share'], false, {
					credentialId,
				});
				if (!canShare) {
					throw new ForbiddenError();
				}
			}

			if (toUnshare.length > 0) {
				if (!apiKeyScopes.includes('credential:unshare')) {
					throw new ForbiddenError();
				}
				const canUnshare = await userHasScopes(req.user, ['credential:unshare'], false, {
					credentialId,
				});
				if (!canUnshare) {
					throw new ForbiddenError();
				}
			}

			const sharedCredentialsRepository = Container.get(SharedCredentialsRepository);
			let amountRemoved: number | null = null;
			await sharedCredentialsRepository.manager.transaction(async (trx) => {
				if (toUnshare.length > 0) {
					const deleteResult = await trx.delete(SharedCredentials, {
						credentialsId: credentialId,
						projectId: In(toUnshare),
					});
					if (deleteResult.affected) {
						amountRemoved = deleteResult.affected;
					}
				}
				await Container.get(EnterpriseCredentialsService).shareWithProjects(
					req.user,
					credential.id,
					toShare,
					trx,
				);
			});

			Container.get(EventService).emit('credentials-shared', {
				user: req.user,
				credentialType: credential.type,
				credentialId: credential.id,
				userIdSharer: req.user.id,
				userIdsShareesAdded: toShare,
				shareesRemoved: amountRemoved,
			});

			if (toShare.length > 0) {
				const projectsRelations = await Container.get(ProjectRelationRepository).findBy({
					projectId: In(toShare),
					role: { slug: PROJECT_OWNER_ROLE_SLUG },
				});
				await Container.get(UserManagementMailer).notifyCredentialsShared({
					sharer: req.user,
					newShareeIds: projectsRelations.map((pr) => pr.userId),
					credentialsName: credential.name,
				});
			}

			return res.status(204).send();
		},
	],
	deleteCredential: [
		publicApiScope('credential:delete'),
		projectScope('credential:delete', 'credential'),
		async (req, res) => {
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
