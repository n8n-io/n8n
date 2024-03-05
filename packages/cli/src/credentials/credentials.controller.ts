import config from '@/config';
import { CredentialsService } from './credentials.service';
import { CredentialRequest, ListQuery } from '@/requests';
import { InternalHooks } from '@/InternalHooks';
import { Logger } from '@/Logger';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NamingService } from '@/services/naming.service';
import { License } from '@/License';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { EnterpriseCredentialsService } from './credentials.service.ee';
import {
	Authorized,
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
import { UserManagementMailer } from '@/UserManagement/email';
import * as Db from '@/Db';
import * as utils from '@/utils';
import { listQueryMiddleware } from '@/middlewares';
import { SharedCredentialsRepository } from '@/databases/repositories/sharedCredentials.repository';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { In } from '@n8n/typeorm';
import Container from 'typedi';

@Authorized()
@RestController('/credentials')
export class CredentialsController {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly enterpriseCredentialsService: EnterpriseCredentialsService,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly namingService: NamingService,
		private readonly license: License,
		private readonly logger: Logger,
		private readonly internalHooks: InternalHooks,
		private readonly userManagementMailer: UserManagementMailer,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly projectRepository: ProjectRepository,
	) {}

	// DONE
	@Get('/', { middlewares: listQueryMiddleware })
	async getMany(req: ListQuery.Request) {
		return await this.credentialsService.getMany(req.user, {
			listQueryOptions: req.listQueryOptions,
		});
	}

	// DONE
	@Get('/new')
	async generateUniqueName(req: CredentialRequest.NewName) {
		const requestedName = req.query.name ?? config.getEnv('credentials.defaultName');

		return {
			name: await this.namingService.getUniqueCredentialName(requestedName),
		};
	}

	// DONE
	@Get('/:credentialId')
	@ProjectScope('credential:read')
	async getOne(req: CredentialRequest.Get) {
		if (this.license.isSharingEnabled()) {
			return await this.enterpriseCredentialsService.getOne(
				req.user,
				req.params.credentialId,
				// TODO: editor-ui is always sending this, maybe we can just rely on the
				// the scopes and always decrypt the data if the user has the permissions
				// to do so.
				req.query.includeData === 'true',
			);
		}

		// non-enterprise

		return await this.credentialsService.getOne(
			req.user,
			req.params.credentialId,
			// TODO: editor-ui is always sending this, maybe we can just rely on the
			// the scopes and always decrypt the data if the user has the permissions
			// to do so.
			req.query.includeData === 'true',
		);
	}

	// DONE
	@Post('/')
	async createCredentials(req: CredentialRequest.Create) {
		const newCredential = await this.credentialsService.prepareCreateData(req.body);

		const encryptedData = this.credentialsService.createEncryptedData(null, newCredential);
		const credential = await this.credentialsService.save(newCredential, encryptedData, req.user);

		void this.internalHooks.onUserCreatedCredentials({
			user: req.user,
			credential_name: newCredential.name,
			credential_type: credential.type,
			credential_id: credential.id,
			public_api: false,
		});

		return credential;
	}

	// DONE
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
		const { data: _, ...rest } = responseData;

		this.logger.verbose('Credential updated', { credentialId });

		return { ...rest };
	}

	// DONE
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

		await this.credentialsService.delete(credential);

		return true;
	}

	// TODO:
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
			debugger;
			const [ownerId] = credential.shared
				.filter((sc) => sc.role === 'credential:owner')
				.map((sc) => sc.projectId);
			const currentPersonalProjectIDs = credential.shared
				.filter((sc) => sc.role === 'credential:user')
				.map((sc) => sc.projectId);
			const newPersonalProjectIDs = (
				await this.projectRepository.getPersonalProjectForUsers(shareWithIds)
			)
				.map((pp) => pp.id)
				.filter((id) => id !== ownerId);

			const toShare = utils.rightDiff(
				[currentPersonalProjectIDs, (id) => id],
				[newPersonalProjectIDs, (id) => id],
			);
			const toUnshare = utils.rightDiff(
				[newPersonalProjectIDs, (id) => id],
				[currentPersonalProjectIDs, (id) => id],
			);

			console.log(await Container.get(SharedCredentialsRepository).findBy({}));
			const deleteResult = await this.sharedCredentialsRepository.delete({
				credentialsId: credentialId,
				projectId: In(toUnshare),
			});
			console.log(deleteResult);

			await this.enterpriseCredentialsService.shareWithProjects(credential, toShare, trx);

			// try {
			// 	const userIds = (
			// 		await this.projectRepository.find({
			// 			where: { id: In(toShare), projectRelations: { role: 'project:personalOwner' } },
			// 			relations: {
			// 				projectRelations: true,
			// 			},
			// 		})
			// 	)
			// 		.flatMap((p) => p.projectRelations)
			// 		.map((pr) => pr.userId);
			//
			// 	console.log({ toUnshare, toShare, userIds });
			//
			// 	await this.enterpriseCredentialsService.share(trx, credential, userIds);
			// } catch (error) {
			// 	console.error(error);
			// 	throw error;
			// }
			if (deleteResult.affected) {
				amountRemoved = deleteResult.affected;
			}

			newShareeIds = toShare;
		});

		void this.internalHooks.onUserSharedCredentials({
			user: req.user,
			credential_name: credential.name,
			credential_type: credential.type,
			credential_id: credential.id,
			user_id_sharer: req.user.id,
			user_ids_sharees_added: newShareeIds,
			sharees_removed: amountRemoved,
		});

		await this.userManagementMailer.notifyCredentialsShared({
			sharer: req.user,
			newShareeIds,
			credentialsName: credential.name,
		});
	}
}
