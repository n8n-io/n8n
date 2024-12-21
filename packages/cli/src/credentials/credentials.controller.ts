import { GlobalConfig } from '@n8n/config';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import { deepCopy } from 'n8n-workflow';
import { z } from 'zod';

import { SharedCredentials } from '@/databases/entities/shared-credentials';
import { ProjectRelationRepository } from '@/databases/repositories/project-relation.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import * as Db from '@/db';
import {
	Delete,
	Get,
	Licensed,
	Patch,
	Post,
	Put,
	RestController,
	ProjectScope,
} from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { License } from '@/license';
import { Logger } from '@/logging/logger.service';
import { listQueryMiddleware } from '@/middlewares';
import { CredentialRequest } from '@/requests';
import { NamingService } from '@/services/naming.service';
import { UserManagementMailer } from '@/user-management/email';
import * as utils from '@/utils';

import { CredentialsService } from './credentials.service';
import { EnterpriseCredentialsService } from './credentials.service.ee';

@RestController('/credentials')
export class CredentialsController {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly credentialsService: CredentialsService,
		private readonly enterpriseCredentialsService: EnterpriseCredentialsService,
		private readonly namingService: NamingService,
		private readonly license: License,
		private readonly logger: Logger,
		private readonly userManagementMailer: UserManagementMailer,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly eventService: EventService,
	) {}

	@Get('/', { middlewares: listQueryMiddleware })
	async getMany(req: CredentialRequest.GetMany) {
		const credentials = await this.credentialsService.getMany(req.user, {
			listQueryOptions: req.listQueryOptions,
			includeScopes: req.query.includeScopes,
		});
		credentials.forEach((c) => {
			// @ts-expect-error: This is to emulate the old behavior of removing the shared
			// field as part of `addOwnedByAndSharedWith`. We need this field in `addScopes`
			// though. So to avoid leaking the information we just delete it.
			delete c.shared;
		});
		return credentials;
	}

	@Get('/for-workflow')
	async getProjectCredentials(req: CredentialRequest.ForWorkflow) {
		const options = z
			.union([z.object({ workflowId: z.string() }), z.object({ projectId: z.string() })])
			.parse(req.query);
		return await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(req.user, options);
	}

	@Get('/new')
	async generateUniqueName(req: CredentialRequest.NewName) {
		const requestedName = req.query.name ?? this.globalConfig.credentials.defaultName;

		return {
			name: await this.namingService.getUniqueCredentialName(requestedName),
		};
	}

	@Get('/:credentialId')
	@ProjectScope('credential:read')
	async getOne(req: CredentialRequest.Get) {
		const { shared, ...credential } = this.license.isSharingEnabled()
			? await this.enterpriseCredentialsService.getOne(
					req.user,
					req.params.credentialId,
					// TODO: editor-ui is always sending this, maybe we can just rely on the
					// the scopes and always decrypt the data if the user has the permissions
					// to do so.
					req.query.includeData === 'true',
				)
			: await this.credentialsService.getOne(
					req.user,
					req.params.credentialId,
					req.query.includeData === 'true',
				);

		const scopes = await this.credentialsService.getCredentialScopes(
			req.user,
			req.params.credentialId,
		);

		return { ...credential, scopes };
	}

	// TODO: Write at least test cases for the failure paths.
	@Post('/test')
	async testCredentials(req: CredentialRequest.Test) {
		const { credentials } = req.body;

		const storedCredential = await this.sharedCredentialsRepository.findCredentialForUser(
			credentials.id,
			req.user,
			['credential:read'],
		);

		if (!storedCredential) {
			throw new ForbiddenError();
		}

		const mergedCredentials = deepCopy(credentials);
		const decryptedData = this.credentialsService.decrypt(storedCredential);

		// When a sharee (or project viewer) opens a credential, the fields and the
		// credential data are missing so the payload will be empty
		// We need to replace the credential contents with the db version if that's the case
		// So the credential can be tested properly
		await this.credentialsService.replaceCredentialContentsForSharee(
			req.user,
			storedCredential,
			decryptedData,
			mergedCredentials,
		);

		if (mergedCredentials.data && storedCredential) {
			mergedCredentials.data = this.credentialsService.unredact(
				mergedCredentials.data,
				decryptedData,
			);
		}

		return await this.credentialsService.test(req.user, mergedCredentials);
	}

	@Post('/')
	async createCredentials(req: CredentialRequest.Create) {
		const newCredential = await this.credentialsService.prepareCreateData(req.body);

		const encryptedData = this.credentialsService.createEncryptedData(null, newCredential);
		const { shared, ...credential } = await this.credentialsService.save(
			newCredential,
			encryptedData,
			req.user,
			req.body.projectId,
		);

		const project = await this.sharedCredentialsRepository.findCredentialOwningProject(
			credential.id,
		);

		this.eventService.emit('credentials-created', {
			user: req.user,
			credentialType: credential.type,
			credentialId: credential.id,
			publicApi: false,
			projectId: project?.id,
			projectType: project?.type,
		});

		const scopes = await this.credentialsService.getCredentialScopes(req.user, credential.id);

		return { ...credential, scopes };
	}

	@Patch('/:credentialId')
	@ProjectScope('credential:update')
	async updateCredentials(req: CredentialRequest.Update) {
		const { credentialId } = req.params;

		const credential = await this.sharedCredentialsRepository.findCredentialForUser(
			credentialId,
			req.user,
			['credential:update'],
		);

		if (!credential) {
			this.logger.info('Attempt to update credential blocked due to lack of permissions', {
				credentialId,
				userId: req.user.id,
			});
			throw new NotFoundError(
				'Credential to be updated not found. You can only update credentials owned by you',
			);
		}

		const decryptedData = this.credentialsService.decrypt(credential);
		const preparedCredentialData = await this.credentialsService.prepareUpdateData(
			req.body,
			decryptedData,
		);
		const newCredentialData = this.credentialsService.createEncryptedData(
			credentialId,
			preparedCredentialData,
		);

		const responseData = await this.credentialsService.update(credentialId, newCredentialData);

		if (responseData === null) {
			throw new NotFoundError(`Credential ID "${credentialId}" could not be found to be updated.`);
		}

		// Remove the encrypted data as it is not needed in the frontend
		const { data, shared, ...rest } = responseData;

		this.logger.debug('Credential updated', { credentialId });

		this.eventService.emit('credentials-updated', {
			user: req.user,
			credentialType: credential.type,
			credentialId: credential.id,
		});

		const scopes = await this.credentialsService.getCredentialScopes(req.user, credential.id);

		return { ...rest, scopes };
	}

	@Delete('/:credentialId')
	@ProjectScope('credential:delete')
	async deleteCredentials(req: CredentialRequest.Delete) {
		const { credentialId } = req.params;

		const credential = await this.sharedCredentialsRepository.findCredentialForUser(
			credentialId,
			req.user,
			['credential:delete'],
		);

		if (!credential) {
			this.logger.info('Attempt to delete credential blocked due to lack of permissions', {
				credentialId,
				userId: req.user.id,
			});
			throw new NotFoundError(
				'Credential to be deleted not found. You can only removed credentials owned by you',
			);
		}

		await this.credentialsService.delete(req.user, credential.id);

		this.eventService.emit('credentials-deleted', {
			user: req.user,
			credentialType: credential.type,
			credentialId: credential.id,
		});

		return true;
	}

	@Licensed('feat:sharing')
	@Put('/:credentialId/share')
	@ProjectScope('credential:share')
	async shareCredentials(req: CredentialRequest.Share) {
		const { credentialId } = req.params;
		const { shareWithIds } = req.body;

		if (
			!Array.isArray(shareWithIds) ||
			!shareWithIds.every((userId) => typeof userId === 'string')
		) {
			throw new BadRequestError('Bad request');
		}

		const credential = await this.sharedCredentialsRepository.findCredentialForUser(
			credentialId,
			req.user,
			['credential:share'],
		);

		if (!credential) {
			throw new ForbiddenError();
		}

		let amountRemoved: number | null = null;
		let newShareeIds: string[] = [];

		await Db.transaction(async (trx) => {
			const currentProjectIds = credential.shared
				.filter((sc) => sc.role === 'credential:user')
				.map((sc) => sc.projectId);
			const newProjectIds = shareWithIds;

			const toShare = utils.rightDiff([currentProjectIds, (id) => id], [newProjectIds, (id) => id]);
			const toUnshare = utils.rightDiff(
				[newProjectIds, (id) => id],
				[currentProjectIds, (id) => id],
			);

			const deleteResult = await trx.delete(SharedCredentials, {
				credentialsId: credentialId,
				projectId: In(toUnshare),
			});
			await this.enterpriseCredentialsService.shareWithProjects(req.user, credential, toShare, trx);

			if (deleteResult.affected) {
				amountRemoved = deleteResult.affected;
			}

			newShareeIds = toShare;
		});

		this.eventService.emit('credentials-shared', {
			user: req.user,
			credentialType: credential.type,
			credentialId: credential.id,
			userIdSharer: req.user.id,
			userIdsShareesAdded: newShareeIds,
			shareesRemoved: amountRemoved,
		});

		const projectsRelations = await this.projectRelationRepository.findBy({
			projectId: In(newShareeIds),
			role: 'project:personalOwner',
		});

		await this.userManagementMailer.notifyCredentialsShared({
			sharer: req.user,
			newShareeIds: projectsRelations.map((pr) => pr.userId),
			credentialsName: credential.name,
		});
	}

	@Put('/:credentialId/transfer')
	@ProjectScope('credential:move')
	async transfer(req: CredentialRequest.Transfer) {
		const body = z.object({ destinationProjectId: z.string() }).parse(req.body);

		return await this.enterpriseCredentialsService.transferOne(
			req.user,
			req.params.credentialId,
			body.destinationProjectId,
		);
	}
}
