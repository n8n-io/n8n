/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { LicenseState, Logger } from '@n8n/backend-common';
import type { CredentialsEntity } from '@n8n/db';
import {
	CredentialsRepository,
	SharedCredentials,
	SharedCredentialsRepository,
	ProjectRelationRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { hasGlobalScope, PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import type express from 'express';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import { z } from 'zod';

import { CredentialTypes } from '@/credential-types';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { CredentialsHelper } from '@/credentials-helper';
import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { EventService } from '@/events/event.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { UserManagementMailer } from '@/user-management/email';
import * as utils from '@/utils';

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
	isLicensed,
	projectScope,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

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
	shareCredential: [
		isLicensed('feat:sharing'),
		apiKeyHasScope('credential:share'),
		projectScope('credential:share', 'credential'),
		async (req: CredentialRequest.Share, res: express.Response) => {
			const { id: credentialId } = req.params;

			const bodyResult = z.object({ shareWithIds: z.array(z.string()) }).safeParse(req.body);

			if (!bodyResult.success) {
				return res.status(400).json({ message: 'Bad request' });
			}

			const { shareWithIds } = bodyResult.data;

			const credentialsFinderService = Container.get(CredentialsFinderService);
			const credential = await credentialsFinderService.findCredentialForUser(
				credentialId,
				req.user,
				['credential:read'],
			);

			if (!credential) {
				return res.status(404).json({ message: 'Credential not found' });
			}

			const currentProjectIds = credential.shared
				.filter((sc) => sc.role === 'credential:user')
				.map((sc) => sc.projectId);
			const newProjectIds = shareWithIds;

			const toShare = utils.rightDiff([currentProjectIds, (id) => id], [newProjectIds, (id) => id]);
			const toUnshare = utils.rightDiff(
				[newProjectIds, (id) => id],
				[currentProjectIds, (id) => id],
			);

			if (toShare.length > 0) {
				const canShare = await userHasScopes(req.user, ['credential:share'], false, {
					credentialId,
				});
				if (!canShare) {
					return res.status(403).json({ message: 'Forbidden' });
				}
			}

			if (toUnshare.length > 0) {
				const canUnshare = await userHasScopes(req.user, ['credential:unshare'], false, {
					credentialId,
				});
				if (!canUnshare) {
					return res.status(403).json({ message: 'Forbidden' });
				}
			}

			const { manager: dbManager } = Container.get(SharedCredentialsRepository);
			const enterpriseCredentialsService = Container.get(EnterpriseCredentialsService);

			let amountRemoved: number | null = null;
			let newShareeIds: string[] = [];

			await dbManager.transaction(async (trx) => {
				if (toUnshare.length > 0) {
					const deleteResult = await trx.delete(SharedCredentials, {
						credentialsId: credentialId,
						projectId: In(toUnshare),
					});
					if (deleteResult.affected) {
						amountRemoved = deleteResult.affected;
					}
				}
				if (toShare.length > 0) {
					await enterpriseCredentialsService.shareWithProjects(
						req.user,
						credential.id,
						toShare,
						trx,
					);
				}

				newShareeIds = toShare;
			});

			Container.get(EventService).emit('credentials-shared', {
				user: req.user,
				credentialType: credential.type,
				credentialId: credential.id,
				userIdSharer: req.user.id,
				userIdsShareesAdded: newShareeIds,
				shareesRemoved: amountRemoved,
			});

			try {
				const projectsRelations = await Container.get(ProjectRelationRepository).findBy({
					projectId: In(newShareeIds),
					role: { slug: PROJECT_OWNER_ROLE_SLUG },
				});

				await Container.get(UserManagementMailer).notifyCredentialsShared({
					sharer: req.user,
					newShareeIds: projectsRelations.map((pr) => pr.userId),
					credentialsName: credential.name,
				});
			} catch (error) {
				Container.get(Logger).warn('Failed to send credential sharing notification email', {
					error,
				});
			}

			return res.status(204).send();
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
