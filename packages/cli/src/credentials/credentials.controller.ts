import {
	CreateCredentialDto,
	CredentialsGetManyRequestQuery,
	CredentialsGetOneRequestQuery,
	GenerateCredentialNameRequestQuery,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import {
	SharedCredentials,
	ProjectRelationRepository,
	SharedCredentialsRepository,
	AuthenticatedRequest,
} from '@n8n/db';
import {
	Delete,
	Get,
	Licensed,
	Patch,
	Post,
	Put,
	RestController,
	ProjectScope,
	Body,
	Param,
	Query,
} from '@n8n/decorators';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import { deepCopy } from 'n8n-workflow';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { License } from '@/license';
import { listQueryMiddleware } from '@/middlewares';
import { CredentialRequest } from '@/requests';
import { NamingService } from '@/services/naming.service';
import { UserManagementMailer } from '@/user-management/email';
import * as utils from '@/utils';

import { CredentialsFinderService } from './credentials-finder.service';
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
		private readonly credentialsFinderService: CredentialsFinderService,
	) {}

	@Get('/', { middlewares: listQueryMiddleware })
	async getMany(
		req: CredentialRequest.GetMany,
		_res: unknown,
		@Query query: CredentialsGetManyRequestQuery,
	) {
		const credentials = await this.credentialsService.getMany(req.user, {
			listQueryOptions: req.listQueryOptions,
			includeScopes: query.includeScopes,
			includeData: query.includeData,
			onlySharedWithMe: query.onlySharedWithMe,
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
	async generateUniqueName(
		_req: unknown,
		_res: unknown,
		@Query query: GenerateCredentialNameRequestQuery,
	) {
		const requestedName = query.name ?? this.globalConfig.credentials.defaultName;

		return {
			name: await this.namingService.getUniqueCredentialName(requestedName),
		};
	}

	@Get('/:credentialId')
	@ProjectScope('credential:read')
	async getOne(
		req: CredentialRequest.Get,
		_res: unknown,
		@Param('credentialId') credentialId: string,
		@Query query: CredentialsGetOneRequestQuery,
	) {
		const { shared, ...credential } = this.license.isSharingEnabled()
			? await this.enterpriseCredentialsService.getOne(
					req.user,
					credentialId,
					// TODO: editor-ui is always sending this, maybe we can just rely on the
					// the scopes and always decrypt the data if the user has the permissions
					// to do so.
					query.includeData,
				)
			: await this.credentialsService.getOne(req.user, credentialId, query.includeData);

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

		const storedCredential = await this.credentialsFinderService.findCredentialForUser(
			credentials.id,
			req.user,
			['credential:read'],
		);

		if (!storedCredential) {
			throw new ForbiddenError();
		}

		const mergedCredentials = deepCopy(credentials);
		const decryptedData = this.credentialsService.decrypt(storedCredential, true);

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

		if (mergedCredentials.data) {
			mergedCredentials.data = this.credentialsService.unredact(
				mergedCredentials.data,
				decryptedData,
			);
		}

		return await this.credentialsService.test(req.user.id, mergedCredentials);
	}

	@Post('/')
	async createCredentials(
		req: AuthenticatedRequest,
		_: Response,
		@Body payload: CreateCredentialDto,
	) {
		const newCredential = await this.credentialsService.createUnmanagedCredential(
			payload,
			req.user,
		);

		const project = await this.sharedCredentialsRepository.findCredentialOwningProject(
			newCredential.id,
		);

		this.eventService.emit('credentials-created', {
			user: req.user,
			credentialType: newCredential.type,
			credentialId: newCredential.id,
			publicApi: false,
			projectId: project?.id,
			projectType: project?.type,
		});

		return newCredential;
	}

	@Patch('/:credentialId')
	@ProjectScope('credential:update')
	async updateCredentials(req: CredentialRequest.Update) {
		const {
			body,
			user,
			params: { credentialId },
		} = req;

		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:update'],
		);

		if (!credential) {
			this.logger.info('Attempt to update credential blocked due to lack of permissions', {
				credentialId,
				userId: user.id,
			});
			throw new NotFoundError(
				'Credential to be updated not found. You can only update credentials owned by you',
			);
		}

		if (credential.isManaged) {
			throw new BadRequestError('Managed credentials cannot be updated');
		}

		const decryptedData = this.credentialsService.decrypt(credential, true);
		// We never want to allow users to change the oauthTokenData
		delete body.data?.oauthTokenData;
		const preparedCredentialData = await this.credentialsService.prepareUpdateData(
			req.body,
			decryptedData,
		);
		const newCredentialData = this.credentialsService.createEncryptedData({
			id: credential.id,
			name: preparedCredentialData.name,
			type: preparedCredentialData.type,
			data: preparedCredentialData.data as unknown as ICredentialDataDecryptedObject,
		});

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

		const credential = await this.credentialsFinderService.findCredentialForUser(
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

		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			req.user,
			['credential:share'],
		);

		if (!credential) {
			throw new ForbiddenError();
		}

		let amountRemoved: number | null = null;
		let newShareeIds: string[] = [];

		const { manager: dbManager } = this.sharedCredentialsRepository;
		await dbManager.transaction(async (trx) => {
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
			await this.enterpriseCredentialsService.shareWithProjects(
				req.user,
				credential.id,
				toShare,
				trx,
			);

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
